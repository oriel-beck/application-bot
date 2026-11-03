import { IncludeEnum, type Collection } from 'chromadb';
import type OpenAI from 'openai';
import type { WikiChunkRecord } from './wiki-page-index.js';

export const WIKI_EMBEDDING_MODEL = 'text-embedding-3-small';

export async function embedText(openai: OpenAI, text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: WIKI_EMBEDDING_MODEL,
    input: text
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
    nResults
  });

  return (result.documents?.[0] ?? []).filter((doc): doc is string => typeof doc === 'string' && doc.length > 0);
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

function toWikiRecords(documents: (string | null)[], metadatas: (Record<string, unknown> | null)[]): WikiChunkRecord[] {
  const records: WikiChunkRecord[] = [];
  for (let i = 0; i < documents.length; i++) {
    const document = documents[i];
    const meta = metadatas[i];
    if (typeof document !== 'string' || !document.length || !meta) continue;
    const { file, heading, source } = meta;
    if (typeof file !== 'string' || typeof heading !== 'string') continue;
    if (source !== 'wiki' && source !== 'bdfd-api') continue;
    records.push({ file, heading, document, source });
  }
  return records;
}

const WIKI_LOAD_PAGE_SIZE = 500;

/** Every wiki page chunk and API function/callback chunk, for the `/search` page index. */
export async function loadWikiChunkRecords(collection: Collection): Promise<WikiChunkRecord[]> {
  const records: WikiChunkRecord[] = [];
  for (let offset = 0; ; offset += WIKI_LOAD_PAGE_SIZE) {
    const page = await collection.get({
      where: { source: { $in: ['wiki', 'bdfd-api'] } },
      limit: WIKI_LOAD_PAGE_SIZE,
      offset,
      include: [IncludeEnum.documents, IncludeEnum.metadatas]
    });
    records.push(...toWikiRecords(page.documents, page.metadatas));
    if (page.ids.length < WIKI_LOAD_PAGE_SIZE) return records;
  }
}

/** Semantic search over wiki pages and API function definitions (no Discord chunks), with metadata. */
export async function searchWikiChunkRecords(
  collection: Collection,
  openai: OpenAI,
  query: string,
  nResults: number
): Promise<WikiChunkRecord[]> {
  const embedding = await embedText(openai, query);
  const result = await collection.query({
    queryEmbeddings: [embedding],
    nResults,
    where: { source: { $in: ['wiki', 'bdfd-api'] } },
    include: [IncludeEnum.documents, IncludeEnum.metadatas]
  });
  return toWikiRecords(result.documents?.[0] ?? [], result.metadatas?.[0] ?? []);
}
