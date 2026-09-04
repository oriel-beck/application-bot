import type { Collection } from 'chromadb';
import type OpenAI from 'openai';
import { type BdscriptNameKind, inferBdscriptKind } from './bdscript-function-index.js';
import { embedText } from './wiki-search.js';

export const API_FUNCTION_TOP_K = 8;

export interface ApiDocHit {
  document: string;
  file: string;
  kind: BdscriptNameKind;
}

function kindFromHit(file: string, document: string): BdscriptNameKind {
  if (file) {
    return inferBdscriptKind(file.endsWith('.md') ? file : `${file}.md`);
  }
  if (document.includes('## BDFD API callback:')) {
    return 'callback';
  }
  return 'function';
}

export async function searchApiFunctionDocs(
  collection: Collection,
  openai: OpenAI,
  query: string,
  nResults: number
): Promise<ApiDocHit[]> {
  const embedding = await embedText(openai, query);
  const result = await collection.query({
    queryEmbeddings: [embedding],
    nResults,
    where: { source: 'bdfd-api' },
    include: ['documents', 'metadatas']
  });

  const documents = result.documents?.[0] ?? [];
  const metadatas = result.metadatas?.[0] ?? [];
  const hits: ApiDocHit[] = [];

  for (let i = 0; i < documents.length; i++) {
    const document = documents[i];
    if (typeof document !== 'string' || !document.length) continue;

    const meta = metadatas[i] as Record<string, unknown> | null | undefined;
    const file = typeof meta?.file === 'string' ? meta.file : '';
    const metaKind = meta?.kind === 'callback' || meta?.kind === 'function' ? meta.kind : undefined;
    const kind = metaKind ?? kindFromHit(file, document);

    hits.push({ document, file, kind });
  }

  return hits;
}

export function splitApiDocHits(hits: ApiDocHit[]): {
  functions: Set<string>;
  callbacks: Set<string>;
} {
  const functions = new Set<string>();
  const callbacks = new Set<string>();

  for (const hit of hits) {
    if (hit.kind === 'callback') callbacks.add(hit.document);
    else functions.add(hit.document);
  }

  return { functions, callbacks };
}
