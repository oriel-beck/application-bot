import type { Collection } from 'chromadb';
import type OpenAI from 'openai';

export const WIKI_EMBEDDING_MODEL = 'text-embedding-3-small';

export async function embedText(openai: OpenAI, text: string): Promise<number[]> {
    const res = await openai.embeddings.create({
        model: WIKI_EMBEDDING_MODEL,
        input: text,
    });
    return res.data[0]!.embedding;
}

export async function searchWikiDocuments(
    collection: Collection,
    openai: OpenAI,
    query: string,
    nResults: number
): Promise<string[]> {
    const embedding = await embedText(openai, query);
    const result = await collection.query({
        queryEmbeddings: [embedding],
        nResults,
    });

    return (result.documents?.[0] ?? []).filter(
        (doc): doc is string => typeof doc === 'string' && doc.length > 0
    );
}

export function formatWikiChunks(chunks: Iterable<string>): string {
    const list = [...chunks];
    return list.length ? list.join('\n\n---\n\n') : '(no matching documentation)';
}

export function mergeWikiChunks(existing: Set<string>, found: string[]): string[] {
    for (const chunk of found) {
        existing.add(chunk);
    }
    return [...existing];
}
