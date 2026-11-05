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
  BdscriptValidationError,
  type RejectedAttempt,
  buildRepairPrompt,
  extractBdscriptFunctions,
  findArgTypeIssues,
  findArityIssues,
  findEarlyClosedCalls,
  formatArgTypeIssue,
  flattenBdscriptCalls,
  parseBdscript
} from './bdscript-validation.js';
import {
  escapeCodeBlocks,
  extractCodeBlocks,
  findAnswerProblems,
  formatCodeCheckResults,
  hasAnswerProblems
} from './code-check.js';
import { BDFD_BASICS } from './bdfd-basics.js';
import type { ChatTurn } from './types.js';
import { extractUrls, fetchExternalContent } from './external-content.js';
import { MAX_TOOL_ROUNDS, TOOL_SEARCH_TOP_K, WIKI_AGENT_TOOLS } from './rag-tools.js';
import {
  formatWikiChunks,
  loadWikiChunkRecords,
  mergeWikiChunks,
  searchWikiChunkRecords,
  searchWikiDocuments
} from './wiki-search.js';
import { WIKI_BASE_URL } from './wiki-ingest.js';
import { sectionUrl, WikiPageIndex, type WikiPageKind, type WikiSearchHit } from './wiki-page-index.js';

const WIKI_COLLECTION = 'bdfd-wiki';
const CHAT_MODEL = 'gpt-4o-mini';
const INITIAL_TOP_K = 6;
/** Related wiki pages linked under every answer. */
const MAX_CITED_PAGES = 8;
/** Don't hammer Chroma when the page index is empty (e.g. ingest hasn't run yet). */
const WIKI_INDEX_RETRY_MS = 60_000;

/** Shared by every mode: what the model receives, its tools, and the rules every answer must follow. */
const BASE_PROMPT = `You are an expert on BDFD (Bot Designer for Discord), **BDScript only**.
You do not support BDFD JavaScript (BDJS) — never suggest \`ban()\`, \`setResponse()\`, or other non-$ JavaScript-mode APIs.

You receive:
- **<relevant_functions>** — official BDFD API function definitions (prefer these for reply-code syntax).
- **<relevant_callbacks>** — official BDFD API callbacks when retrieved; these are **command triggers only**, never reply-code functions.
- **<wiki_context>** — wiki guides and examples.
- **<bdfd_basics>** — always-applied BDFD rules.
- **<user_code_analysis>** — when present, an automated check of $functions already in the user's message: argument counts, bracket escaping and argument types (an ID argument holding a comparison, text where a number belongs). It doesn't check logic — verify against relevant_functions, don't take it as the final word.

You also have tools:
- **search_wiki** — fetch more wiki excerpts when context is incomplete.
- **check_bdscript_functions** — verify $function / callback names exist and whether each is a function or callback.
- **check_bdscript_code** — check whole code blocks: unknown functions, argument counts and types, unescaped \`]\`, unclosed brackets, callbacks in reply code.

**Hard rule:** Only mention BDScript $functions that appear in relevant_functions, wiki_context, or bdfd_basics, or that check_bdscript_functions confirms exist as **functions**.
**Hard rule:** Callbacks from relevant_callbacks / check results are **triggers only**. When showing a callback command, label **Trigger** (callback) and **Reply code** (BDScript functions only). Never put callbacks inside reply-code fences.
**Hard rule:** Inside \`$function[...]\` args, escape literal \`;\` as \`\\;\` and literal \`]\` as \`\\]\`. Usage hints like \`[@user]\` / \`[amount]\` inside \`$argsCheck\` (or any message arg) must be \`[@user\\]\` / \`[amount\\]\`.
If a function is not found, do not use it. If docs are insufficient after searching, say so and link ${WIKI_BASE_URL}

Context chunks (<wiki_context>, <relevant_functions>, etc.) use plain triple-backtick fences for real BDScript when quoting the wiki. "[Discord UI preview omitted" lines in that context are not code — this is about reading retrieved context, separate from your own output format below.

**Output format:** answer in Discord markdown. Put every piece of BDScript in its own triple-backtick code block.
**Hard rule:** before your final answer, call **check_bdscript_code** with every code block you will include (several at once is fine). If it reports problems, fix the code and check again — only reply once it finds none. Show the code exactly as you checked it. Answers whose code fails these checks are rejected.

Your reply will be shown in a Discord embed (markdown supported).
Do not add a sources list — links to the wiki pages you were given are appended automatically.`;

/**
 * `assistant`: `/ai`, mentions and replies in AI channels — writing and debugging the user's commands.
 * `wiki`: `/search ai` — explaining what the wiki documents.
 */
export type RagMode = 'assistant' | 'wiki';

