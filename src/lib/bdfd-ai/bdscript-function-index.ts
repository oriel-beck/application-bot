import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Collection } from 'chromadb';
import {
  type BdfdApiArgument,
  fetchBdfdCallbackList,
  fetchBdfdFunctionList,
  registerBdscriptCallbacksFromApi,
  registerBdscriptFunctionsFromApi
} from './bdfd-api.js';

export type BdscriptNameKind = 'function' | 'callback';

export interface BdscriptFunctionRecord {
  url: string;
  file: string;
  kind: BdscriptNameKind;
  /**
   * Argument schema per syntax overload, from the official BDFD API (`function_list`/
   * `callback_list`). Undefined when the name was only registered from wiki markdown, which
   * has no structured argument data — arity validation is skipped for those names.
   */
  variants?: (BdfdApiArgument[] | null)[];
}

export type BdscriptFunctionIndex = Map<string, BdscriptFunctionRecord>;

const INDEX_FILENAME = 'bdscript-functions.json';
const BDSCRIPT_FILE_PREFIX = 'src/bdscript/';
const WIKI_CALLBACK_PREFIX = 'src/callbacks/';
const API_FUNCTION_FILE_PREFIX = 'api/bdfd/';
const API_CALLBACK_FILE_PREFIX = 'api/bdfd/callback/';
/** Cap on how many names from a single user message get a deterministic doc lookup. */
const MAX_DETERMINISTIC_LOOKUPS = 20;

export function normalizeBdscriptFunctionName(name: string): string {
  return name.trim().replace(/^\$/, '');
}

export function wikiUrlFromPath(filePath: string): string {
  const wikiPath = filePath.replace(/^src\//, '').replace(/\.md$/, '.html');
  return `https://wiki.botdesignerdiscord.com/${wikiPath}`;
}

/** Infer function vs callback from wiki/API file path (callback paths checked first). */
export function inferBdscriptKind(filePath: string): BdscriptNameKind {
  if (filePath.startsWith(WIKI_CALLBACK_PREFIX) || filePath.startsWith(API_CALLBACK_FILE_PREFIX)) {
    return 'callback';
  }
  return 'function';
}

function recordFor(filePath: string): BdscriptFunctionRecord {
  return {
    url: wikiUrlFromPath(filePath),
    file: filePath,
    kind: inferBdscriptKind(filePath)
  };
}

/** Register BDScript function names from a wiki page (ingest + index build). */
export function registerBdscriptFunctionsFromMarkdown(
  filePath: string,
  markdown: string,
  index: BdscriptFunctionIndex
): void {
  const heading = /^#\s+\$([A-Za-z][A-Za-z0-9]*)\s*$/m.exec(markdown);
  if (heading) {
    const name = heading[1]!;
    const existing = index.get(name);
    if (!existing || filePath.startsWith(BDSCRIPT_FILE_PREFIX) || filePath.startsWith(WIKI_CALLBACK_PREFIX)) {
      index.set(name, recordFor(filePath));
    }
  }

  if (filePath.startsWith(BDSCRIPT_FILE_PREFIX) && filePath.endsWith('.md')) {
    const base = filePath.slice(BDSCRIPT_FILE_PREFIX.length, -3);
    if (!index.has(base)) {
      index.set(base, recordFor(filePath));
    }
  }

  if (filePath.startsWith(WIKI_CALLBACK_PREFIX) && filePath.endsWith('.md')) {
    const base = filePath.slice(WIKI_CALLBACK_PREFIX.length, -3);
    if (!index.has(base)) {
      index.set(base, recordFor(filePath));
    }
  }
}

export function bdscriptFunctionIndexToJson(index: BdscriptFunctionIndex): Record<string, BdscriptFunctionRecord> {
  return Object.fromEntries(index);
}

export async function loadBdscriptFunctionIndex(cwd = process.cwd()): Promise<BdscriptFunctionIndex> {
  const path = join(cwd, 'json', INDEX_FILENAME);
  try {
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw) as Record<
      string,
      Partial<BdscriptFunctionRecord> & Pick<BdscriptFunctionRecord, 'url' | 'file'>
    >;
    const index: BdscriptFunctionIndex = new Map();
    for (const [name, rec] of Object.entries(data)) {
      index.set(name, {
        url: rec.url,
        file: rec.file,
        kind: rec.kind ?? inferBdscriptKind(rec.file),
        variants: rec.variants
      });
    }
    return index;
  } catch {
    console.warn(`[bdfd-ai] ${INDEX_FILENAME} not found — run wiki ingest to build the function index`);
    return new Map();
  }
}

export function bdscriptFunctionNames(index: BdscriptFunctionIndex): Set<string> {
  return new Set(index.keys());
}

/** Load index from disk; if empty, populate from BDFD public API lists. */
/** Write the index to `json/` (same file the wiki ingest writes) so later startups skip the API. */
export async function saveBdscriptFunctionIndex(index: BdscriptFunctionIndex, cwd = process.cwd()): Promise<void> {
  const path = join(cwd, 'json', INDEX_FILENAME);
  try {
    await writeFile(path, `${JSON.stringify(bdscriptFunctionIndexToJson(index), null, 2)}\n`);
    console.log(`[bdfd-ai] Cached function index to ${path}`);
  } catch (err) {
    console.warn(`[bdfd-ai] Could not cache function index to ${path}:`, err);
  }
}

