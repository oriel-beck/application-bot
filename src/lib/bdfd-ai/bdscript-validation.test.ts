import { describe, expect, it } from 'vitest';
import type { BdfdApiArgument } from './bdfd-api.js';
import type { BdscriptFunctionIndex, BdscriptFunctionRecord } from './bdscript-function-index.js';
import {
  extractBdscriptFunctions,
  findArityIssues,
  findArityIssuesInSnippets,
  findCallbacksMisusedInSnippets,
  findEarlyClosedCalls,
  findEarlyClosedCallsInSnippets,
  findInvalidFunctions,
  flattenBdscriptCalls,
  lintBdscript,
  parseBdscript,
  repairBdscriptCode,
  suggestFunctionAlternatives
} from './bdscript-validation.js';

function rec(overrides: Partial<BdscriptFunctionRecord> = {}): BdscriptFunctionRecord {
  return { url: '', file: '', kind: 'function', ...overrides };
}

function indexFrom(entries: Record<string, BdscriptFunctionRecord>): BdscriptFunctionIndex {
  return new Map(Object.entries(entries));
}

function arg(name: string, required: boolean): BdfdApiArgument {
  return { name, type: 'String', required };
}

describe('extractBdscriptFunctions', () => {
  it('extracts unique $function names in order of first appearance', () => {
    expect(extractBdscriptFunctions('$message $var $message')).toEqual(['message', 'var']);
  });

  it('returns an empty array when there are none', () => {
    expect(extractBdscriptFunctions('just plain text')).toEqual([]);
  });
});

describe('findInvalidFunctions', () => {
  const index = indexFrom({ message: rec(), var: rec() });

  it('flags names not present in the index', () => {
    expect(findInvalidFunctions('$message $fooBar', index)).toEqual(['fooBar']);
  });

  it('returns nothing when every name is known', () => {
    expect(findInvalidFunctions('$message $var', index)).toEqual([]);
  });
});

describe('parseBdscript / flattenBdscriptCalls', () => {
  it('parses nested calls, including a bare call used as a nested argument', () => {
    const calls = flattenBdscriptCalls(parseBdscript('$var[ID;$sendMessage[$toLowercase[$message];yes]]'));
    expect(calls).toEqual([
      { name: 'var', hasBrackets: true, argCount: 2, closedEarly: false },
      { name: 'sendMessage', hasBrackets: true, argCount: 2, closedEarly: false },
      { name: 'toLowercase', hasBrackets: true, argCount: 1, closedEarly: false },
      { name: 'message', hasBrackets: false, argCount: 0, closedEarly: false }
    ]);
  });

  it('treats escaped `;` and `]` as literal text, not argument separators', () => {
    const escaped = `format ${'\\'};here ${'\\'}]end`;
    const calls = flattenBdscriptCalls(parseBdscript(`$argsCheck[2;${escaped}]`));
    expect(calls).toEqual([{ name: 'argsCheck', hasBrackets: true, argCount: 2, closedEarly: false }]);
  });

  it('closes the call at the first unescaped `]`, as BDFD does, and flags it as closed early', () => {
    const nodes = parseBdscript('$argsCheck[2;Use [@user] [amount]]');
    expect(nodes).toEqual([
      {
        type: 'call',
        name: 'argsCheck',
        hasBrackets: true,
        args: [[{ type: 'text', value: '2' }], [{ type: 'text', value: 'Use [@user' }]],
        closedEarly: true,
        unclosed: false,
        start: 0,
        end: 24
      },
      { type: 'text', value: ' [amount]]' }
    ]);
    expect(findEarlyClosedCalls(flattenBdscriptCalls(nodes))).toEqual(['argsCheck']);
  });

  it('keeps escaped placeholder brackets inside the argument', () => {
    const nodes = parseBdscript('$argsCheck[2;Use [@user\\] [amount\\]]');
    expect(nodes).toEqual([
      {
        type: 'call',
        name: 'argsCheck',
        hasBrackets: true,
        args: [[{ type: 'text', value: '2' }], [{ type: 'text', value: 'Use [@user] [amount]' }]],
        closedEarly: false,
        unclosed: false,
        start: 0,
        end: 36
      }
    ]);
    expect(findEarlyClosedCalls(flattenBdscriptCalls(nodes))).toEqual([]);
  });

  it('counts an unescaped trailing `;` as an extra (empty) argument, but not an escaped one', () => {
    expect(flattenBdscriptCalls(parseBdscript('$argsCheck[2;hi there;]'))[0]!.argCount).toBe(3);
    expect(flattenBdscriptCalls(parseBdscript('$argsCheck[2;hi there\\;]'))[0]!.argCount).toBe(2);
  });

  it('closes only the innermost call at an unescaped `]` inside a nested call', () => {
    const calls = flattenBdscriptCalls(parseBdscript('$sendMessage[$replaceText[a [b];c;d];no]'));
    expect(calls).toEqual([
      { name: 'sendMessage', hasBrackets: true, argCount: 3, closedEarly: false },
      { name: 'replaceText', hasBrackets: true, argCount: 1, closedEarly: true }
    ]);
  });

  it('treats a bare call with no brackets as zero arguments', () => {
    const calls = flattenBdscriptCalls(parseBdscript('$nomention\n$message\n$authorID'));
    expect(calls).toEqual([
      { name: 'nomention', hasBrackets: false, argCount: 0, closedEarly: false },
      { name: 'message', hasBrackets: false, argCount: 0, closedEarly: false },
      { name: 'authorID', hasBrackets: false, argCount: 0, closedEarly: false }
    ]);
  });

  it('treats empty brackets `$fn[]` as zero arguments, not one empty-string argument', () => {
    const calls = flattenBdscriptCalls(parseBdscript('$timeout[]'));
    expect(calls).toEqual([{ name: 'timeout', hasBrackets: true, argCount: 0, closedEarly: false }]);
  });

  it('produces no false positives on a real, correct multi-function script', () => {
    const script = [
      '$nomention',
      '$var[user;$message[user]]',
      '$if[$checkUserPerms[$authorID;moderatemembers]==false]',
      'nope $stop $endif',
      'You timed out $username[$var[user]] for $var[time]!',
      '$timeout[$var[time];$var[user]]'
    ].join('\n');

    const index = indexFrom({
      var: rec({ variants: [[arg('Name', true), arg('Value', false)]] }),
      message: rec({
        variants: [null, [arg('Argument number', true), arg('Argument name', false)]]
      })
    });

    const issues = findArityIssues(flattenBdscriptCalls(parseBdscript(script)), index);
    expect(issues).toEqual([]);
  });
});