const MODE_PROMPTS: Record<RagMode, string> = {
  assistant: `**Mode: assistant (/ai, mentions and replies).** Help the user write and debug BDScript commands.
- When the user shares code, find the actual problem, explain it in a sentence or two, and show the corrected code.
- When they ask whether code will work or why it misbehaves, answer that question first. Walk through the code for each case they care about and say which branch runs — in an \`$if\`/\`$elseif\` chain the first matching condition wins, so a later branch never runs if an earlier condition also matches its case; put the more specific check first.
- check_bdscript_code only proves the syntax is valid, not that the logic is right. The user never sees your tool calls or their results: never give "it passed the check" as your answer or mention the tool — explain what was wrong in the code they sent.
- When they ask how to build something, give code they can paste, with a short note on how it works.
- Be concise and practical.
- If the user says their code is too large to paste, tell them to send a pastebin raw link or a .txt file URL in a reply to you or a message that mentions you.`,

  wiki: `**Mode: wiki guide (/search ai).** The user searched the BDFD wiki with a question. Act as a guide to the wiki, not a code debugger: explain what the wiki says, accurately and in plain language.

**Grounding**
- Base every claim on <wiki_context> and <relevant_functions>. Nothing outside them counts as documented — not memory, not other bot makers, not BDJS.
- If they don't answer the question, call search_wiki before giving up. Use wiki wording ("slash command options", "$textSplit") rather than the user's phrasing. Try at least two different queries.
- If the wiki still doesn't cover it, say so in one sentence and name the closest topic it does cover. Never fill gaps with guesses.

**Shape the answer to the question**
- *What does $function do / how do I use it:* one-line purpose, the syntax with each argument explained (from relevant_functions), one minimal example, then any gotcha the docs mention (limits, required permissions, escaping).
- *How do I do X / how does feature Y work:* a short explanation, then numbered steps if there is a process, then one minimal example if code helps.
- *Which function does X:* name the matching functions (confirmed with check_bdscript_functions) with a one-line purpose each, and say when to pick which.
- *Concept questions (variables, triggers, callbacks, limits):* explain the idea first, code only if it makes it clearer.

**Style**
- Lead with the direct answer in the first sentence. Aim for under 250 words.
- Examples demonstrate the documented feature — the smallest code that shows it, not a full command or bot.
- You may refer to a page by name ("see the Variables guide"); links are added for you.
- This is a single answer with no follow-up in the same thread, so make it self-contained and don't end with questions.
- If the user pasted their own code to fix, answer what the wiki says about the functions involved and suggest /ai for debugging the whole command.`
};

export interface RagQueryOptions {
  /** Which mode prompt goes on top of the base prompt (default `assistant`). */
  mode?: RagMode;
}

export interface RagAnswer {
  answer: string;
  /** Formatted "Related wiki pages" block to show after the answer; empty if no page could be linked. */
  sources: string;
}

/** Retrieved context plus the mode's full system prompt; the system message is rebuilt from it as chunks grow. */
interface RagContext {
  systemPrompt: string;
  wikiChunks: Set<string>;
  apiFunctionChunks: Set<string>;
  apiCallbackChunks: Set<string>;
}

export class RagService {
  private openai: OpenAI | null = null;
  private chroma: ChromaClient | null = null;
  private collection: Collection | null = null;
  private functionIndex: BdscriptFunctionIndex = new Map();
  private wikiIndex = new WikiPageIndex([]);
  private wikiIndexLoadedAt = 0;
  private ready = false;

  async init(): Promise<void> {
    // Loaded before the OpenAI/Chroma checks: `/check-code` only needs the index, not the AI.
    this.functionIndex = await ensureFunctionIndex();

    // Chroma is connected even without OpenAI: `/search wiki` title search only needs the chunks.
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
    } catch (err) {
      console.error('[bdfd-ai] Failed to connect to Chroma:', err);
      return;
    }

