/**
 * BDFD public API — https://wiki.botdesignerdiscord.com/resources/api.html
 * GET https://botdesignerdiscord.com/public/api/function_list
 * GET https://botdesignerdiscord.com/public/api/callback_list
 */

import {
  type BdscriptFunctionIndex,
  type BdscriptNameKind,
  inferBdscriptKind,
  wikiUrlFromPath
} from './bdscript-function-index.js';

export const BDFD_API_BASE = 'https://botdesignerdiscord.com/public/api';
export const BDFD_API_FUNCTION_LIST_URL = `${BDFD_API_BASE}/function_list`;
export const BDFD_API_CALLBACK_LIST_URL = `${BDFD_API_BASE}/callback_list`;

const API_FUNCTION_FILE_PREFIX = 'api/bdfd/';
const API_CALLBACK_FILE_PREFIX = 'api/bdfd/callback/';
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
  /** The argument can repeat any number of times (`$sum[number;...]`). */
  repeatable?: boolean;
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
    kind: BdscriptNameKind;
  };
}

/** Base name from API tag, e.g. `$addField[...]` → `addField` */
export function parseBdscriptTag(tag: string): string {
  const match = /^\$([A-Za-z][A-Za-z0-9]*)/.exec(tag.trim());
  return match?.[1] ?? '';
}

async function fetchBdfdApiList<T>(url: string, label: string): Promise<T[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BDFD-Support-Bot-Ingest' }
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

/**
 * Published wiki page (`src/...md`) for a function/callback name, or `undefined` when the wiki
 * has none — many API functions (e.g. newer components) have no page, so a URL must never be
 * guessed from the name.
 */
export type WikiPageResolver = (name: string) => string | undefined;

const noWikiPages: WikiPageResolver = () => undefined;

function wikiLine(name: string, wikiPageFor: WikiPageResolver): string {
  const page = wikiPageFor(name);
  return page ? `\n\n**Wiki:** ${wikiUrlFromPath(page)}` : '';
}

function formatBdfdApiCallbackVariant(callback: BdfdApiCallback): string {
  const lines: string[] = [`**Syntax:** \`${callback.name}\``, ''];

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
    lines.push(`**Deprecated:** yes${replacement ? ` — use \`${replacement}\` instead` : ''}`, '');
  }

  return lines.join('\n').trim();
}

export function formatBdfdApiCallbackDoc(
  callback: BdfdApiCallback,
  name: string,
  wikiPageFor: WikiPageResolver = noWikiPages
): string {
  return (
    `## BDFD API callback: $${name}\n\n` +
    '_Official BDFD public API callback definition. Callbacks are used in the **command trigger** field, not in reply code._\n\n' +
    formatBdfdApiCallbackVariant(callback) +
    wikiLine(name, wikiPageFor)
  )
    .trim()
    .slice(0, MAX_CHUNK_CHARS);
}

function formatBdfdApiFunctionVariant(func: BdfdApiFunction): string {
  const lines: string[] = [`**Syntax:** \`${func.tag}\``, ''];

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
    lines.push(`**Deprecated:** yes${replacement ? ` — use \`${replacement}\` instead` : ''}`, '');
  }

  return lines.join('\n').trim();
}

export function formatBdfdApiFunctionDoc(
  func: BdfdApiFunction,
  name: string,
  wikiPageFor: WikiPageResolver = noWikiPages
): string {
  return (
    `## BDFD API: $${name}\n\n` +
    '_Official BDFD public API definition. Prefer wiki excerpts for examples when both are available._\n\n' +
    formatBdfdApiFunctionVariant(func) +
    wikiLine(name, wikiPageFor)
  )
    .trim()
    .slice(0, MAX_CHUNK_CHARS);
}

function groupFunctionsByName(functions: BdfdApiFunction[]): Map<string, BdfdApiFunction[]> {
  const byName = new Map<string, BdfdApiFunction[]>();

  for (const func of functions) {
    const name = parseBdscriptTag(func.tag);
    if (!name) continue;

    const list = byName.get(name);
    if (list) list.push(func);
    else byName.set(name, [func]);
  }

  return byName;
}

function groupCallbacksByName(callbacks: BdfdApiCallback[]): Map<string, BdfdApiCallback[]> {
  const byName = new Map<string, BdfdApiCallback[]>();

  for (const callback of callbacks) {
    const name = parseBdscriptTag(callback.name);
    if (!name) continue;

    const list = byName.get(name);
    if (list) list.push(callback);
    else byName.set(name, [callback]);
  }

  return byName;
}

