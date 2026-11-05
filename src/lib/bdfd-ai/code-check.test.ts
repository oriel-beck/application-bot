import { describe, expect, it } from 'vitest';
import type { BdfdApiArgument } from './bdfd-api.js';
import type { BdscriptFunctionIndex } from './bdscript-function-index.js';
import {
  escapeCodeBlocks,
  extractCodeBlocks,
  findAnswerProblems,
  formatCodeCheckResults,
  hasAnswerProblems
} from './code-check.js';

const arg = (name: string, required = true): BdfdApiArgument => ({ name, type: 'String', required });

const testIndex: BdscriptFunctionIndex = new Map([
  ['nomention', { url: '', file: '', kind: 'function', variants: [null] }],
  ['argsCheck', { url: '', file: '', kind: 'function', variants: [[arg('Argument count'), arg('Error message')]] }],
  ['charCount', { url: '', file: '', kind: 'function', variants: [[arg('Text')]] }],
  ['message', { url: '', file: '', kind: 'function', variants: [null, [arg('n'), arg('name', false)]] }],
  ['onJoined', { url: '', file: 'api/bdfd/callback/onJoined', kind: 'callback', variants: [[arg('Channel ID')]] }]
]);

describe('extractCodeBlocks', () => {
  it('returns each fenced block body, with or without a language tag', () => {
    const md = 'Try this:\n```\n$nomention\n$message\n```\nor\n```bdscript\n$charCount[hi]\n```';
    expect(extractCodeBlocks(md)).toEqual(['$nomention\n$message', '$charCount[hi]']);
  });

  it('ignores inline code', () => {
    expect(extractCodeBlocks('Use `$message` here.')).toEqual([]);
  });
});

describe('escapeCodeBlocks', () => {
  it('escapes placeholder brackets inside code blocks only', () => {
    const md = 'Usage `[@user]`:\n```\n$argsCheck[2;Use [@user] [amount]]\n```';
    expect(escapeCodeBlocks(md)).toBe('Usage `[@user]`:\n```\n$argsCheck[2;Use [@user\\] [amount\\]]\n```');
  });

  it('leaves correct code untouched', () => {
    const md = '```\n$nomention\n$charCount[hi]\n```';
    expect(escapeCodeBlocks(md)).toBe(md);
  });
});

describe('findAnswerProblems', () => {
  it('passes a clean answer', () => {
    const problems = findAnswerProblems('Use `$charCount`:\n```\n$charCount[$message]\n```', testIndex);
    expect(hasAnswerProblems(problems)).toBe(false);
  });

  it('flags invented names in the prose as well as the code', () => {
    expect(findAnswerProblems('You could also use `$length`.', testIndex).invalidNames).toEqual(['length']);
  });

  it('flags wrong argument counts, early-closed calls and callbacks in reply code', () => {
    const problems = findAnswerProblems(
      '```\n$charCount[a;b]\n```\n```\n$onJoined[123]\n$charCount[x]\n```',
      testIndex
    );
    expect(problems.arityIssues.map((i) => i.name)).toEqual(['charCount']);
    expect(problems.misusedCallbacks).toEqual(['onJoined']);
  });
});

describe('formatCodeCheckResults', () => {
  it('reports each code separately, with line and column', () => {
    const out = formatCodeCheckResults(
      ['$nomention\n$charCount[hi]', '$nomention\n$charCount[a;b]\n$lenght[x]'],
      testIndex
    );
    expect(out).toContain('Code 1: no problems found.');
    expect(out).toContain('Code 2: 2 problem(s):');
    expect(out).toContain('- line 2:1 — `$charCount` got 2 argument(s)');
    expect(out).toMatch(/- line 3:1 — `\$lenght` is not a BDScript function/);
  });

  it('reports callbacks mixed into reply code', () => {
    expect(formatCodeCheckResults(['$onJoined[1]\n$charCount[x]'], testIndex)).toContain(
      '`$onJoined` is a callback (command trigger only)'
    );
  });
});
