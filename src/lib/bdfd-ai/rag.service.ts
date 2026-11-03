import OpenAI from 'openai';
import { type ChromaClient, type Collection } from 'chromadb';
import { API_FUNCTION_TOP_K, searchApiFunctionDocs, splitApiDocHits } from './api-function-search.js';
import { createChromaClient } from './chroma-client.js';
import {
  type BdscriptFunctionIndex,
  checkBdscriptFunctions,
  ensureFunctionIndex,
  fetchApiDocsForNames,
  formatFunctionCheckResults
} from './bdscript-function-index.js';
import {
  type ArityIssue,
  BdscriptValidationError,
  buildRepairPrompt,
  extractBdscriptFunctions,
  findArityIssues,
  findArityIssuesInSnippets,
  findCallbacksMisusedInSnippets,
  findEarlyClosedCalls,
  findEarlyClosedCallsInSnippets,
  findInvalidFunctions,
  flattenBdscriptCalls,
  parseBdscript,
  repairBdscriptCode
} from './bdscript-validation.js';
import { BDFD_BASICS } from './bdfd-basics.js';
import type { ChatTurn } from './types.js';
import { extractUrls, fetchExternalContent } from './external-content.js';
import { MAX_TOOL_ROUNDS, TOOL_SEARCH_TOP_K, WIKI_AGENT_TOOLS } from './rag-tools.js';
import { formatWikiChunks, mergeWikiChunks, searchWikiDocuments } from './wiki-search.js';

const WIKI_COLLECTION = 'bdfd-wiki';
const CHAT_MODEL = 'gpt-4o-mini';
const INITIAL_TOP_K = 6;

const SYSTEM_PROMPT = `You are an expert assistant for BDFD (Bot Designer for Discord), **BDScript only**.
You help users debug BDScript. You do not support BDFD JavaScript (BDJS) — never suggest \`ban()\`, \`setResponse()\`, or other non-$ JavaScript-mode APIs.

You receive:
- **<relevant_functions>** — official BDFD API function definitions (prefer these for reply-code syntax).
- **<relevant_callbacks>** — official BDFD API callbacks when retrieved; these are **command triggers only**, never reply-code functions.
- **<wiki_context>** — wiki guides and examples.
- **<bdfd_basics>** — always-applied BDFD rules.
- **<user_code_analysis>** — when present, an automated argument-count check of $functions already in the user's message. It only checks arg count, not correctness — verify against relevant_functions, don't take it as the final word.

You also have tools:
- **search_wiki** — fetch more wiki excerpts when context is incomplete.
- **check_bdscript_functions** — verify $function / callback names exist and whether each is a function or callback.

**Hard rule:** Only mention BDScript $functions that appear in relevant_functions, wiki_context, or bdfd_basics, or that check_bdscript_functions confirms exist as **functions**.
**Hard rule:** Callbacks from relevant_callbacks / check results are **triggers only**. When showing a callback command, label **Trigger** (callback) and **Reply code** (BDScript functions only). Never put callbacks inside reply-code fences.
**Hard rule:** Inside \`$function[...]\` args, escape literal \`;\` as \`\\;\` and literal \`]\` as \`\\]\`. Usage hints like \`[@user]\` / \`[amount]\` inside \`$argsCheck\` (or any message arg) must be \`[@user\\]\` / \`[amount\\]\`.
If a function is not found, do not use it. If docs are insufficient after searching, say so and link https://wiki.botdesignerdiscord.com/

Context chunks (<wiki_context>, <relevant_functions>, etc.) use plain triple-backtick fences for real BDScript when quoting the wiki. "[Discord UI preview omitted" lines in that context are not code — this is about reading retrieved context, separate from your own output format below.

**Output format:** your final answer (once done calling tools) must be a JSON object: \`{ "response": string, "snippets": string[] }\`.
- \`response\` is the prose shown to the user. Reference a BDScript code snippet with \`{0}\`, \`{1}\`, etc. — the index into \`snippets\` — never paste raw code or triple-backtick fences directly into \`response\`.
- \`snippets\` holds raw BDScript only, no markdown fences, no language tags — one entry per \`{n}\` referenced from \`response\`.
- A pure-prose answer with no code is fine: use an empty \`snippets\` array.

Be concise and practical. Your reply will be shown in a Discord embed (markdown supported).
If the user says their code is too large to paste, tell them to send a pastebin raw link or a .txt file URL in a reply to you or a message that mentions you.`;

/**
 * Structured output: the final answer is split into prose (`response`) and raw code
 * (`snippets`), referenced from `response` via `{n}` placeholders. Replaces scraping
 * markdown fences out of free-form text — the backend gets exact, unambiguous code strings
 * to validate/repair, and splices them back in as fences only once they pass.
 */
