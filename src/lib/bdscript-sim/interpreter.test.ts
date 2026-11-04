import { describe, expect, it } from 'vitest';
import type { BdfdApiArgument } from '@lib/bdfd-ai/bdfd-api.js';
import type { BdscriptFunctionIndex } from '@lib/bdfd-ai/bdscript-function-index.js';
import { simulateBdscript } from './interpreter.js';
import type { SimContext, SimUser } from './types.js';

// --- fixtures: argument schemas copied from the BDFD public API -------------------------------

const req = (type = 'String', extra: Partial<BdfdApiArgument> = {}): BdfdApiArgument => ({
  name: 'arg',
  type,
  required: true,
  ...extra
});
const empty = (type = 'String') => req(type, { empty: true });
const opt = (type = 'String', extra: Partial<BdfdApiArgument> = {}) => req(type, { required: false, ...extra });
const num = 'Integer | Float';

const SCHEMAS: Record<string, (BdfdApiArgument[] | null)[]> = {
  nomention: [null],
  stop: [null],
  if: [[req()]],
  elseif: [[req()]],
  else: [null],
  endif: [null],
  try: [null],
  catch: [null],
  endtry: [null],
  error: [[req('Enum', { enumData: ['command', 'message', 'source', 'row', 'column'] })]],
  onlyIf: [[req(), empty()]],
  argsCheck: [[req('HowMany'), empty()]],
  and: [[req('String', { repeatable: true })]],
  checkCondition: [[req()]],
  c: [[empty()]],
  suppressErrors: [null, [empty()]],
  enableDecimals: [[req('Bool')]],
  message: [null, [req('String | HowMany'), opt()]],
  mentioned: [[req('HowMany'), opt('Bool')]],
  username: [null, [req('Snowflake')]],
  userAvatar: [[req('Snowflake')]],
  authorID: [null],
  sum: [[req(num, { repeatable: true })]],
  divide: [[req(num, { repeatable: true })]],
  sub: [[req(num, { repeatable: true })]],
  // A real function the simulator has no handler for.
  ping: [null],
  calculate: [[req()]],
  random: [null, [req(num), req(num)]],
  replaceText: [[empty(), empty(), empty(), opt('Integer')]],
  cropText: [[empty(), req('Integer'), empty()]],
  checkContains: [[empty(), empty(), empty()].map((a, i) => (i === 2 ? { ...a, repeatable: true } : a))],
  numberSeparator: [[req('Integer'), opt('String', { vacantable: true })]],
  textSplit: [[empty(), empty()]],
  getTextSplitLength: [null],
  splitText: [[req('HowMany')]],
  var: [[req(), opt('String', { empty: true })]],
  setVar: [[req(), empty(), opt('Snowflake')]],
  getVar: [[req(), opt('String | Snowflake', { empty: true })]],
  sendMessage: [[req(), opt('Bool')]],
  ban: [null, [req()]],
  title: [[empty(), opt('Integer')]],
  description: [[empty(), opt('Integer')]],
  color: [[empty('Color'), opt('Integer')]],
  footer: [[empty(), opt('Integer')]],
  addField: [[req(), req(), opt('Bool'), opt('Integer')]],
  addButton: [
    [
      req('Bool'),
      req('URL | String'),
      empty(),
      req('Enum', { enumData: ['primary', 'secondary', 'success', 'danger', 'link'] }),
      opt('Bool'),
      opt('Emoji'),
      opt('Snowflake')
    ]
  ],
  newSelectMenu: [[req(), req('Integer'), req('Integer'), opt(), opt('Snowflake')]],
  addSelectMenuOption: [[req(), req(), req(), empty(), opt('Bool'), opt('Emoji'), opt('Snowflake')]]
};

const index: BdscriptFunctionIndex = new Map(
  Object.entries(SCHEMAS).map(([name, variants]) => [name, { url: '', file: '', kind: 'function', variants }])
);

const author: SimUser = {
  id: '111111111111111111',
  username: 'oriel',
  displayName: 'Oriel',
  nickname: null,
  avatarUrl: 'https://cdn.discordapp.com/avatars/1/a.png'
};

function ctx(args = '', random = () => 0.5): SimContext {
  return {
    author,
    users: new Map([[author.id, author]]),
    channel: { id: '222222222222222222', name: 'general' },
    guild: { id: '333333333333333333', name: 'BDFD', memberCount: 42 },
    args,
    now: new Date('2026-01-01T00:00:00Z'),
    random
  };
}

