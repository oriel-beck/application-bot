import type { Collection } from 'chromadb';
import type OpenAI from 'openai';
import { embedText } from './wiki-search.js';

export const API_FUNCTION_TOP_K = 8;

export async function searchApiFunctionDocs(
    collection: Collection,
    openai: OpenAI,
    query: string,
    nResults: number
): Promise<string[]> {
    const embedding = await embedText(openai, query);
    const result = await collection.query({
        queryEmbeddings: [embedding],
        nResults,
        where: { source: 'bdfd-api' },
    });

    return (result.documents?.[0] ?? []).filter(
        (doc): doc is string => typeof doc === 'string' && doc.length > 0
    );
}
