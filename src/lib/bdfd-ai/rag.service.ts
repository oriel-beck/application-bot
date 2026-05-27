import OpenAI from 'openai';
import { ChromaClient, type Collection } from 'chromadb';
import type { ChatTurn } from './types.js';
import { extractUrls, fetchExternalContent, mentionsOversizedCode } from './external-content.js';

const WIKI_COLLECTION = 'bdfd-wiki';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';
const TOP_K = 5;

const SYSTEM_PROMPT = `You are an expert assistant for BDFD (Bot Designer for Discord).
You help users debug their BDFD code and answer questions about BDFD functions.
Answer using only the provided documentation. If the answer is not in the docs, say so clearly.
Format all code examples in markdown fenced code blocks using triple backticks.
Be concise and practical. Your reply will be shown in a Discord embed (markdown supported).
If the user says their code is too large to paste, tell them to send a pastebin raw link or a .txt file URL in a reply to you.`;

export class RagService {
    private openai: OpenAI | null = null;
    private chroma: ChromaClient | null = null;
    private collection: Collection | null = null;
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
            this.ready = true;
            console.log('[bdfd-ai] RAG service ready');
        } catch (err) {
            console.error('[bdfd-ai] Failed to connect to Chroma:', err);
        }
    }

    get isReady(): boolean {
        return this.ready;
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

        if (mentionsOversizedCode(userMessage) && !externalContext) {
            return '__PASTE_PROMPT__';
        }

        const embedding = await this.openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: userMessage,
        });

        const queryResult = await this.collection.query({
            queryEmbeddings: [embedding.data[0]!.embedding],
            nResults: TOP_K,
        });

        const wikiChunks = (queryResult.documents?.[0] ?? [])
            .filter((doc): doc is string => typeof doc === 'string' && doc.length > 0)
            .join('\n\n---\n\n');

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: `${SYSTEM_PROMPT}\n\n<wiki_context>\n${wikiChunks || '(no matching documentation)'}\n</wiki_context>`,
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

        const completion = await this.openai.chat.completions.create({
            model: CHAT_MODEL,
            messages,
            max_tokens: 1024,
            temperature: 0.2,
        });

        return completion.choices[0]?.message?.content?.trim() ?? 'I could not generate a response.';
    }
}