const run = (code: string, args = '', random?: () => number) => simulateBdscript(code, ctx(args, random), index);

// --- tests ------------------------------------------------------------------------------------

describe('output', () => {
  it('evaluates functions inline and trims the response', () => {
    expect(run('$nomention\nHello $message!\n', 'world').content).toBe('Hello world!');
  });

  it('drops blank lines from the response, like BDFD (wiki text splitting example)', () => {
    const code = [
      '$nomention',
      '$textSplit[$message;]',
      'Characters: $getTextSplitLength',
      '$textSplit[$message; ]',
      'Words: $getTextSplitLength',
      '',
      '   ',
      'First word: $splitText[<]'
    ].join('\n');
    expect(run(code, 'Hello world!').content).toBe('Characters: 12\nWords: 2\nFirst word: Hello');
  });

  it('resolves escapes like BDFD', () => {
    expect(run('$nomention\n$title[a\\;b] %{DOL}%5 x%{-SEMICOL-}%y z%ESCAPED%').content).toBe('$5 x;y z]');
    expect(run('$nomention\n$title[a\\;b]').embeds[0]?.title).toBe('a;b');
  });

  it("notes the author mention BDFD adds without $nomention, but not when it's used", () => {
    expect(run('hi').notes.join()).toContain('$nomention');
    expect(run('$nomention hi').notes.join()).not.toContain('$nomention');
  });

  it('leaves names that are not BDFD functions as text', () => {
    const result = run('$nomention $usernme');
    expect(result.content).toBe('$usernme');
    expect(result.notes.join()).toContain("`$usernme` isn't a BDFD function");
  });

  it('does not run anything inside $c comments', () => {
    expect(run('$nomention $c[$sum[1;a]]ok').content).toBe('ok');
  });
});

describe('errors (wiki "Common BDFD Errors" + error handling examples)', () => {
  it('reports the type error at the closing bracket, exactly like BDFD', () => {
    expect(run('$nomention\n$sum[2;a]').content).toBe(
      "❌ Function `$sum` at `2:9` returned an error: expected integer in position 2, got 'a'"
    );
  });

  it('reports a missing required value', () => {
    expect(run('$sendMessage[]').content).toContain('expected valid value in position 1, got empty value');
  });

  it('reports too few arguments', () => {
    expect(run('$addButton[no]').content).toContain('expected at least 4 arguments, got 1');
  });

  it('reports a bad boolean, enum and button URL', () => {
    expect(run('$addButton[maybe;id;Label;danger]').content).toContain("expected boolean in position 1, got 'maybe'");
    expect(run('$addButton[no;id;Label;fancy]').content).toContain(
      "expected valid enum value in position 4, got 'fancy'"
    );
    expect(run('$addButton[no;not a url;Label;link]').content).toContain('Url in the button has to be valid');
  });

  it('treats an empty optional argument as an error', () => {
    expect(run('$description[Hello developer!;]').content).toContain(
      'expected valid value in position 2, got empty value'
    );
  });

  it('drops embeds and components when the command errors', () => {
    const result = run('$title[Hi]\n$sum[a]');
    expect(result.stoppedBy).toBe('error');
    expect(result.embeds).toEqual([]);
  });

  it('reports an unclosed $if', () => {
    expect(run('$if[1==1]\nyes').content).toBe('`$if` not closed with `$endif`');
  });

  it('replaces errors with the $suppressErrors message', () => {
    const result = run('$suppressErrors[oops]\n$sum[a]');
    expect(result.content).toBe('oops');
  });
});

describe('$try / $catch / $error', () => {
  it('runs $catch and exposes the error (wiki example)', () => {
    const code = [
      '$nomention',
      '$try',
      '  $description[Hello developer!;]',
      '$catch',
      '❌ An error has occurred!',
      'Function: $error[command]',
      'Error: $error[message]',
      '$endtry'
    ].join('\n');
    expect(run(code).content).toBe(
      '❌ An error has occurred!\nFunction: $description\nError: expected valid value in position 2, got empty value'
    );
  });

  it('stops inside $catch, and continues past $endtry when nothing failed (wiki example)', () => {
    const code = '$nomention\n$try\n  $sum[2;$message]\n$catch\n  $stop\n$endtry\nNumber: $message';
    expect(run(code, 'a').content).toBe('');
    expect(run(code, '5').content).toBe('7\nNumber: 5');
  });

  it('swallows the error with no $catch', () => {
    expect(run('$nomention\n$try\n$sum[2;a]\n$endtry').content).toBe('');
  });
});