const RESPONSE_FORMAT: OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format'] = {
  type: 'json_schema',
  json_schema: {
    name: 'bdfd_ai_answer',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          description:
            'Prose shown to the user. Reference a snippet by its index into `snippets` using {0}, {1}, etc. Never paste raw code or triple-backtick fences directly here.'
        },
        snippets: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Raw BDScript code only, no markdown fences or language tags — one entry per {n} referenced from `response`.'
        }
      },
      required: ['response', 'snippets'],
      additionalProperties: false
    }
  }
};

interface StructuredDraft {
  response: string;
  snippets: string[];
}

/** Parse the model's structured JSON answer, falling back to treating raw text as pure prose. */
function parseStructuredCompletion(content: string | null | undefined): StructuredDraft {
  const fallback: StructuredDraft = { response: content?.trim() || 'I could not generate a response.', snippets: [] };
  if (!content) return fallback;

  try {
    const parsed = JSON.parse(content) as Partial<StructuredDraft>;
    if (typeof parsed.response !== 'string') return fallback;
    const snippets = Array.isArray(parsed.snippets)
      ? parsed.snippets.filter((s): s is string => typeof s === 'string')
      : [];
    return { response: parsed.response, snippets };
  } catch {
    return fallback;
  }
}

const SNIPPET_PLACEHOLDER = /\{(\d+)\}/g;

/** Splice validated snippets back into the prose, as fences, at their `{n}` placeholders. */
function spliceSnippetsIntoResponse(response: string, snippets: string[]): string {
  return response.replace(SNIPPET_PLACEHOLDER, (match, indexStr: string) => {
    const index = Number(indexStr);
    if (!Number.isInteger(index) || index < 0 || index >= snippets.length) {
      return match; // not a valid snippet reference — leave the literal text alone
    }
    return `\`\`\`\n${snippets[index]}\n\`\`\``;
  });
}

export class RagService {
  private openai: OpenAI | null = null;
  private chroma: ChromaClient | null = null;
  private collection: Collection | null = null;
  private functionIndex: BdscriptFunctionIndex = new Map();
  private ready = false;

  async init(): Promise<void> {
    // Loaded before the OpenAI/Chroma checks: `/check-code` only needs the index, not the AI.
    this.functionIndex = await ensureFunctionIndex();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[bdfd-ai] OPENAI_API_KEY is not set; AI support is disabled.');
      return;
    }

    this.openai = new OpenAI({ apiKey });
    const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
    this.chroma = createChromaClient(chromaUrl);

