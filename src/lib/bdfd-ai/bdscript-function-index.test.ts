import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Collection } from 'chromadb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type BdfdApiFunction,
  registerBdscriptCallbacksFromApi,
  registerBdscriptFunctionsFromApi
} from './bdfd-api.js';
import {
  type BdscriptFunctionIndex,
  bdscriptFunctionNames,
  ensureFunctionIndex,
  fetchApiDocsForNames,
  inferBdscriptKind,
  normalizeBdscriptFunctionName,
  registerBdscriptFunctionsFromMarkdown,
  wikiUrlFromPath
} from './bdscript-function-index.js';

describe('normalizeBdscriptFunctionName', () => {
  it('strips a leading $ and trims whitespace', () => {
    expect(normalizeBdscriptFunctionName('  $var  ')).toBe('var');
  });
});

describe('wikiUrlFromPath', () => {
  it('maps a src/*.md path to the published wiki URL', () => {
    expect(wikiUrlFromPath('src/bdscript/var.md')).toBe(
      'https://wiki.botdesignerdiscord.com/nightly/bdscript/var.html'
    );
  });
});

describe('inferBdscriptKind', () => {
  it('treats src/callbacks/ and api/bdfd/callback/ paths as callbacks', () => {
    expect(inferBdscriptKind('src/callbacks/onJoined.md')).toBe('callback');
    expect(inferBdscriptKind('api/bdfd/callback/onJoined.md')).toBe('callback');
  });

  it('treats everything else as a function', () => {
    expect(inferBdscriptKind('src/bdscript/var.md')).toBe('function');
  });
});

describe('wiki-then-API registration ordering', () => {
  it('keeps the wiki-sourced url/file but backfills `variants` from the API', () => {
    const index: BdscriptFunctionIndex = new Map();

    // Ingest order: wiki markdown is registered first (it has a `# $var` heading).
    registerBdscriptFunctionsFromMarkdown('src/bdscript/var.md', '# $var\nCreates a temporary variable.\n', index);
    expect(index.get('var')).toEqual({
      url: 'https://wiki.botdesignerdiscord.com/nightly/bdscript/var.html',
      file: 'src/bdscript/var.md',
      kind: 'function'
    });

    // Then the official API list is registered — should backfill `variants` without
    // clobbering the wiki-sourced url/file.
    registerBdscriptFunctionsFromApi(
      [
        {
          tag: '$var[Name;(Value)]',
          shortDescription: 'Temp variable',
          longDescription: '',
          arguments: [
            { name: 'Name', type: 'String', required: true },
            { name: 'Value', type: 'String', required: false }
          ],
          intents: 0,
          premium: false
        }
      ],
      index
    );

    const rec = index.get('var');
    expect(rec?.url).toBe('https://wiki.botdesignerdiscord.com/nightly/bdscript/var.html');
    expect(rec?.file).toBe('src/bdscript/var.md');
    expect(rec?.variants).toEqual([
      [
        { name: 'Name', type: 'String', required: true },
        { name: 'Value', type: 'String', required: false }
      ]
    ]);
  });

  it('registers a brand-new API-only function (no wiki page) with the api/bdfd/ file prefix', () => {
    const index: BdscriptFunctionIndex = new Map();

    registerBdscriptFunctionsFromApi(
      [
        {
          tag: '$brandNewFn[A]',
          shortDescription: '',
          longDescription: '',
          arguments: null,
          intents: 0,
          premium: false
        }
      ],
      index
    );

    expect(index.get('brandNewFn')).toMatchObject({ file: 'api/bdfd/brandNewFn', kind: 'function' });
  });

  it('registers callbacks under the api/bdfd/callback/ prefix, inferred as kind "callback"', () => {
    const index: BdscriptFunctionIndex = new Map();

    registerBdscriptCallbacksFromApi(
      [{ name: '$onJoined[channelID]', description: '', arguments: null, intents: 0, is_premium: false }],
      index
    );

    const rec = index.get('onJoined');
    expect(rec?.kind).toBe('callback');
    expect(bdscriptFunctionNames(index).has('onJoined')).toBe(true);
  });
});