describe('conditions', () => {
  const code = '$nomention\n$if[$message==a]\nA\n$elseif[$message>5]\nbig\n$else\nother\n$endif';

  it('takes the first true branch', () => {
    expect(run(code, 'a').content).toBe('A');
    expect(run(code, '9').content).toBe('big');
    expect(run(code, '1').content).toBe('other');
  });

  it('supports $and and $checkCondition', () => {
    expect(run('$nomention $and[1==1;2>1] $checkCondition[a!=a]').content).toBe('true false');
  });

  it('fails $onlyIf with its message and drops the rest of the response', () => {
    const result = run('$nomention\n$title[x]\n$onlyIf[$message==yes;Say yes!]\nok', 'no');
    expect(result).toMatchObject({ content: 'Say yes!', stoppedBy: 'onlyIf', embeds: [] });
  });

  it('checks argument counts with $argsCheck (wiki example)', () => {
    const code = '$nomention\n$argsCheck[>1;❌ Please provide something for me to say!]\n$message';
    expect(run(code, '').content).toBe('❌ Please provide something for me to say!');
    expect(run(code, 'Hello World!').content).toBe('Hello World!');
  });

  it('keeps output before $stop', () => {
    expect(run('$nomention\nbefore\n$stop\nafter')).toMatchObject({ content: 'before', stoppedBy: 'stop' });
  });
});

describe('text functions (wiki examples)', () => {
  it('$replaceText replaces once by default, all with -1', () => {
    const code =
      '$nomention\nResult 1: $replaceText[Hello world!;Hello;Bye]\nResult 2: $replaceText[Hello world!;ll;o;-1]\nResult 3: $replaceText[Hello world!;!;]';
    expect(run(code).content).toBe('Result 1: Bye world!\nResult 2: Heoo world!\nResult 3: Hello world');
  });

  it('$cropText counts characters, not UTF-16 units', () => {
    const text = 'Hello everyone! This message is very cool. 😎 We hope you enjoy coding in BDFD, bye!';
    expect(run('$nomention $cropText[$message;50;...]', text).content).toBe(
      'Hello everyone! This message is very cool. 😎 We ho...'
    );
  });

  it('$textSplit / $splitText with < and >', () => {
    const code = '$nomention\n$textSplit[hello world !; ]\n$splitText[<]|$splitText[2]|$splitText[>]';
    expect(run(code).content).toBe('hello|world|!');
  });

  it('$checkContains and $numberSeparator', () => {
    expect(run('$nomention $checkContains[$message;hi;hello]', 'hi bye').content).toBe('true');
    expect(run('$nomention $checkContains[$message;hi;hello]', 'bye').content).toBe('false');
    expect(run('$nomention $numberSeparator[2536000]').content).toBe('2,536,000');
  });

  it('$mentioned falls back to the author unless told not to', () => {
    expect(run('$nomention $mentioned[1]', 'hi <@444444444444444444>').content).toBe('444444444444444444');
    expect(run('$nomention $mentioned[1]', 'hi').content).toBe(author.id);
    expect(run('$nomention [$mentioned[1;no]]', 'hi').content).toBe('[]');
  });
});

describe('math', () => {
  it('drops decimals unless $enableDecimals[yes]', () => {
    expect(run('$nomention $divide[10;4]').content).toBe('2');
    expect(run('$nomention $enableDecimals[yes]$divide[10;4]').content).toBe('2.5');
  });

  it('$calculate follows precedence and refuses anything but arithmetic', () => {
    expect(run('$nomention $calculate[2+3*2**2]').content).toBe('14');
    expect(run('$nomention $calculate[process.exit()]').content).toContain('invalid expression');
  });

  it('$random excludes max, and rejects max <= min (wiki)', () => {
    expect(run('$nomention $random[1;6]', '', () => 0.999).content).toBe('5');
    expect(run('$nomention $random[5;5]').content).toContain("Maximal value can't be smaller than or equal to minimal");
  });

  it('notes the random value it used', () => {
    expect(run('$nomention $random').notes.join()).toContain('`$random` returned 5');
  });
});