    try {
      this.collection = await this.chroma.getOrCreateCollection({
        name: WIKI_COLLECTION,
        // We always supply precomputed embeddings ourselves (search/upsert); explicit `null`
        // (not `undefined`) skips chromadb's attempt to lazily resolve a default embedding
        // function from the optional @chroma-core/default-embed package, which isn't installed.
        embeddingFunction: null
      });
      if (this.functionIndex.size === 0) {
        console.error('[bdfd-ai] No BDScript functions indexed; AI support disabled.');
        return;
      }

      this.ready = true;
      console.log(`[bdfd-ai] RAG service ready (${this.functionIndex.size} BDScript functions indexed)`);
    } catch (err) {
      console.error('[bdfd-ai] Failed to connect to Chroma:', err);
    }
  }

  get isReady(): boolean {
    return this.ready;
  }

  /** Known BDScript functions/callbacks; may be empty if neither the cache nor the BDFD API was reachable. */
  get bdscriptFunctionIndex(): BdscriptFunctionIndex {
    return this.functionIndex;
  }

  private buildSystemContent(
    wikiChunks: Set<string>,
    apiFunctionChunks: Set<string>,
    apiCallbackChunks: Set<string>
  ): string {
    const callbacksSection = apiCallbackChunks.size
      ? `\n\n<relevant_callbacks>\nCallbacks below are **command triggers only** — never put them in reply code.\n${formatWikiChunks(apiCallbackChunks)}\n</relevant_callbacks>`
      : '';

    return `${SYSTEM_PROMPT}\n\n<bdfd_basics>\n${BDFD_BASICS}\n</bdfd_basics>\n\n<relevant_functions>\n${formatWikiChunks(apiFunctionChunks)}\n</relevant_functions>${callbacksSection}\n\n<wiki_context>\n${formatWikiChunks(wikiChunks)}\n</wiki_context>`;
  }

  private async runTool(name: string, argsJson: string, wikiChunks: Set<string>): Promise<string> {
    if (!this.openai || !this.collection) {
      return 'Error: RAG service not ready';
    }

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsJson) as Record<string, unknown>;
    } catch {
      return 'Error: invalid tool arguments JSON';
    }

    if (name === 'search_wiki') {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (!query) return 'Error: query is required';

      const found = await searchWikiDocuments(this.collection, this.openai, query, TOOL_SEARCH_TOP_K);
      mergeWikiChunks(wikiChunks, found);

      if (!found.length) {
        return 'No additional wiki excerpts matched that query.';
      }

      return `Found ${found.length} excerpt(s):\n\n${found.join('\n\n---\n\n')}`;
    }

    if (name === 'check_bdscript_functions') {
      const rawNames = args.names;
      if (!Array.isArray(rawNames) || rawNames.length === 0) {
        return 'Error: names array is required';
      }

      const names = rawNames.filter((n): n is string => typeof n === 'string');
      const results = await checkBdscriptFunctions(names, this.functionIndex, this.collection);
      return formatFunctionCheckResults(results);
    }

    return `Error: unknown tool ${name}`;
  }

  private async repairResponse(
    draft: StructuredDraft,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    invalidNames: string[],
    misusedCallbacks: string[],
    arityIssues: ArityIssue[],
    earlyClosed: string[]
  ): Promise<StructuredDraft> {
    if (!this.openai) {
      throw new Error('RAG service not ready');
    }

    const repairPrompt =
      buildRepairPrompt(invalidNames, this.functionIndex, misusedCallbacks, arityIssues, earlyClosed) +
      '\n\nReturn the corrected answer in the same JSON format: { "response": string, "snippets": string[] }.';

    const repair = await this.openai.chat.completions.create({
      model: CHAT_MODEL,
      response_format: RESPONSE_FORMAT,
      messages: [
        ...messages,
        { role: 'assistant', content: JSON.stringify(draft) },
        { role: 'user', content: repairPrompt }
      ],
      max_tokens: 1024,
      temperature: 0
    });

    return parseStructuredCompletion(repair.choices[0]?.message?.content);
  }

  /** Repair attempts after the initial draft; 3 validation checks total. */
  private static readonly MAX_VALIDATION_RETRIES = 2;

  private async validateAndRepair(
    response: StructuredDraft,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ): Promise<string> {
    let draft = response;

    for (let attempt = 0; attempt <= RagService.MAX_VALIDATION_RETRIES; attempt++) {
      // Deterministically escape placeholder brackets (`[@user]` → `[@user\]`) *before* validating,
      // so the common early-`]` mistake is fixed here instead of costing a repair round trip.
      draft = { ...draft, snippets: draft.snippets.map(repairBdscriptCode) };

      // Hallucinated names can appear in the prose too (e.g. "you could also try `$fooBar`"),
      // not just inside a snippet, so check `response` in addition to each snippet.
      const invalid = [
        ...new Set([
          ...findInvalidFunctions(draft.response, this.functionIndex),
          ...draft.snippets.flatMap((s) => findInvalidFunctions(s, this.functionIndex))
        ])
      ];
      const misusedCallbacks = findCallbacksMisusedInSnippets(draft.snippets, this.functionIndex);
      const arityIssues = findArityIssuesInSnippets(draft.snippets, this.functionIndex);
      const earlyClosed = findEarlyClosedCallsInSnippets(draft.snippets);

      if (!invalid.length && !misusedCallbacks.length && !arityIssues.length && !earlyClosed.length) {
        return spliceSnippetsIntoResponse(draft.response, draft.snippets);
      }

      console.warn(
        `[bdfd-ai] Validation failed (attempt ${attempt + 1}/${RagService.MAX_VALIDATION_RETRIES + 1}): ` +
          `invalid=[${invalid.map((n) => `$${n}`).join(', ')}] ` +
          `misusedCallbacks=[${misusedCallbacks.map((n) => `$${n}`).join(', ')}] ` +
          `arityIssues=[${arityIssues.map((i) => `$${i.name}(${i.argCount})`).join(', ')}] ` +
          `earlyClosed=[${earlyClosed.map((n) => `$${n}`).join(', ')}]`
      );

      if (attempt === RagService.MAX_VALIDATION_RETRIES) {
        throw new BdscriptValidationError(invalid, misusedCallbacks, arityIssues, earlyClosed);
      }

      draft = await this.repairResponse(draft, messages, invalid, misusedCallbacks, arityIssues, earlyClosed);
    }

    // Unreachable — loop always returns or throws on its last iteration.
    throw new BdscriptValidationError([], []);
  }

  private async completeWithTools(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    wikiChunks: Set<string>,
    apiFunctionChunks: Set<string>,
    apiCallbackChunks: Set<string>
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('RAG service not ready');
    }

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await this.openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        tools: WIKI_AGENT_TOOLS,
        tool_choice: 'auto',
        response_format: RESPONSE_FORMAT,
        max_tokens: 1024,
        temperature: 0
      });

      const choice = completion.choices[0]?.message;
      if (!choice) {
        return 'I could not generate a response.';
      }

      if (!choice.tool_calls?.length) {
        return this.validateAndRepair(parseStructuredCompletion(choice.content), messages);
      }

      messages.push(choice);

      for (const call of choice.tool_calls) {
        // WIKI_AGENT_TOOLS only declares `type: 'function'` tools, so a 'custom' tool call
        // should never occur here — narrow for the type, and skip defensively if it ever does.
        if (call.type !== 'function') continue;

        const result = await this.runTool(call.function.name, call.function.arguments, wikiChunks);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result
        });
      }

      messages[0] = {
        role: 'system',
        content: this.buildSystemContent(wikiChunks, apiFunctionChunks, apiCallbackChunks)
      };
    }

    const final = await this.openai.chat.completions.create({
      model: CHAT_MODEL,
      response_format: RESPONSE_FORMAT,
      messages: [
        ...messages,
        {
          role: 'user',
          content:
            'Provide your final answer now. Use only $functions from relevant_functions or wiki_context for reply code. Callbacks from relevant_callbacks are triggers only — never put them in reply-code fences. Invalid names will be rejected.'
        }
      ],
      max_tokens: 1024,
      temperature: 0
    });

    return this.validateAndRepair(parseStructuredCompletion(final.choices[0]?.message?.content), messages);
  }

  async query(userMessage: string, history: ChatTurn[]): Promise<string> {
    if (!this.ready || !this.openai || !this.collection) {
      throw new Error('RAG service not ready');
    }

    const urls = extractUrls(userMessage);
    let externalContext: string | undefined;
    if (urls.length) {
      externalContext = await fetchExternalContent(urls);
    }

    const usedNames = extractBdscriptFunctions(userMessage);
    const userCalls = flattenBdscriptCalls(parseBdscript(userMessage));
    const userArityIssues = findArityIssues(userCalls, this.functionIndex);
    const userEarlyClosed = findEarlyClosedCalls(userCalls);

    const [wikiResults, apiHits, namedDocs] = await Promise.all([
      searchWikiDocuments(this.collection, this.openai, userMessage, INITIAL_TOP_K),
      searchApiFunctionDocs(this.collection, this.openai, userMessage, API_FUNCTION_TOP_K),
      fetchApiDocsForNames(usedNames, this.functionIndex, this.collection)
    ]);

    const wikiChunks = new Set(wikiResults);
    const { functions: apiFunctionChunks, callbacks: apiCallbackChunks } = splitApiDocHits(apiHits);
    // Deterministic injection: guarantee every $function/callback already in the user's own
    // message is backed by its real doc, regardless of how it ranks in semantic top-k.
    for (const doc of namedDocs.functions) apiFunctionChunks.add(doc);
    for (const doc of namedDocs.callbacks) apiCallbackChunks.add(doc);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.buildSystemContent(wikiChunks, apiFunctionChunks, apiCallbackChunks)
      }
    ];

    if (externalContext) {
      messages.push({
        role: 'system',
        content: `<user_attached_content>\n${externalContext}\n</user_attached_content>`
      });
    }

    if (userArityIssues.length || userEarlyClosed.length) {
      messages.push({
        role: 'system',
        content:
          '<user_code_analysis>\n' +
          "Automated check of the $functions already used in the user's own message below — verify " +
          'against relevant_functions before relying on this, it only checks argument count and bracket escaping:\n' +
          [
            ...userArityIssues.map(
              (issue) =>
                `- $${issue.name} called with ${issue.argCount} argument(s); expected ${issue.expected.join(' or ')} ` +
                '(a literal `;` in an argument must be escaped as `\\;`)'
            ),
            ...userEarlyClosed.map(
              (name) =>
                `- $${name}[...] is closed early by an unescaped \`]\` in literal text like \`[@user]\` — ` +
                'every literal `]` inside an argument must be escaped as `\\]`'
            )
          ].join('\n') +
          '\n</user_code_analysis>'
      });
    }

    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }

    messages.push({ role: 'user', content: userMessage });

    return this.completeWithTools(messages, wikiChunks, apiFunctionChunks, apiCallbackChunks);
  }
}
