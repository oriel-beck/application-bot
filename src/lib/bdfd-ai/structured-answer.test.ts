import { describe, expect, it } from 'vitest';
import { parseStructuredCompletion, spliceSnippetsIntoResponse } from './structured-answer.js';

const fence = (code: string) => '```\n' + code + '\n```';

describe('spliceSnippetsIntoResponse', () => {
  it('replaces {n} placeholders with fenced snippets, in order', () => {
    expect(spliceSnippetsIntoResponse('Use {0} or {1}.', ['$a', '$b'])).toEqual({
      text: `Use ${fence('$a')} or ${fence('$b')}.`,
      unreferenced: []
    });
  });

  it('appends snippets the prose never referenced instead of dropping them', () => {
    // The reported bug: "Here's the corrected version of your code:" with the code only in `snippets`.
    expect(spliceSnippetsIntoResponse("Here's the corrected version of your code:\n", ['$nomention\n$ban'])).toEqual({
      text: `Here's the corrected version of your code:\n\n${fence('$nomention\n$ban')}`,
      unreferenced: [0]
    });
  });

  it('appends only the unreferenced ones when some are referenced', () => {
    const { text, unreferenced } = spliceSnippetsIntoResponse('Trigger: {0}\nReply code:', ['$onJoined[1]', '$var[a]']);
    expect(text).toBe(`Trigger: ${fence('$onJoined[1]')}\nReply code:\n\n${fence('$var[a]')}`);
    expect(unreferenced).toEqual([1]);
  });

  it('accepts double-brace {{n}} placeholders', () => {
    expect(spliceSnippetsIntoResponse('Code: {{0}}', ['$a']).text).toBe(`Code: ${fence('$a')}`);
  });

  it('leaves out-of-range placeholders as literal text and ignores empty snippets', () => {
    expect(spliceSnippetsIntoResponse('Literal {5} here.', ['', '  '.trim()])).toEqual({
      text: 'Literal {5} here.',
      unreferenced: []
    });
  });

  it('passes pure prose through unchanged', () => {
    expect(spliceSnippetsIntoResponse('No code needed.', [])).toEqual({ text: 'No code needed.', unreferenced: [] });
  });
});

describe('parseStructuredCompletion', () => {
  it('parses the JSON shape', () => {
    expect(parseStructuredCompletion('{"response":"Use {0}","snippets":["$a"]}')).toEqual({
      response: 'Use {0}',
      snippets: ['$a']
    });
  });

  it('strips a fence the model wrapped around a snippet anyway', () => {
    expect(
      parseStructuredCompletion(JSON.stringify({ response: '{0}', snippets: ['```bdscript\n$a\n$b\n```'] }))
    ).toEqual({ response: '{0}', snippets: ['$a\n$b'] });
  });

  it('falls back to raw text as prose on malformed JSON or null', () => {
    expect(parseStructuredCompletion('not json')).toEqual({ response: 'not json', snippets: [] });
    expect(parseStructuredCompletion(null)).toEqual({ response: 'I could not generate a response.', snippets: [] });
  });
});