function fakeCollection(documentsByFile: Record<string, string>): Collection {
  return {
    get: async ({ where }: { where?: { file?: string } }) => {
      const file = where?.file;
      const doc = file ? documentsByFile[file] : undefined;
      return { documents: doc ? [doc] : [] };
    }
  } as unknown as Collection;
}

describe('fetchApiDocsForNames', () => {
  it('fetches the exact bdfd-api chunk for each known name, split by kind', async () => {
    const index: BdscriptFunctionIndex = new Map([
      ['var', { url: '', file: 'api/bdfd/var', kind: 'function' }],
      ['onJoined', { url: '', file: 'api/bdfd/callback/onJoined', kind: 'callback' }]
    ]);
    const collection = fakeCollection({
      'api/bdfd/var.md': '## BDFD API: $var\n...',
      'api/bdfd/callback/onJoined.md': '## BDFD API callback: $onJoined\n...'
    });

    const result = await fetchApiDocsForNames(['var', 'onJoined'], index, collection);
    expect(result.functions).toEqual(['## BDFD API: $var\n...']);
    expect(result.callbacks).toEqual(['## BDFD API callback: $onJoined\n...']);
  });

  it('silently skips a name that is not in the index (hallucinated name)', async () => {
    const index: BdscriptFunctionIndex = new Map();
    const collection = fakeCollection({});

    const result = await fetchApiDocsForNames(['totallyMadeUp'], index, collection);
    expect(result).toEqual({ functions: [], callbacks: [] });
  });
});

describe('ensureFunctionIndex', () => {
  const varFromApi: BdfdApiFunction = {
    tag: '$var[Name;(Value)]',
    shortDescription: 'Temp variable',
    longDescription: '',
    arguments: [
      { name: 'Name', type: 'String', required: true },
      { name: 'Value', type: 'String', required: false }
    ],
    intents: 0,
    premium: false
  };

  let cwd: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  async function writeIndexJson(data: unknown) {
    await writeFile(join(cwd, 'json', 'bdscript-functions.json'), JSON.stringify(data));
  }

  async function readIndexJson() {
    return JSON.parse(await readFile(join(cwd, 'json', 'bdscript-functions.json'), 'utf-8')) as Record<
      string,
      { url: string; variants?: unknown }
    >;
  }

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'bdscript-index-'));
    await mkdir(join(cwd, 'json'));
    // Fake the BDFD API at the network edge: function_list → [$var], callback_list → [].
    fetchMock = vi.fn(async (url: string) => Response.json(url.includes('function_list') ? [varFromApi] : []));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(cwd, { recursive: true, force: true });
  });

  it('builds an empty index from the API and caches it to json/', async () => {
    await writeIndexJson({});
    const index = await ensureFunctionIndex(cwd);
    expect(index.get('var')?.variants).toHaveLength(1);
    expect((await readIndexJson()).var?.variants).toBeDefined();
  });

  it('backfills `variants` into a stale (pre-arity) index, keeping its wiki url, and caches it', async () => {
    const wikiUrl = 'https://wiki.botdesignerdiscord.com/nightly/bdscript/var.html';
    await writeIndexJson({ var: { url: wikiUrl, file: 'src/bdscript/var.md', kind: 'function' } });

    const index = await ensureFunctionIndex(cwd);
    expect(fetchMock).toHaveBeenCalledTimes(2); // function_list + callback_list
    expect(index.get('var')).toMatchObject({ url: wikiUrl, file: 'src/bdscript/var.md' });
    expect(index.get('var')?.variants).toHaveLength(1);
    expect((await readIndexJson()).var).toMatchObject({ url: wikiUrl, variants: expect.any(Array) });
  });

  it('uses an up-to-date index as-is without calling the API', async () => {
    await writeIndexJson({
      var: { url: '', file: 'api/bdfd/var', kind: 'function', variants: [varFromApi.arguments] }
    });
    const index = await ensureFunctionIndex(cwd);
    expect(index.size).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