export async function ensureFunctionIndex(cwd = process.cwd()): Promise<BdscriptFunctionIndex> {
  const index = await loadBdscriptFunctionIndex(cwd);
  if (index.size > 0) {
    return index;
  }

  console.warn('[bdfd-ai] Function index empty — fetching BDFD public API function_list and callback_list');

  try {
    const [functions, callbacks] = await Promise.all([fetchBdfdFunctionList(), fetchBdfdCallbackList()]);
    registerBdscriptFunctionsFromApi(functions, index);
    registerBdscriptCallbacksFromApi(callbacks, index);

    if (index.size === 0) {
      console.error('[bdfd-ai] Function index still empty after API fetch');
    } else {
      console.log(`[bdfd-ai] Built function index from API (${index.size} names)`);
      await saveBdscriptFunctionIndex(index, cwd);
    }
  } catch (err) {
    console.error('[bdfd-ai] Failed to fetch BDFD API for function index:', err);
  }

  return index;
}

export interface FunctionCheckResult {
  input: string;
  normalized: string;
  exists: boolean;
  kind?: BdscriptNameKind;
  url?: string;
  file?: string;
}

export async function checkBdscriptFunctions(
  names: string[],
  index: BdscriptFunctionIndex,
  collection: Collection | null
): Promise<FunctionCheckResult[]> {
  const results: FunctionCheckResult[] = [];

  for (const input of names) {
    const normalized = normalizeBdscriptFunctionName(input);
    if (!normalized) {
      results.push({ input, normalized: '', exists: false });
      continue;
    }

    const hit = index.get(normalized);
    if (hit) {
      results.push({
        input,
        normalized,
        exists: true,
        kind: hit.kind,
        url: hit.url,
        file: hit.file
      });
      continue;
    }

    let exists = false;
    let url: string | undefined;
    let file: string | undefined;
    let kind: BdscriptNameKind | undefined;

    if (collection) {
      const candidates = [
        `${BDSCRIPT_FILE_PREFIX}${normalized}.md`,
        `api/bdfd/${normalized}.md`,
        `src/callbacks/${normalized}.md`,
        `api/bdfd/callback/${normalized}.md`
      ];
      for (const candidate of candidates) {
        try {
          const got = await collection.get({
            where: { file: candidate },
            limit: 1
          });
          if ((got.ids?.length ?? 0) > 0) {
            exists = true;
            file = candidate;
            kind = inferBdscriptKind(candidate);
            url =
              candidate.startsWith(BDSCRIPT_FILE_PREFIX) || candidate.startsWith(WIKI_CALLBACK_PREFIX)
                ? wikiUrlFromPath(candidate)
                : 'https://wiki.botdesignerdiscord.com/resources/api.html';
            break;
          }
        } catch {
          /* try next path */
        }
      }
    }

    results.push({ input, normalized, exists, kind, url, file });
  }

  return results;
}

/**
 * Deterministically fetch the official `bdfd-api` doc chunk for each name already present
 * in the user's own message, keyed by exact file lookup rather than semantic similarity.
 * Guarantees a function/callback the user literally typed is always backed by its real doc,
 * even when a long multi-function script would otherwise starve it out of top-k retrieval.
 */
export async function fetchApiDocsForNames(
  names: string[],
  index: BdscriptFunctionIndex,
  collection: Collection
): Promise<{ functions: string[]; callbacks: string[] }> {
  const functions: string[] = [];
  const callbacks: string[] = [];

  const lookups = names.slice(0, MAX_DETERMINISTIC_LOOKUPS).map(async (name) => {
    const rec = index.get(name);
    if (!rec) return;

    const isCallback = rec.kind === 'callback';
    const file = isCallback ? `${API_CALLBACK_FILE_PREFIX}${name}.md` : `${API_FUNCTION_FILE_PREFIX}${name}.md`;

    try {
      const got = await collection.get({ where: { file }, limit: 1 });
      const doc = got.documents?.[0];
      if (typeof doc === 'string' && doc.length) {
        (isCallback ? callbacks : functions).push(doc);
      }
    } catch {
      /* skip on lookup failure — semantic search may still surface it */
    }
  });

  await Promise.all(lookups);

  return { functions, callbacks };
}

function formatKindLabel(kind: BdscriptNameKind | undefined): string {
  if (kind === 'callback') {
    return ' (callback — command trigger only, not reply code)';
  }
  if (kind === 'function') {
    return ' (function)';
  }
  return '';
}

export function formatFunctionCheckResults(results: FunctionCheckResult[]): string {
  return results
    .map((r) => {
      if (r.exists) {
        return `$${r.normalized}: exists${formatKindLabel(r.kind)}${r.url ? ` (${r.url})` : ''}`;
      }
      return `$${r.normalized || r.input}: not found in BDScript wiki/API index`;
    })
    .join('\n');
}