function formatBdfdApiFunctionDocMerged(
  variants: BdfdApiFunction[],
  name: string,
  wikiPageFor: WikiPageResolver
): string {
  const variantBlocks = variants.map((func, i) => {
    const label = variants.length > 1 ? `### Variant ${i + 1}\n\n` : '';
    return `${label}${formatBdfdApiFunctionVariant(func)}`;
  });

  return (
    `## BDFD API: $${name}\n\n` +
    '_Official BDFD public API definition. Multiple syntax variants are listed when the API defines overloads._\n\n' +
    variantBlocks.join('\n\n---\n\n') +
    wikiLine(name, wikiPageFor)
  )
    .trim()
    .slice(0, MAX_CHUNK_CHARS);
}

/** The name's wiki page, or `''` (Chroma metadata can't hold `undefined`) when it has none. */
function apiChunkUrl(name: string, wikiPageFor: WikiPageResolver): string {
  const page = wikiPageFor(name);
  return page ? wikiUrlFromPath(page) : '';
}

export function bdfdApiFunctionsToChunks(
  functions: BdfdApiFunction[],
  wikiPageFor: WikiPageResolver = noWikiPages
): BdfdApiWikiChunk[] {
  const chunks: BdfdApiWikiChunk[] = [];

  for (const [name, variants] of groupFunctionsByName(functions)) {
    const file = `${API_FUNCTION_FILE_PREFIX}${name}.md`;
    chunks.push({
      id: `${file}#api`,
      document: formatBdfdApiFunctionDocMerged(variants, name, wikiPageFor),
      metadata: {
        file,
        heading: variants.map((v) => v.tag).join(' · '),
        url: apiChunkUrl(name, wikiPageFor),
        source: 'bdfd-api',
        kind: 'function'
      }
    });
  }

  return chunks;
}

function formatBdfdApiCallbackDocMerged(
  variants: BdfdApiCallback[],
  name: string,
  wikiPageFor: WikiPageResolver
): string {
  const variantBlocks = variants.map((cb, i) => {
    const label = variants.length > 1 ? `### Variant ${i + 1}\n\n` : '';
    return `${label}${formatBdfdApiCallbackVariant(cb)}`;
  });

  return (
    `## BDFD API callback: $${name}\n\n` +
    '_Official BDFD public API callback definition. Callbacks are used in the **command trigger** field, not in reply code. Multiple syntax variants are listed when the API defines overloads._\n\n' +
    variantBlocks.join('\n\n---\n\n') +
    wikiLine(name, wikiPageFor)
  )
    .trim()
    .slice(0, MAX_CHUNK_CHARS);
}

export function bdfdApiCallbacksToChunks(
  callbacks: BdfdApiCallback[],
  wikiPageFor: WikiPageResolver = noWikiPages
): BdfdApiWikiChunk[] {
  const chunks: BdfdApiWikiChunk[] = [];

  for (const [name, variants] of groupCallbacksByName(callbacks)) {
    const file = `${API_CALLBACK_FILE_PREFIX}${name}.md`;
    chunks.push({
      id: `${file}#api`,
      document: formatBdfdApiCallbackDocMerged(variants, name, wikiPageFor),
      metadata: {
        file,
        heading: variants.map((v) => v.name).join(' · '),
        url: apiChunkUrl(name, wikiPageFor),
        source: 'bdfd-api',
        kind: 'callback'
      }
    });
  }

  return chunks;
}

/**
 * Add API functions to the BDScript name index (wiki entries win for url/file) and attach the
 * official argument-schema variants for arity validation — backfilled onto a wiki-sourced entry
 * too, since wiki markdown has no structured argument data of its own.
 */
export function registerBdscriptFunctionsFromApi(functions: BdfdApiFunction[], index: BdscriptFunctionIndex): number {
  let added = 0;

  for (const [name, variants] of groupFunctionsByName(functions)) {
    const argVariants = variants.map((v) => v.arguments);
    const existing = index.get(name);
    if (existing) {
      existing.variants ??= argVariants;
      continue;
    }

    const file = `${API_FUNCTION_FILE_PREFIX}${name}`;
    // No wiki page registered this name (wiki entries win above), so there's no URL to give.
    index.set(name, {
      url: '',
      file,
      kind: inferBdscriptKind(file),
      variants: argVariants
    });
    added++;
  }

  return added;
}

/** Add API callbacks to the name index (wiki callback pages win) and attach argument-schema variants. */
export function registerBdscriptCallbacksFromApi(callbacks: BdfdApiCallback[], index: BdscriptFunctionIndex): number {
  let added = 0;

  for (const [name, variants] of groupCallbacksByName(callbacks)) {
    const argVariants = variants.map((v) => v.arguments);
    const existing = index.get(name);
    if (existing) {
      existing.variants ??= argVariants;
      continue;
    }

    const file = `${API_CALLBACK_FILE_PREFIX}${name}`;
    index.set(name, {
      url: '',
      file,
      kind: inferBdscriptKind(file),
      variants: argVariants
    });
    added++;
  }

  return added;
}
