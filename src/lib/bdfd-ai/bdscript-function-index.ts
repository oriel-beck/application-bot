import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Collection } from 'chromadb';
import {
    fetchBdfdCallbackList,
    fetchBdfdFunctionList,
    registerBdscriptCallbacksFromApi,
    registerBdscriptFunctionsFromApi,
} from './bdfd-api.js';

export interface BdscriptFunctionRecord {
    url: string;
    file: string;
}

export type BdscriptFunctionIndex = Map<string, BdscriptFunctionRecord>;

const INDEX_FILENAME = 'bdscript-functions.json';
const BDSCRIPT_FILE_PREFIX = 'src/bdscript/';
const WIKI_CALLBACK_PREFIX = 'src/callbacks/';

export function normalizeBdscriptFunctionName(name: string): string {
    return name.trim().replace(/^\$/, '');
}

export function wikiUrlFromPath(filePath: string): string {
    const wikiPath = filePath.replace(/^src\//, '').replace(/\.md$/, '.html');
    return `https://wiki.botdesignerdiscord.com/${wikiPath}`;
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
        if (
            !existing ||
            filePath.startsWith(BDSCRIPT_FILE_PREFIX) ||
            filePath.startsWith(WIKI_CALLBACK_PREFIX)
        ) {
            index.set(name, { url: wikiUrlFromPath(filePath), file: filePath });
        }
    }

    if (filePath.startsWith(BDSCRIPT_FILE_PREFIX) && filePath.endsWith('.md')) {
        const base = filePath.slice(BDSCRIPT_FILE_PREFIX.length, -3);
        if (!index.has(base)) {
            index.set(base, { url: wikiUrlFromPath(filePath), file: filePath });
        }
    }

    if (filePath.startsWith(WIKI_CALLBACK_PREFIX) && filePath.endsWith('.md')) {
        const base = filePath.slice(WIKI_CALLBACK_PREFIX.length, -3);
        if (!index.has(base)) {
            index.set(base, { url: wikiUrlFromPath(filePath), file: filePath });
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
        const data = JSON.parse(raw) as Record<string, BdscriptFunctionRecord>;
        return new Map(Object.entries(data));
    } catch {
        console.warn(`[bdfd-ai] ${INDEX_FILENAME} not found — run wiki ingest to build the function index`);
        return new Map();
    }
}

export function bdscriptFunctionNames(index: BdscriptFunctionIndex): Set<string> {
    return new Set(index.keys());
}

/** Load index from disk; if empty, populate from BDFD public API lists. */
export async function ensureFunctionIndex(cwd = process.cwd()): Promise<BdscriptFunctionIndex> {
    const index = await loadBdscriptFunctionIndex(cwd);
    if (index.size > 0) {
        return index;
    }

    console.warn(
        '[bdfd-ai] Function index empty — fetching BDFD public API function_list and callback_list'
    );

    try {
        const [functions, callbacks] = await Promise.all([
            fetchBdfdFunctionList(),
            fetchBdfdCallbackList(),
        ]);
        registerBdscriptFunctionsFromApi(functions, index);
        registerBdscriptCallbacksFromApi(callbacks, index);

        if (index.size === 0) {
            console.error('[bdfd-ai] Function index still empty after API fetch');
        } else {
            console.log(`[bdfd-ai] Built function index from API (${index.size} names)`);
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
                url: hit.url,
                file: hit.file,
            });
            continue;
        }

        let exists = false;
        let url: string | undefined;
        let file: string | undefined;

        if (collection) {
            const candidates = [
                `${BDSCRIPT_FILE_PREFIX}${normalized}.md`,
                `api/bdfd/${normalized}.md`,
                `src/callbacks/${normalized}.md`,
                `api/bdfd/callback/${normalized}.md`,
            ];
            for (const candidate of candidates) {
                try {
                    const got = await collection.get({
                        where: { file: candidate },
                        limit: 1,
                    });
                    if ((got.ids?.length ?? 0) > 0) {
                        exists = true;
                        file = candidate;
                        url =
                            candidate.startsWith(BDSCRIPT_FILE_PREFIX) ||
                            candidate.startsWith('src/callbacks/')
                                ? wikiUrlFromPath(candidate)
                                : 'https://wiki.botdesignerdiscord.com/resources/api.html';
                        break;
                    }
                } catch {
                    /* try next path */
                }
            }
        }

        results.push({ input, normalized, exists, url, file });
    }

    return results;
}

export function formatFunctionCheckResults(results: FunctionCheckResult[]): string {
    return results
        .map((r) => {
            if (r.exists) {
                return `$${r.normalized}: exists${r.url ? ` (${r.url})` : ''}`;
            }
            return `$${r.normalized || r.input}: not found in BDScript wiki/API index`;
        })
        .join('\n');
}