describe('variables and side effects', () => {
  it('stores temp vars', () => {
    expect(run('$nomention $var[a;1]$var[a]').content).toBe('1');
  });

  it('logs persistent variable writes and reads them back in the same run', () => {
    const result = run('$nomention $setVar[money;5]$getVar[money]');
    expect(result.content).toBe('5');
    expect(result.sideEffects).toEqual(['Set global variable `money` to `5`']);
  });

  it("treats a persistent variable this run didn't set as unknown, not empty", () => {
    const result = run('$nomention [$getVar[money]] $sum[$getVar[money];1]');
    expect(result.content).toBe('[$getVar[money]] $sum[$getVar[money];1]');
    expect(result.stoppedBy).toBeUndefined();
    expect(result.notSimulated[0]).toContain("can't see");
  });

  it('logs moderation actions instead of performing them', () => {
    const result = run('$nomention $ban[spam]Banned!');
    expect(result.content).toBe('Banned!');
    expect(result.sideEffects).toEqual(['`$ban[spam]`']);
  });

  it('logs $sendMessage as a separate message', () => {
    expect(run('$nomention $sendMessage[hi]').sideEffects).toEqual(['Send a separate message: hi']);
  });
});

describe('context and unsupported calls', () => {
  it('uses the invoking user and channel', () => {
    expect(run('$nomention $username ($authorID)').content).toBe(`oriel (${author.id})`);
  });

  it('leaves calls it cannot resolve as written, and lists them', () => {
    const result = run('$nomention $userAvatar[999999999999999999]');
    expect(result.content).toBe('$userAvatar[999999999999999999]');
    expect(result.notSimulated[0]).toContain("isn't available in the simulator");
  });

  it('leaves real functions without a handler as written', () => {
    expect(run('$nomention ping: $ping')).toMatchObject({ content: 'ping: $ping', notSimulated: ['$ping'] });
  });

  it('leaves calls that depend on an unsimulated value as written, without false type errors', () => {
    const result = run('$nomention $sub[$ping;1] ms');
    expect(result.content).toBe('$sub[$ping;1] ms');
    expect(result.stoppedBy).toBeUndefined();
  });

  it('stops honestly when a condition depends on an unsimulated value', () => {
    const result = run('$nomention\nbefore\n$if[$ping>100]\nslow\n$endif\nafter');
    expect(result).toMatchObject({
      content: 'before',
      stoppedBy: 'unsupported',
      unsupportedReason: "`$if` depends on `$ping`, which the simulator can't evaluate"
    });
  });

  it('keeps variables and split text assigned from an unsimulated value unknown', () => {
    const result = run('$nomention\n$var[p;$ping]\n$var[p] / $sum[$var[p];1]');
    expect(result.content).toBe('$var[p] / $sum[$var[p];1]');
    expect(result.stoppedBy).toBeUndefined();
    expect(run('$nomention $var[p;$ping]$var[p;2]$var[p]').content).toBe('2');
    expect(run('$nomention $textSplit[$ping;,]$splitText[1]').content).toBe('$splitText[1]');
    expect(run('$nomention $setVar[x;$ping][$getVar[x]]').content).toBe('[$getVar[x]]');
  });

  it('stops when $onlyIf depends on an unsimulated value', () => {
    expect(run('$nomention $onlyIf[$ping<100;slow]ok').stoppedBy).toBe('unsupported');
  });
});

describe('embeds and components', () => {
  it('builds embeds by index and skips empty ones', () => {
    const code = '$nomention\n$title[One]\n$color[#ff0000]\n$addField[A;B;yes]\n$description[Two;2]\n$color[#00ff00;3]';
    const { embeds } = run(code);
    expect(embeds).toEqual([
      { title: 'One', color: 0xff0000, fields: [{ name: 'A', value: 'B', inline: true }] },
      { description: 'Two', fields: [] }
    ]);
  });

  it('puts buttons in rows and select options in their menu', () => {
    const code = [
      '$nomention',
      '$addButton[no;a;A;primary]',
      '$addButton[no;b;B;danger;yes]',
      '$addButton[yes;https://example.com;Site;link]',
      '$newSelectMenu[menu;1;1;Pick one]',
      '$addSelectMenuOption[menu;First;1;The first]'
    ].join('\n');
    const { components } = run(code);
    expect(components).toHaveLength(3);
    expect(components[0]).toMatchObject({ type: 'buttons', buttons: [{ id: 'a' }, { id: 'b', disabled: true }] });
    expect(components[1]).toMatchObject({ type: 'buttons', buttons: [{ style: 'link' }] });
    expect(components[2]).toMatchObject({ type: 'select', menu: { id: 'menu', options: [{ label: 'First' }] } });
  });

  it('reports an option for a menu that does not exist (wiki)', () => {
    expect(run('$addSelectMenuOption[nope;A;1;d]').content).toContain('Select menu not found');
  });
});
