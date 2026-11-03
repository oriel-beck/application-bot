import type { Collection } from 'chromadb';
import { describe, expect, it } from 'vitest';
import { registerBdscriptCallbacksFromApi, registerBdscriptFunctionsFromApi } from './bdfd-api.js';
import {
  type BdscriptFunctionIndex,
  bdscriptFunctionNames,
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
    expect(wikiUrlFromPath('src/bdscript/var.md')).toBe('https://wiki.botdesignerdiscord.com/bdscript/var.html');
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
      url: 'https://wiki.botdesignerdiscord.com/bdscript/var.html',
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
    expect(rec?.url).toBe('https://wiki.botdesignerdiscord.com/bdscript/var.html');
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