describe('findArityIssues', () => {
  const index = indexFrom({
    var: rec({ variants: [[arg('Name', true), arg('Value', false)]] }),
    message: rec({
      variants: [null, [arg('Argument number', true), arg('Argument name', false)]]
    }),
    untyped: rec() // no `variants` — nothing to check against
  });

  it('flags a call with too many arguments for every known overload', () => {
    const issues = findArityIssues(flattenBdscriptCalls(parseBdscript('$var[a;b;c]')), index);
    expect(issues).toEqual([{ name: 'var', argCount: 3, expected: ['1-2 argument(s) (Name, Value)'] }]);
  });

  it('accepts any number of a repeatable argument, but still needs the required ones', () => {
    const sumIndex = indexFrom({ sum: rec({ variants: [[{ ...arg('number', true), repeatable: true }]] }) });
    expect(findArityIssues(flattenBdscriptCalls(parseBdscript('$sum[1;2;3;4]')), sumIndex)).toEqual([]);
    expect(findArityIssues(flattenBdscriptCalls(parseBdscript('$sum[]')), sumIndex)).toEqual([
      { name: 'sum', argCount: 0, expected: ['at least 1 argument(s) (number...)'] }
    ]);
  });

  it('accepts a call that fits one of several overloads (bare or bracketed $message)', () => {
    expect(findArityIssues(flattenBdscriptCalls(parseBdscript('$message')), index)).toEqual([]);
    expect(findArityIssues(flattenBdscriptCalls(parseBdscript('$message[reason]')), index)).toEqual([]);
  });

  it('flags a call that fits none of the overloads', () => {
    const issues = findArityIssues(flattenBdscriptCalls(parseBdscript('$message[1;2;3]')), index);
    expect(issues).toEqual([
      { name: 'message', argCount: 3, expected: ['no arguments', '1-2 argument(s) (Argument number, Argument name)'] }
    ]);
  });

  it('flags an unescaped trailing `;` in $argsCheck, and accepts the escaped form', () => {
    const argsCheck = indexFrom({
      argsCheck: rec({ variants: [[arg('Condition', true), arg('Error message', true)]] })
    });
    expect(findArityIssues(flattenBdscriptCalls(parseBdscript('$argsCheck[2;hi there;]')), argsCheck)).toEqual([
      { name: 'argsCheck', argCount: 3, expected: ['2 argument(s) (Condition, Error message)'] }
    ]);
    expect(findArityIssues(flattenBdscriptCalls(parseBdscript('$argsCheck[2;hi there\\;]')), argsCheck)).toEqual([]);
  });

  it('skips names with no variants schema rather than guessing', () => {
    expect(findArityIssues(flattenBdscriptCalls(parseBdscript('$untyped[a;b;c;d;e]')), index)).toEqual([]);
  });
});

describe('findArityIssuesInSnippets', () => {
  const index = indexFrom({
    var: rec({ variants: [[arg('Name', true), arg('Value', false)]] })
  });

  it('flags only the genuinely-wrong snippet across a multi-snippet batch', () => {
    const issues = findArityIssuesInSnippets(['$var[a;b]', '$var[a;b;c]'], index);
    expect(issues).toEqual([{ name: 'var', argCount: 3, expected: ['1-2 argument(s) (Name, Value)'] }]);
  });

  it('dedupes repeated issues for the same name across snippets', () => {
    const issues = findArityIssuesInSnippets(['$var[a;b;c]', '$var[x;y;z]'], index);
    expect(issues).toHaveLength(1);
  });
});

