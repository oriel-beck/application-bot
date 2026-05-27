/**
 * BDFD public API — https://wiki.botdesignerdiscord.com/resources/api.html
 * GET https://botdesignerdiscord.com/public/api/function_list
 * GET https://botdesignerdiscord.com/public/api/callback_list
 */

import {
    type BdscriptFunctionIndex,
    wikiUrlFromPath,
} from './bdscript-function-index.js';

export const BDFD_API_BASE = 'https://botdesignerdiscord.com/public/api';
export const BDFD_API_FUNCTION_LIST_URL = `${BDFD_API_BASE}/function_list`;
export const BDFD_API_CALLBACK_LIST_URL = `${BDFD_API_BASE}/callback_list`;

const API_FUNCTION_FILE_PREFIX = 'api/bdfd/';
const API_CALLBACK_FILE_PREFIX = 'api/bdfd/callback/';
const WIKI_CALLBACK_PREFIX = 'src/callbacks/';
const MAX_CHUNK_CHARS = 3200;

export interface BdfdApiArgument {
    name: string;
    description?: string;
    type: string;
    required?: boolean;
    empty?: boolean;
    vacantable?: boolean;
    optional?: boolean;
    enumData?: string[];
}

export interface BdfdApiFunction {
    tag: string;
    shortDescription: string;
    longDescription: string;
    arguments: BdfdApiArgument[] | null;
    intents: number;
    premium: boolean;
    color?: number;
    deprecated?: boolean;
    deprecatedFor?: string;
}

export interface BdfdApiCallback {
    name: string;
    description: string;
    arguments: BdfdApiArgument[] | null;
    intents: number;
    is_premium: boolean;
    deprecated?: boolean;
    deprecatedFor?: string;
}

export interface BdfdApiWikiChunk {
    id: string;
    document: string;
    metadata: {
        file: string;
        heading: string;
        url: string;
        source: 'bdfd-api';
    };
}

/** Base name from API tag, e.g. `$addField[...]` → `addField` */
export function parseBdscriptTag(tag: string): string {
    const match = /^\$([A-Za-z][A-Za-z0-9]*)/.exec(tag.trim());
    return match?.[1] ?? '';
}

async function fetchBdfdApiList<T>(url: string, label: string): Promise<T[]> {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'BDFD-Support-Bot-Ingest' },
    });
    if (!res.ok) {
        throw new Error(`BDFD ${label} fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as T[];
    if (!Array.isArray(data)) {
        throw new Error(`BDFD ${label} response is not an array`);
    }

    return data;
}

export function fetchBdfdFunctionList(url = BDFD_API_FUNCTION_LIST_URL): Promise<BdfdApiFunction[]> {
    return fetchBdfdApiList<BdfdApiFunction>(url, 'function_list');
}

export function fetchBdfdCallbackList(url = BDFD_API_CALLBACK_LIST_URL): Promise<BdfdApiCallback[]> {
    return fetchBdfdApiList<BdfdApiCallback>(url, 'callback_list');
}

function formatArgumentFlags(arg: BdfdApiArgument): string {
    const flags: string[] = [];
    if (arg.required) flags.push('Required');
    else flags.push('Optional');
    if (arg.empty) flags.push('Emptiable');
    if (arg.vacantable) flags.push('Vacantable');
    if (arg.optional) flags.push('Optional');
    return flags.join(' || ') || '—';
}

function formatArguments(args: BdfdApiArgument[] | null): string {
    if (!args?.length) {
        return '_No arguments._';
    }

    return args
        .map((arg) => {
            const desc = arg.description?.trim() || '—';
            let line = `- \`${arg.name}\` (Type: ${arg.type} || Flag: ${formatArgumentFlags(arg)}): ${desc}`;
            if (arg.enumData?.length) {
                line += ` Options: ${arg.enumData.join(', ')}`;
            }
            return line;
        })
        .join('\n');
}

function wikiCallbackPath(name: string): string {
    return `${WIKI_CALLBACK_PREFIX}${name}.md`;
}