    await this.loadWikiIndex();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[bdfd-ai] OPENAI_API_KEY is not set; AI support is disabled.');
      return;
    }
    this.openai = new OpenAI({ apiKey });

    if (this.functionIndex.size === 0) {
      console.error('[bdfd-ai] No BDScript functions indexed; AI support disabled.');
      return;
    }

    this.ready = true;
    console.log(`[bdfd-ai] RAG service ready (${this.functionIndex.size} BDScript functions indexed)`);
  }

  private async loadWikiIndex(): Promise<void> {
    if (!this.collection) return;
    this.wikiIndexLoadedAt = Date.now();
    try {
      this.wikiIndex = new WikiPageIndex(await loadWikiChunkRecords(this.collection));
      console.log(`[bdfd-ai] Wiki search index ready (${this.wikiIndex.size} pages)`);
    } catch (err) {
      console.error('[bdfd-ai] Failed to load wiki pages for search:', err);
    }
  }

  /** Current wiki page index without reloading — for autocomplete, which must answer within 3s. */
  get wikiPageIndex(): WikiPageIndex {
    return this.wikiIndex;
  }

  /** Wiki page index for `/search wiki`; retried (throttled) while empty, e.g. before the first ingest. */
  async getWikiIndex(): Promise<WikiPageIndex> {
    if (this.wikiIndex.size === 0 && Date.now() - this.wikiIndexLoadedAt > WIKI_INDEX_RETRY_MS) {
      await this.loadWikiIndex();
    }
    return this.wikiIndex;
  }

  /** Embedding search for queries the title search can't match (e.g. "how do I make a leaderboard"). */
  async semanticWikiSearch(query: string, limit: number, kind?: WikiPageKind): Promise<WikiSearchHit[]> {
    if (!this.openai || !this.collection) return [];

    const records = await searchWikiChunkRecords(this.collection, this.openai, query, limit * 2);
    const hits: WikiSearchHit[] = [];
    const seen = new Set<string>();
    for (const record of records) {
      const located = this.wikiIndex.locate(record.document);
      if (!located || seen.has(located.page.file) || (kind && located.page.kind !== kind)) continue;
      seen.add(located.page.file);
      hits.push({ page: located.page, sectionIndex: located.sectionIndex, score: 0 });
    }
    return hits.slice(0, limit);
  }

  /** Markdown list of the wiki pages behind the retrieved chunks, in retrieval order. */
  private formatWikiSources(wikiChunks: Set<string>): string {
    const lines: string[] = [];
    const seen = new Set<string>();
    for (const chunk of wikiChunks) {
      const located = this.wikiIndex.locate(chunk);
      const url = located && sectionUrl(located.page, located.sectionIndex);
      if (!located || !url || seen.has(located.page.file)) continue;
      seen.add(located.page.file);
      const { page, sectionIndex } = located;
      const section = page.sections[sectionIndex];
      const label = section && section.heading !== 'Introduction' ? `${page.title} › ${section.heading}` : page.title;
      lines.push(`- [${label}](${url})`);
      if (lines.length === MAX_CITED_PAGES) break;
    }
    return lines.length ? `\n\n**Related wiki pages**\n${lines.join('\n')}` : '';
  }

  get isReady(): boolean {
    return this.ready;
  }

  /** Known BDScript functions/callbacks; may be empty if neither the cache nor the BDFD API was reachable. */
  get bdscriptFunctionIndex(): BdscriptFunctionIndex {
    return this.functionIndex;
  }

  private buildSystemContent({ systemPrompt, wikiChunks, apiFunctionChunks, apiCallbackChunks }: RagContext): string {
    const callbacksSection = apiCallbackChunks.size
      ? `\n\n<relevant_callbacks>\nCallbacks below are **command triggers only** — never put them in reply code.\n${formatWikiChunks(apiCallbackChunks)}\n</relevant_callbacks>`
      : '';

    return `${systemPrompt}\n\n<bdfd_basics>\n${BDFD_BASICS}\n</bdfd_basics>\n\n<relevant_functions>\n${formatWikiChunks(apiFunctionChunks)}\n</relevant_functions>${callbacksSection}\n\n<wiki_context>\n${formatWikiChunks(wikiChunks)}\n</wiki_context>`;
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

    if (name === 'check_bdscript_code') {
      const rawCodes = args.codes;
      if (!Array.isArray(rawCodes) || rawCodes.length === 0) {
        return 'Error: codes array is required';
      }

      const codes = rawCodes.filter((c): c is string => typeof c === 'string');
      return formatCodeCheckResults(codes, this.functionIndex);
    }

    return `Error: unknown tool ${name}`;
  }

  /** Repair rounds after the first answer; 3 checks total. */
  private static readonly MAX_VALIDATION_RETRIES = 2;
  /** Tool rounds a repair gets (enough to re-check the fixed code and answer). */
  private static readonly REPAIR_TOOL_ROUNDS = 3;

  /**
   * The model checks its own code with `check_bdscript_code` before answering; this backstop runs
   * the same checks on the code blocks of the final answer and sends anything it still finds back
   * for a fix. After the last retry it throws `BdscriptValidationError` instead of sending broken code.
   */
  private async completeWithTools(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    context: RagContext
  ): Promise<string> {
    let answer = await this.runToolLoop(messages, context, MAX_TOOL_ROUNDS);
    const attempts: RejectedAttempt[] = [];

    for (let attempt = 0; attempt <= RagService.MAX_VALIDATION_RETRIES; attempt++) {
      // Deterministically escape placeholder brackets (`[@user]` → `[@user\]`) *before* validating,
      // so the common early-`]` mistake is fixed here instead of costing a repair round trip.
      answer = escapeCodeBlocks(answer);
      const problems = findAnswerProblems(answer, this.functionIndex);

      if (!hasAnswerProblems(problems)) {
        if (!extractCodeBlocks(answer).length && /:\s*$/.test(answer)) {
          console.warn('[bdfd-ai] Response ends with ":" but has no code block — model likely omitted the code');
        }
        return answer;
      }

      const { invalidNames, misusedCallbacks, arityIssues, earlyClosed } = problems;
      attempts.push({ answer, problems });
      console.warn(
        `[bdfd-ai] Validation failed (attempt ${attempt + 1}/${RagService.MAX_VALIDATION_RETRIES + 1}): ` +
          `invalid=[${invalidNames.map((n) => `$${n}`).join(', ')}] ` +
          `misusedCallbacks=[${misusedCallbacks.map((n) => `$${n}`).join(', ')}] ` +
          `arityIssues=[${arityIssues.map((i) => `$${i.name}(${i.argCount})`).join(', ')}] ` +
          `earlyClosed=[${earlyClosed.map((n) => `$${n}`).join(', ')}]\n` +
          `Rejected answer:\n${answer}`
      );

      if (attempt === RagService.MAX_VALIDATION_RETRIES) {
        throw new BdscriptValidationError(invalidNames, misusedCallbacks, arityIssues, earlyClosed, attempts);
      }

      messages.push(
        { role: 'assistant', content: answer },
        {
          role: 'user',
          content:
            buildRepairPrompt(invalidNames, this.functionIndex, misusedCallbacks, arityIssues, earlyClosed) +
            '\n\nCheck the corrected code with check_bdscript_code before replying.'
        }
      );
      answer = await this.runToolLoop(messages, context, RagService.REPAIR_TOOL_ROUNDS);
    }

    // Unreachable — the loop always returns or throws on its last iteration.
    throw new BdscriptValidationError([], []);
  }

  /** Let the model call tools for up to `maxRounds`, then return its markdown answer. */
  private async runToolLoop(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    context: RagContext,
    maxRounds: number
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('RAG service not ready');
    }

    for (let round = 0; round < maxRounds; round++) {
      const completion = await this.openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        tools: WIKI_AGENT_TOOLS,
        tool_choice: 'auto',
        max_tokens: 1024,
        temperature: 0
      });

      const choice = completion.choices[0]?.message;
      if (!choice) {
        return 'I could not generate a response.';
      }

      if (!choice.tool_calls?.length) {
        return choice.content?.trim() || 'I could not generate a response.';
      }

      messages.push(choice);

      for (const call of choice.tool_calls) {
        // WIKI_AGENT_TOOLS only declares `type: 'function'` tools, so a 'custom' tool call
        // should never occur here — narrow for the type, and skip defensively if it ever does.
        if (call.type !== 'function') continue;

        const result = await this.runTool(call.function.name, call.function.arguments, context.wikiChunks);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result
        });
      }

      messages[0] = {
        role: 'system',
        content: this.buildSystemContent(context)
      };
    }

    const final = await this.openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        ...messages,
        {
          role: 'user',
          content:
            'Provide your final answer now. Use only $functions from relevant_functions or wiki_context for reply code, and only code you have checked. Callbacks from relevant_callbacks are triggers only — never put them in reply-code blocks. Invalid code will be rejected.'
        }
      ],
      max_tokens: 1024,
      temperature: 0
    });

    return final.choices[0]?.message?.content?.trim() || 'I could not generate a response.';
  }

  async query(userMessage: string, history: ChatTurn[], options: RagQueryOptions = {}): Promise<RagAnswer> {
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
    const userArgTypeIssues = findArgTypeIssues(userMessage, this.functionIndex);

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

    const context: RagContext = {
      systemPrompt: `${BASE_PROMPT}\n\n${MODE_PROMPTS[options.mode ?? 'assistant']}`,
      wikiChunks,
      apiFunctionChunks,
      apiCallbackChunks
    };
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildSystemContent(context) }
    ];

    if (externalContext) {
      messages.push({
        role: 'system',
        content: `<user_attached_content>\n${externalContext}\n</user_attached_content>`
      });
    }

    if (userArityIssues.length || userEarlyClosed.length || userArgTypeIssues.length) {
      messages.push({
        role: 'system',
        content:
          '<user_code_analysis>\n' +
          "Automated check of the $functions already used in the user's own message below — verify " +
          'against relevant_functions before relying on this, it only checks argument counts, types and bracket escaping:\n' +
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
            ),
            ...userArgTypeIssues.map((issue) => `- ${formatArgTypeIssue(issue)}`)
          ].join('\n') +
          '\n</user_code_analysis>'
      });
    }

    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }

    messages.push({ role: 'user', content: userMessage });

    const answer = await this.completeWithTools(messages, context);
    return { answer, sources: this.formatWikiSources(wikiChunks) };
  }
}