describe('findCallbacksMisusedInSnippets', () => {
  const index = indexFrom({
    onJoined: rec({ kind: 'callback' }),
    message: rec({ kind: 'function' })
  });

  it('flags a callback mixed with a function in the same snippet', () => {
    expect(findCallbacksMisusedInSnippets(['$onJoined[channelID]\n$message'], index)).toEqual(['onJoined']);
  });

  it('does not flag a callback alone in its own snippet (valid trigger example)', () => {
    expect(findCallbacksMisusedInSnippets(['$onJoined[channelID]'], index)).toEqual([]);
  });
});

describe('repairBdscriptCode', () => {
  it('escapes an unescaped placeholder bracket inside a function argument', () => {
    expect(repairBdscriptCode('$argsCheck[2;format [@user] [amount]]')).toBe(
      '$argsCheck[2;format [@user\\] [amount\\]]'
    );
  });

  it('produces code the parser no longer flags as closed early', () => {
    const snippet = '$argsCheck[2;Use [@user] [amount]]';
    expect(findEarlyClosedCallsInSnippets([snippet])).toEqual(['argsCheck']);
    expect(findEarlyClosedCallsInSnippets([repairBdscriptCode(snippet)])).toEqual([]);
  });

  it('is idempotent on already-escaped text', () => {
    const once = repairBdscriptCode('$argsCheck[2;format [@user] [amount]]');
    expect(repairBdscriptCode(once)).toBe(once);
  });
});

describe('lintBdscript', () => {
  const index = indexFrom({
    argsCheck: rec({ variants: [[arg('Condition', true), arg('Error message', true)]] }),
    var: rec({ variants: [[arg('Name', true), arg('Value', false)]] }),
    charCount: rec({ variants: [[arg('Text', false)]] })
  });

  it('returns nothing for correctly escaped code', () => {
    expect(lintBdscript('$argsCheck[2;Use [@user\\] [amount\\]]\n$var[a;b\\;c]', index)).toEqual([]);
  });

  it('reports an early `]` close with its line and column', () => {
    expect(lintBdscript('hello\n  $argsCheck[2;Use [@user] [amount]]', index)).toEqual([
      expect.objectContaining({ kind: 'closed-early', name: 'argsCheck', line: 2, column: 3 })
    ]);
  });

  it('reports a trailing unescaped `;` as an argument-count problem', () => {
    expect(lintBdscript('$argsCheck[2;hi there;]', index)).toEqual([
      expect.objectContaining({ kind: 'arity', name: 'argsCheck', line: 1, column: 1 })
    ]);
  });

  it('reports unknown functions with a suggestion', () => {
    const [diagnostic] = lintBdscript('$length[abc]', index);
    expect(diagnostic).toMatchObject({ kind: 'unknown-function', name: 'length' });
    expect(diagnostic!.message).toContain('$charCount');
  });

  it('reports an unclosed call', () => {
    expect(lintBdscript('$var[a;b', index)).toEqual([expect.objectContaining({ kind: 'unclosed', name: 'var' })]);
  });

  it('reports every offending call, including nested ones, in source order', () => {
    const diagnostics = lintBdscript('$var[$fooBar[x];1;2]', index);
    expect(diagnostics.map((d) => [d.kind, d.name, d.column])).toEqual([
      ['arity', 'var', 1],
      ['unknown-function', 'fooBar', 6]
    ]);
  });
});

describe('suggestFunctionAlternatives', () => {
  const index = indexFrom({
    charCount: rec(),
    title: rec(),
    message: rec(),
    userAvatar: rec(),
    onJoined: rec({ kind: 'callback' })
  });

  it('suggests the closest name for a transposition / missing-letter typo', () => {
    expect(suggestFunctionAlternatives(['mesage', 'mesasge'], index)).toEqual(
      new Map([
        ['mesage', ['message']],
        ['mesasge', ['message']]
      ])
    );
  });

  it('suggests a name that contains what was typed', () => {
    expect(suggestFunctionAlternatives(['avatar'], index).get('avatar')).toEqual(['userAvatar']);
  });

  it('uses the hallucination alias table, and suggests nothing for unrelated names', () => {
    const suggestions = suggestFunctionAlternatives(['lenght', 'length', 'zzzzzz'], index);
    expect(suggestions.get('length')).toEqual(['charCount']);
    // Aliases are exact-match only: they redirect known AI hallucinations, they aren't real names to fuzzy-match.
    expect(suggestions.has('lenght')).toBe(false);
    expect(suggestions.has('zzzzzz')).toBe(false);
  });

  it('never suggests a callback as a reply-code function', () => {
    expect(suggestFunctionAlternatives(['onJoin'], index).has('onJoin')).toBe(false);
  });
});