export function formatBdfdApiCallbackDoc(callback: BdfdApiCallback, name: string): string {
    const lines: string[] = [
        `## BDFD API callback: $${name}`,
        '',
        '_Official BDFD public API callback definition. Callbacks are used in the **command trigger** field, not in reply code._',
        '',
        `**Syntax:** \`${callback.name}\``,
        '',
    ];

    const description = callback.description?.trim();
    if (description) {
        lines.push('**Description:**', description, '');
    }

    lines.push('**Parameters:**', formatArguments(callback.arguments), '');

    if (callback.is_premium) {
        lines.push('**Premium:** yes', '');
    }

    if (callback.intents) {
        lines.push(`**Gateway intents:** ${callback.intents}`, '');
    }

    if (callback.deprecated) {
        const replacement = callback.deprecatedFor?.trim();
        lines.push(
            `**Deprecated:** yes${replacement ? ` — use \`${replacement}\` instead` : ''}`,
            ''
        );
    }

    lines.push(`**Wiki:** ${wikiUrlFromPath(wikiCallbackPath(name))}`);

    return lines.join('\n').trim().slice(0, MAX_CHUNK_CHARS);
}

export function formatBdfdApiFunctionDoc(func: BdfdApiFunction, name: string): string {
    const lines: string[] = [
        `## BDFD API: $${name}`,
        '',
        '_Official BDFD public API definition. Prefer wiki excerpts for examples when both are available._',
        '',
        `**Syntax:** \`${func.tag}\``,
        '',
    ];

    const description = [func.shortDescription, func.longDescription]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join('\n\n');

    if (description) {
        lines.push('**Description:**', description, '');
    }

    lines.push('**Parameters:**', formatArguments(func.arguments), '');

    if (func.premium) {
        lines.push('**Premium:** yes', '');
    }

    if (func.intents) {
        lines.push(`**Gateway intents:** ${func.intents}`, '');
    }

    if (func.deprecated) {
        const replacement = func.deprecatedFor?.trim();
        lines.push(
            `**Deprecated:** yes${replacement ? ` — use \`${replacement}\` instead` : ''}`,
            ''
        );
    }

    lines.push(`**Wiki:** ${wikiUrlFromPath(`src/bdscript/${name}.md`)}`);

    return lines.join('\n').trim().slice(0, MAX_CHUNK_CHARS);
}

export function bdfdApiFunctionsToChunks(functions: BdfdApiFunction[]): BdfdApiWikiChunk[] {
    const chunks: BdfdApiWikiChunk[] = [];

    for (const func of functions) {
        const name = parseBdscriptTag(func.tag);
        if (!name) continue;

        const file = `${API_FUNCTION_FILE_PREFIX}${name}.md`;
        chunks.push({
            id: `${file}#api`,
            document: formatBdfdApiFunctionDoc(func, name),
            metadata: {
                file,
                heading: func.tag,
                url: 'https://wiki.botdesignerdiscord.com/resources/api.html',
                source: 'bdfd-api',
            },
        });
    }

    return chunks;
}

export function bdfdApiCallbacksToChunks(callbacks: BdfdApiCallback[]): BdfdApiWikiChunk[] {
    const chunks: BdfdApiWikiChunk[] = [];

    for (const callback of callbacks) {
        const name = parseBdscriptTag(callback.name);
        if (!name) continue;

        const file = `${API_CALLBACK_FILE_PREFIX}${name}.md`;
        chunks.push({
            id: `${file}#api`,
            document: formatBdfdApiCallbackDoc(callback, name),
            metadata: {
                file,
                heading: callback.name,
                url: 'https://wiki.botdesignerdiscord.com/resources/api.html',
                source: 'bdfd-api',
            },
        });
    }

    return chunks;
}

/** Add API functions to the BDScript name index (wiki entries win for url/file). */
export function registerBdscriptFunctionsFromApi(
    functions: BdfdApiFunction[],
    index: BdscriptFunctionIndex
): number {
    let added = 0;

    for (const func of functions) {
        const name = parseBdscriptTag(func.tag);
        if (!name) continue;

        if (!index.has(name)) {
            index.set(name, {
                url: wikiUrlFromPath(`src/bdscript/${name}.md`),
                file: `${API_FUNCTION_FILE_PREFIX}${name}`,
            });
            added++;
        }
    }

    return added;
}

/** Add API callbacks to the name index (wiki callback pages win). */
export function registerBdscriptCallbacksFromApi(
    callbacks: BdfdApiCallback[],
    index: BdscriptFunctionIndex
): number {
    let added = 0;

    for (const callback of callbacks) {
        const name = parseBdscriptTag(callback.name);
        if (!name) continue;

        if (!index.has(name)) {
            index.set(name, {
                url: wikiUrlFromPath(wikiCallbackPath(name)),
                file: `${API_CALLBACK_FILE_PREFIX}${name}`,
            });
            added++;
        }
    }

    return added;
}
