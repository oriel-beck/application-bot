import OpenAI from 'openai';
import { ChromaClient, type Collection } from 'chromadb';
import { API_FUNCTION_TOP_K, searchApiFunctionDocs } from './api-function-search.js';
import {
    type BdscriptFunctionIndex,
    checkBdscriptFunctions,
    ensureFunctionIndex,
    formatFunctionCheckResults,
} from './bdscript-function-index.js';
import { buildRepairPrompt, findInvalidFunctions } from './bdscript-validation.js';
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
- **<relevant_functions>** — official BDFD API definitions retrieved for this question (prefer these for syntax).
- **<wiki_context>** — wiki guides and examples.
- **<bdfd_basics>** — always-applied BDFD rules.

You also have tools:
- **search_wiki** — fetch more wiki excerpts when context is incomplete.
- **check_bdscript_functions** — verify $function names exist.

**Hard rule:** Only mention BDScript $functions that appear in relevant_functions, wiki_context, or bdfd_basics, or that check_bdscript_functions confirms exist.
If a function is not found, do not use it. If docs are insufficient after searching, say so and link https://wiki.botdesignerdiscord.com/

Wiki excerpts use plain triple-backtick fences for real BDScript. "[Discord UI preview omitted" lines are not code.

Be concise and practical. Your reply will be shown in a Discord embed (markdown supported).
If the user says their code is too large to paste, tell them to send a pastebin raw link or a .txt file URL in a reply to you.`;

export class RagService {
    private openai: OpenAI | null = null;
    private chroma: ChromaClient | null = null;
    private collection: Collection | null = null;
    private functionIndex: BdscriptFunctionIndex = new Map();
    private ready = false;

    async init(): Promise<void> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.warn('[bdfd-ai] OPENAI_API_KEY is not set; AI support is disabled.');
            return;
        }

        this.openai = new OpenAI({ apiKey });
        const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
        this.chroma = new ChromaClient({ path: chromaUrl });

        try {
            this.collection = await this.chroma.getOrCreateCollection({
                name: WIKI_COLLECTION,
            });
            this.functionIndex = await ensureFunctionIndex();
            if (this.functionIndex.size === 0) {
                console.error('[bdfd-ai] No BDScript functions indexed; AI support disabled.');
                return;
            }

            this.ready = true;
            console.log(
                `[bdfd-ai] RAG service ready (${this.functionIndex.size} BDScript functions indexed)`
            );
        } catch (err) {
            console.error('[bdfd-ai] Failed to connect to Chroma:', err);
        }
    }

    get isReady(): boolean {
        return this.ready;
    }

    private buildSystemContent(wikiChunks: Set<string>, apiFunctionChunks: Set<string>): string {
        return `${SYSTEM_PROMPT}\n\n<bdfd_basics>\n${BDFD_BASICS}\n</bdfd_basics>\n\n<relevant_functions>\n${formatWikiChunks(apiFunctionChunks)}\n</relevant_functions>\n\n<wiki_context>\n${formatWikiChunks(wikiChunks)}\n</wiki_context>`;
    }

    private async runTool(
        name: string,
        argsJson: string,
        wikiChunks: Set<string>
    ): Promise<string> {
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

            const found = await searchWikiDocuments(
                this.collection,
                this.openai,
                query,
                TOOL_SEARCH_TOP_K
            );
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
            const results = await checkBdscriptFunctions(
                names,
                this.functionIndex,
                this.collection
            );
            return formatFunctionCheckResults(results);
        }

        return `Error: unknown tool ${name}`;
    }

    private async repairResponse(
        draft: string,
        messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        invalidNames: string[]
    ): Promise<string> {
        if (!this.openai) {
            throw new Error('RAG service not ready');
        }

        const repair = await this.openai.chat.completions.create({
            model: CHAT_MODEL,
            messages: [
                ...messages,
                { role: 'assistant', content: draft },
                { role: 'user', content: buildRepairPrompt(invalidNames, this.functionIndex) },
            ],
            max_tokens: 1024,
            temperature: 0,
        });

        return repair.choices[0]?.message?.content?.trim() ?? draft;
    }

    private async validateAndRepair(
        response: string,
        messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    ): Promise<string> {
        const invalid = findInvalidFunctions(response, this.functionIndex);
        if (!invalid.length) {
            return response;
        }

        console.warn(`[bdfd-ai] Invalid functions in draft: ${invalid.map((n) => `$${n}`).join(', ')}`);
        return this.repairResponse(response, messages, invalid);
    }

    private async completeWithTools(
        messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        wikiChunks: Set<string>,
        apiFunctionChunks: Set<string>
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
                max_tokens: 1024,
                temperature: 0,
            });

            const choice = completion.choices[0]?.message;
            if (!choice) {
                return 'I could not generate a response.';
            }

            if (!choice.tool_calls?.length) {
                const draft = choice.content?.trim() ?? 'I could not generate a response.';
                return this.validateAndRepair(draft, messages);
            }

            messages.push(choice);

            for (const call of choice.tool_calls) {
                const result = await this.runTool(call.function.name, call.function.arguments, wikiChunks);
                messages.push({
                    role: 'tool',
                    tool_call_id: call.id,
                    content: result,
                });
            }

            messages[0] = {
                role: 'system',
                content: this.buildSystemContent(wikiChunks, apiFunctionChunks),
            };
        }

        const final = await this.openai.chat.completions.create({
            model: CHAT_MODEL,
            messages: [
                ...messages,
                {
                    role: 'user',
                    content:
                        'Provide your final answer now. Use only $functions from relevant_functions or wiki_context. Invalid names will be rejected.',
                },
            ],
            max_tokens: 1024,
            temperature: 0,
        });

        const draft = final.choices[0]?.message?.content?.trim() ?? 'I could not generate a response.';
        return this.validateAndRepair(draft, messages);
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

        const [wikiResults, apiResults] = await Promise.all([
            searchWikiDocuments(this.collection, this.openai, userMessage, INITIAL_TOP_K),
            searchApiFunctionDocs(this.collection, this.openai, userMessage, API_FUNCTION_TOP_K),
        ]);

        const wikiChunks = new Set(wikiResults);
        const apiFunctionChunks = new Set(apiResults);

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: this.buildSystemContent(wikiChunks, apiFunctionChunks),
            },
        ];

        if (externalContext) {
            messages.push({
                role: 'system',
                content: `<user_attached_content>\n${externalContext}\n</user_attached_content>`,
            });
        }

        for (const turn of history) {
            messages.push({ role: turn.role, content: turn.content });
        }

        messages.push({ role: 'user', content: userMessage });

        return this.completeWithTools(messages, wikiChunks, apiFunctionChunks);
    }
}
