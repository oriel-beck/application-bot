import { describe, expect, it } from 'vitest';
import type { BdscriptFunctionIndex } from './bdscript-function-index.js';
import {
  bdfdApiCallbacksToChunks,
  bdfdApiFunctionsToChunks,
  registerBdscriptFunctionsFromApi,
  type BdfdApiCallback,
  type BdfdApiFunction
} from './bdfd-api.js';

function apiFunction(tag: string): BdfdApiFunction {
  return { tag, shortDescription: 'desc', longDescription: '', arguments: null, intents: 0, premium: false };
}

const onJoined: BdfdApiCallback = {
  name: '$onJoined[channelID]',
  description: 'desc',
  arguments: null,
  intents: 0,
  is_premium: false
};

const wikiPages: Record<string, string> = { var: 'src/bdscript/var.md', aiAgent: 'src/premium/aiAgent.md' };
const wikiPageFor = (name: string) => wikiPages[name];

describe('API chunks link only to published wiki pages', () => {
  it('links the real page, wherever it lives', () => {
    const [varChunk, aiChunk] = bdfdApiFunctionsToChunks(
      [apiFunction('$var[name]'), apiFunction('$aiAgent')],
      wikiPageFor
    );
    expect(varChunk?.document).toContain('**Wiki:** https://wiki.botdesignerdiscord.com/nightly/bdscript/var.html');
    expect(varChunk?.metadata.url).toBe('https://wiki.botdesignerdiscord.com/nightly/bdscript/var.html');
    expect(aiChunk?.document).toContain('**Wiki:** https://wiki.botdesignerdiscord.com/nightly/premium/aiAgent.html');
  });

  it('omits the link when the wiki has no page instead of guessing one', () => {
    const [chunk] = bdfdApiFunctionsToChunks([apiFunction('$addActionRow')], wikiPageFor);
    expect(chunk?.document).not.toContain('**Wiki:**');
    expect(chunk?.metadata.url).toBe('');

    const [callback] = bdfdApiCallbacksToChunks([onJoined]);
    expect(callback?.document).not.toContain('**Wiki:**');
    expect(callback?.metadata.url).toBe('');
  });

  it('registers API-only names without a URL', () => {
    const index: BdscriptFunctionIndex = new Map();
    registerBdscriptFunctionsFromApi([apiFunction('$addActionRow')], index);
    expect(index.get('addActionRow')).toMatchObject({ url: '', file: 'api/bdfd/addActionRow', kind: 'function' });
  });
});
