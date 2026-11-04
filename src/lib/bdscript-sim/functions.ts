import { isBool, isInteger, isNumber, parseBool } from './arguments.js';
import { calculate } from './calculate.js';
import { FailSignal, NotSimulatedSignal, ResponseSignal, StopSignal } from './signals.js';
import type {
  BdfdFunctionError,
  SimButtonStyle,
  SimComponentRow,
  SimContext,
  SimEmbed,
  SimSelectMenu,
  SimUser
} from './types.js';

export interface SimState {
  embeds: Map<number, SimEmbed>;
  rows: SimComponentRow[];
  tempVars: Map<string, string>;
  /** Persistent variables, keyed `<scope>:<id>:<name>`. Start empty; writes are logged. */
  vars: Map<string, string>;
  split: string[] | null;
  /**
   * Values that were assigned from something not simulated, keyed `temp:<name>` / `var:<name>`
   * (persistent variables by name only, across scopes) or `split`, mapped to that function.
   * Reading one is unknown too, rather than a wrong "empty".
   */
  unknown: Map<string, string>;
  decimals: boolean;
  /** `undefined` = off; otherwise the message that replaces any error. */
  suppressErrors: string | undefined;
  nomention: boolean;
  lastError: BdfdFunctionError | null;
  sideEffects: string[];
  notSimulated: string[];
  notes: string[];
}

export interface CallEnv {
  name: string;
  /** Evaluated arguments; already checked against the API schema. */
  args: string[];
  bare: boolean;
  /** The call with its evaluated arguments, e.g. `$kick[123;spam]` — for the side-effect log. */
  call: string;
  ctx: SimContext;
  state: SimState;
  evaluateCondition(condition: string): boolean;
}

export type Handler = (env: CallEnv) => string | void;

const MAX_EMBEDS = 10;
const MAX_ROWS = 5;
const MAX_BUTTONS_PER_ROW = 5;

const fail = (reason: string): never => {
  throw new FailSignal(reason);
};

const notSimulated = (reason: string): never => {
  throw new NotSimulatedSignal(reason);
};

/** `''` and missing are the same for optional arguments. */
function opt(args: string[], i: number): string | undefined {
  const value = args[i];
  return value === undefined || value === '' ? undefined : value;
}

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** `<` = first, `>` = last, otherwise a 1-based index. `undefined` when out of range. */
function pick<T>(list: T[], selector: string): T | undefined {
  if (selector === '<') return list[0];
  if (selector === '>') return list[list.length - 1];
  const n = Number(selector.replace(/[<>]/g, ''));
  return Number.isInteger(n) && n >= 1 ? list[n - 1] : undefined;
}

/** Math results are whole numbers unless `$enableDecimals[yes]` ran first. */
function formatNumber(state: SimState, value: number): string {
  if (!Number.isFinite(value)) return fail('result is not a finite number');
  if (!state.decimals) return String(Math.trunc(value));
  return String(Number(value.toFixed(10)));
}

function numbers(args: string[]): number[] {
  return args.map((a, i) => (isNumber(a) ? Number(a) : fail(`expected integer in position ${i + 1}, got '${a}'`)));
}

function user(ctx: SimContext, id: string | undefined): SimUser {
  if (id === undefined) return ctx.author;
  return ctx.users.get(id) ?? notSimulated(`user ${id} isn't available in the simulator`);
}

function embedAt(state: SimState, index: string | undefined): SimEmbed {
  const n = index === undefined ? 1 : Number(index);
  if (!Number.isInteger(n) || n < 1 || n > MAX_EMBEDS) fail(`embed index must be between 1 and ${MAX_EMBEDS}`);
  let embed = state.embeds.get(n);
  if (!embed) {
    embed = { fields: [] };
    state.embeds.set(n, embed);
  }
  return embed;
}

/** `$title[Text;(Index)]`-shaped setters. */
function embedSetter(apply: (embed: SimEmbed, value: string) => void): Handler {
  return ({ args, state }) => {
    apply(embedAt(state, opt(args, 1)), args[0] ?? '');
  };
}

function parseColor(value: string): number | undefined {
  if (value === '') return undefined;
  const hex = /^#?([0-9a-f]{6})$/i.exec(value);
  if (hex) return parseInt(hex[1]!, 16);
  if (isInteger(value)) return Number(value);
  return fail(`expected color in position 1, got '${value}'`);
}

function splitList(state: SimState): string[] {
  const dep = state.unknown.get('split');
  if (dep) notSimulated(`the split text came from \`${dep}\``);
  if (!state.split) fail('no text was split — use `$textSplit` first');
  return state.split!;
}

function splitIndex(list: string[], value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > list.length) fail(`index ${value} is out of range (1-${list.length})`);
  return n - 1;
}

const MENTION = /<@!?(\d+)>/g;
const ANY_MENTION = /<(@[!&]?|#)\d+>/g;

/**
 * Persistent variables: one this run hasn't set is unknown, not empty — its value (or default)
 * lives in the user's BDFD app, and guessing `''` would turn `$sum[$getUserVar[x];1]` into a
 * false error.
 */
function readVar(state: SimState, scope: string, id: string, name: string): string {
  const dep = state.unknown.get(`var:${name}`);
  if (dep) notSimulated(`\`${name}\` was set from \`${dep}\``);
  const value = state.vars.get(`${scope}:${id}:${name}`);
  if (value !== undefined) return value;
  return notSimulated(`variable \`${name}\` is stored in your bot, which the simulator can't see`);
}

function writeVar(state: SimState, label: string, scope: string, id: string, name: string, value: string): void {
  state.unknown.delete(`var:${name}`);
  state.vars.set(`${scope}:${id}:${name}`, value);
  state.sideEffects.push(`Set ${label} variable \`${name}\` to \`${value}\``);
}

function randomInt(ctx: SimContext, min: number, max: number): number {
  return min + Math.floor(ctx.random() * (max - min));
}

/** Discord actions the simulator logs instead of performing. */
const SIDE_EFFECTS = [
  'ban',
  'banID',
  'kick',
  'kickMention',
  'giveRole',
  'roleGrant',
  'takeRole',
  'timeout',
  'deleteIn',
  'addReactions',
  'addCmdReactions',
  'clear',
  'createChannel',
  'pinMessage',
  'reply',
  'replyIn',
  'botTyping',
  'removeContains',
  'resetUserVar',
  'removeButtons',
  'removeAllComponents',
  'channelSendMessage',
  'useChannel',
  'dm'
];

/**
 * Functions whose output is always empty — they only *do* something. When one can't be
 * simulated, it outputs nothing (as in BDFD) instead of its code; `$var` only when setting.
 */
export const STATEMENT_FUNCTIONS: ReadonlySet<string> = new Set([
  ...SIDE_EFFECTS,
  'textSplit',
  'editSplitText',
  'removeSplitTextElement',
  'setVar',
  'setUserVar',
  'setServerVar',
  'setChannelVar',
  'title',
  'description',
  'footer',
  'footerIcon',
  'thumbnail',
  'image',
  'author',
  'authorIcon',
  'authorURL',
  'embeddedURL',
  'color',
  'addField',
  'addTimestamp',
  'addButton',
  'newSelectMenu',
  'addSelectMenuOption',
  'nomention',
  'enableDecimals',
  'cooldown',
  'globalCooldown',
  'serverCooldown'
]);

const sideEffect: Handler = ({ call, state }) => {
  state.sideEffects.push(`\`${call}\``);
};

const BUTTON_STYLES: readonly SimButtonStyle[] = ['primary', 'secondary', 'success', 'danger', 'link'];

export const FUNCTIONS: Record<string, Handler> = {
  ...Object.fromEntries(SIDE_EFFECTS.map((name) => [name, sideEffect])),

  // --- control -------------------------------------------------------------------------------
  stop: () => {
    throw new StopSignal();
  },
  onlyIf: ({ args, evaluateCondition }) => {
    if (!evaluateCondition(args[0] ?? '')) throw new ResponseSignal(args[1] ?? '', 'onlyIf');
  },
  argsCheck: ({ args, ctx }) => {
    const count = words(ctx.args).length;
    const spec = args[0] ?? '';
    const n = Number(spec.replace(/[<>]/g, ''));
    // `>3` = 3 or more, `<3` = fewer than 3, `3` = exactly 3 (per the wiki).
    const ok = spec.startsWith('>') ? count >= n : spec.startsWith('<') ? count < n : count === n;
    if (!ok) throw new ResponseSignal(args[1] ?? '', 'argsCheck');
  },
  checkCondition: ({ args, evaluateCondition }) => String(evaluateCondition(args[0] ?? '')),
  and: ({ args, evaluateCondition }) => String(args.every((c) => evaluateCondition(c))),
  or: ({ args, evaluateCondition }) => String(args.some((c) => evaluateCondition(c))),
  suppressErrors: ({ args, state }) => {
    state.suppressErrors = args[0] ?? '';
  },
  error: ({ args, state }) => {
    const err = state.lastError;
    if (!err) return '';
    switch (args[0]) {
      case 'command':
        return `$${err.fn}`;
      case 'message':
        return err.reason;
      case 'source':
        return err.sourceLine;
      case 'row':
        return String(err.row);
      case 'column':
        return String(err.column);
      default:
        return fail(`expected valid enum value in position 1, got '${args[0]}'`);
    }
  },
  nomention: ({ state }) => {
    state.nomention = true;
  },
  allowMention: () => {},
  allowUserMentions: () => {},
  allowRoleMentions: () => {},
  enableDecimals: ({ args, state }) => {
    state.decimals = parseBool(args[0] ?? 'no');
  },
  cooldown: ({ call, state }) => {
    state.sideEffects.push(`\`${call}\` — starts a cooldown (a first run never hits it)`);
  },
  globalCooldown: ({ call, state }) => {
    state.sideEffects.push(`\`${call}\` — starts a cooldown (a first run never hits it)`);
  },
  serverCooldown: ({ call, state }) => {
    state.sideEffects.push(`\`${call}\` — starts a cooldown (a first run never hits it)`);
  },
  sendMessage: ({ args, state }) => {
    state.sideEffects.push(`Send a separate message: ${args[0]}`);
    if (args[1] && parseBool(args[1])) notSimulated('a real message ID only exists once the message is sent');
  },

  // --- context -------------------------------------------------------------------------------
  authorID: ({ ctx }) => ctx.author.id,
  username: ({ args, ctx }) => user(ctx, opt(args, 0)).username,
  displayName: ({ args, ctx }) => user(ctx, opt(args, 0)).displayName,
  nickname: ({ args, ctx }) => user(ctx, opt(args, 0)).nickname ?? notSimulated('this user has no server nickname'),
  authorAvatar: ({ ctx }) => ctx.author.avatarUrl,
  userAvatar: ({ args, ctx }) => user(ctx, opt(args, 0)).avatarUrl,
  channelID: ({ bare, ctx }) => (bare ? ctx.channel.id : notSimulated('looking up other channels by name')),
  channelName: ({ args, ctx }) =>
    args[0] === ctx.channel.id ? ctx.channel.name : notSimulated('only the current channel is available'),
  serverName: ({ args, ctx }) =>
    !opt(args, 0) || args[0] === ctx.guild.id ? ctx.guild.name : notSimulated('only the current server is available'),
  guildID: ({ bare, ctx }) => (bare ? ctx.guild.id : notSimulated('looking up servers by name')),
  membersCount: ({ bare, ctx }) => (bare ? String(ctx.guild.memberCount) : notSimulated('presence-filtered counts')),
  getTimestamp: ({ args, ctx }) => {
    const unit = opt(args, 0);
    if (unit === undefined || unit === 's') return String(Math.floor(ctx.now.getTime() / 1000));
    if (unit === 'ms') return String(ctx.now.getTime());
    return notSimulated(`time unit '${unit}'`);
  },
  message: ({ args, bare, ctx }) => {
    if (bare) return ctx.args;
    if (opt(args, 1) !== undefined || !/^([<>]|\d+)$/.test(args[0] ?? '')) {
      return notSimulated('slash command options — the simulator runs as a prefix command');
    }
    return pick(words(ctx.args), args[0]!) ?? '';
  },
  noMentionMessage: ({ args, bare, ctx }) => {
    const text = ctx.args.replace(ANY_MENTION, '');
    return bare ? text : (pick(words(text), args[0] ?? '') ?? '');
  },
  mentioned: ({ args, ctx }) => {
    const ids = [...ctx.args.matchAll(MENTION)].map((m) => m[1]!);
    const returnAuthor = opt(args, 1) === undefined || parseBool(args[1]!);
    return pick(ids, args[0] ?? '1') ?? (returnAuthor ? ctx.author.id : '');
  },
  argCount: ({ args }) => String(words(args[0] ?? '').length),

  // --- text ----------------------------------------------------------------------------------
  toLowercase: ({ args }) => (args[0] ?? '').toLowerCase(),
  toUppercase: ({ args }) => (args[0] ?? '').toUpperCase(),
  toTitleCase: ({ args }) =>
    (args[0] ?? '').replace(/(^|\s)(\S)/g, (_m, space: string, ch: string) => space + ch.toUpperCase()),
  charCount: ({ args }) => String([...(args[0] ?? '')].length),
  linesCount: ({ args }) => String((args[0] ?? '').split('\n').length),
  trimSpace: ({ args }) => (args[0] ?? '').trim(),
  replaceText: ({ args }) => {
    const [text = '', sample = '', replacement = ''] = args;
    const amount = opt(args, 3) === undefined ? 1 : Number(args[3]);
    if (!sample) return text;
    if (amount < 0) return text.split(sample).join(replacement);
    let out = text;
    let from = 0;
    for (let n = 0; n < amount; n++) {
      const at = out.indexOf(sample, from);
      if (at === -1) break;
      out = out.slice(0, at) + replacement + out.slice(at + sample.length);
      from = at + replacement.length;
    }
    return out;
  },
  cropText: ({ args }) => {
    const chars = [...(args[0] ?? '')];
    const max = Number(args[1]);
    return chars.length > max ? chars.slice(0, max).join('') + (args[2] ?? '') : chars.join('');
  },
  repeatMessage: ({ args }) => {
    const amount = Number(args[0]);
    if (amount > 10) fail('amount must be 10 or less');
    return (args[1] ?? '').repeat(Math.max(0, amount));
  },
  checkContains: ({ args }) => String(args.slice(1).some((phrase) => (args[0] ?? '').includes(phrase))),
  isNumber: ({ args }) => String(isNumber(args[0] ?? '')),
  isInteger: ({ args }) => String(isInteger(args[0] ?? '')),
  isBoolean: ({ args }) => String(isBool(args[0] ?? '')),
  numberSeparator: ({ args }) => {
    const separator = args[1] ?? ',';
    return (args[0] ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  },
  url: ({ args }) => {
    const text = args[1] ?? '';
    if (args[0]?.toLowerCase() === 'encode') return new URLSearchParams({ q: text }).toString().slice(2);
    try {
      return decodeURIComponent(text.replace(/\+/g, ' '));
    } catch {
      return fail(`invalid URL-encoded text '${text}'`);
    }
  },
  randomText: ({ args, ctx, state }) => {
    const choice = args[Math.floor(ctx.random() * args.length)] ?? '';
    state.notes.push(`\`$randomText\` picked \`${choice}\` this run.`);
    return choice;
  },

  // --- text splitting ------------------------------------------------------------------------
  textSplit: ({ args, state }) => {
    const [text = '', separator = ''] = args;
    state.split = separator ? text.split(separator) : [...text];
    state.unknown.delete('split');
  },
  splitText: ({ args, state }) => pick(splitList(state), args[0] ?? '') ?? '',
  getTextSplitLength: ({ state }) => String(splitList(state).length),
  joinSplitText: ({ args, state }) => splitList(state).join(args[0] ?? ''),
  editSplitText: ({ args, state }) => {
    const list = splitList(state);
    list[splitIndex(list, args[0] ?? '')] = args[1] ?? '';
  },
  removeSplitTextElement: ({ args, state }) => {
    const list = splitList(state);
    list.splice(splitIndex(list, args[0] ?? ''), 1);
  },
  getTextSplitIndex: ({ args, state }) => String(splitList(state).indexOf(args[0] ?? '') + 1 || -1),

  // --- math ----------------------------------------------------------------------------------
  sum: ({ args, state }) =>
    formatNumber(
      state,
      numbers(args).reduce((a, b) => a + b)
    ),
  sub: ({ args, state }) =>
    formatNumber(
      state,
      numbers(args).reduce((a, b) => a - b)
    ),
  multi: ({ args, state }) =>
    formatNumber(
      state,
      numbers(args).reduce((a, b) => a * b)
    ),
  divide: ({ args, state }) => {
    const [first, ...rest] = numbers(args);
    if (rest.includes(0)) fail('division by zero');
    return formatNumber(
      state,
      rest.reduce((a, b) => a / b, first!)
    );
  },
  modulo: ({ args, state }) => {
    const [a, b] = numbers(args);
    if (b === 0) fail('division by zero');
    return formatNumber(state, a! % b!);
  },
  calculate: ({ args, state }) => {
    try {
      return formatNumber(state, calculate(args[0] ?? ''));
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'invalid expression');
    }
  },
  round: ({ args }) => {
    const [value] = numbers(args.slice(0, 1));
    const places = Number(opt(args, 1) ?? 0);
    return String(Number(value!.toFixed(places)));
  },
  ceil: ({ args }) => String(Math.ceil(numbers(args)[0]!)),
  floor: ({ args }) => String(Math.floor(numbers(args)[0]!)),
  sqrt: ({ args, state }) => formatNumber(state, Math.sqrt(numbers(args)[0]!)),
  min: ({ args }) => String(Math.min(...numbers(args))),
  max: ({ args }) => String(Math.max(...numbers(args))),
  random: ({ args, bare, ctx, state }) => {
    let value: string;
    if (bare) {
      value = String(randomInt(ctx, 0, 10));
    } else {
      const [min, max] = numbers(args);
      if (max! <= min!) fail("Maximal value can't be smaller than or equal to minimal");
      value = state.decimals
        ? String(Number((min! + ctx.random() * (max! - min!)).toFixed(3)))
        : String(randomInt(ctx, Math.ceil(min!), Math.ceil(max!)));
    }
    state.notes.push(`\`$random\` returned ${value} this run.`);
    return value;
  },

  // --- variables -----------------------------------------------------------------------------
  var: ({ args, state }) => {
    const name = args[0] ?? '';
    if (args.length >= 2) {
      state.tempVars.set(name, args[1] ?? '');
      state.unknown.delete(`temp:${name}`);
      return;
    }
    const dep = state.unknown.get(`temp:${name}`);
    if (dep) notSimulated(`\`${name}\` was set from \`${dep}\``);
    const value = state.tempVars.get(name);
    if (value === undefined) state.notes.push(`Temporary variable \`${name}\` was read before it was set.`);
    return value ?? '';
  },
  setVar: ({ args, state }) => {
    const id = opt(args, 2);
    writeVar(state, id ? 'user' : 'global', id ? 'user' : 'global', id ?? '', args[0] ?? '', args[1] ?? '');
  },
  getVar: ({ args, state }) => {
    const id = opt(args, 1);
    return readVar(state, id ? 'user' : 'global', id ?? '', args[0] ?? '');
  },
  setUserVar: ({ args, ctx, state }) => {
    const id = `${opt(args, 3) ?? ctx.guild.id}/${opt(args, 2) ?? ctx.author.id}`;
    writeVar(state, 'user', 'member', id, args[0] ?? '', args[1] ?? '');
  },
  getUserVar: ({ args, ctx, state }) =>
    readVar(state, 'member', `${opt(args, 2) ?? ctx.guild.id}/${opt(args, 1) ?? ctx.author.id}`, args[0] ?? ''),
  setServerVar: ({ args, ctx, state }) =>
    writeVar(state, 'server', 'server', opt(args, 2) ?? ctx.guild.id, args[0] ?? '', args[1] ?? ''),
  getServerVar: ({ args, ctx, state }) => readVar(state, 'server', opt(args, 1) ?? ctx.guild.id, args[0] ?? ''),
  setChannelVar: ({ args, ctx, state }) =>
    writeVar(state, 'channel', 'channel', opt(args, 2) ?? ctx.channel.id, args[0] ?? '', args[1] ?? ''),
  getChannelVar: ({ args, ctx, state }) => readVar(state, 'channel', opt(args, 1) ?? ctx.channel.id, args[0] ?? ''),

  // --- embeds --------------------------------------------------------------------------------
  title: embedSetter((e, v) => (e.title = v)),
  description: embedSetter((e, v) => (e.description = v)),
  footer: embedSetter((e, v) => (e.footer = v)),
  footerIcon: embedSetter((e, v) => (e.footerIcon = v)),
  thumbnail: embedSetter((e, v) => (e.thumbnail = v)),
  image: embedSetter((e, v) => (e.image = v)),
  author: embedSetter((e, v) => (e.author = v)),
  authorIcon: embedSetter((e, v) => (e.authorIcon = v)),
  authorURL: embedSetter((e, v) => (e.authorUrl = v)),
  embeddedURL: embedSetter((e, v) => (e.url = v)),
  color: ({ args, state }) => {
    embedAt(state, opt(args, 1)).color = parseColor(args[0] ?? '');
  },
  addField: ({ args, state }) => {
    const embed = embedAt(state, opt(args, 3));
    if (embed.fields.length >= 25) fail('an embed can have at most 25 fields');
    embed.fields.push({ name: args[0] ?? '', value: args[1] ?? '', inline: parseBool(opt(args, 2) ?? 'no') });
  },
  addTimestamp: ({ args, ctx, state }) => {
    embedAt(state, opt(args, 0)).timestamp = ctx.now;
  },

  // --- components ----------------------------------------------------------------------------
  addButton: ({ args, call, state }) => {
    if (opt(args, 6)) {
      state.sideEffects.push(`\`${call}\` — adds the button to another message`);
      return;
    }
    const [newRow = 'no', id = '', label = '', styleArg = ''] = args;
    const style = styleArg.toLowerCase() as SimButtonStyle;
    if (!BUTTON_STYLES.includes(style)) fail(`expected valid enum value in position 4, got '${styleArg}'`);
    if (style === 'link' && !/^https?:\/\/\S+$/i.test(id)) fail('Url in the button has to be valid');

    let row = state.rows[state.rows.length - 1];
    if (parseBool(newRow) || row?.type !== 'buttons' || row.buttons.length >= MAX_BUTTONS_PER_ROW) {
      if (state.rows.length >= MAX_ROWS) fail(`a message can have at most ${MAX_ROWS} component rows`);
      row = { type: 'buttons', buttons: [] };
      state.rows.push(row);
    }
    row.buttons.push({
      id,
      label,
      style,
      disabled: parseBool(opt(args, 4) ?? 'no'),
      emoji: opt(args, 5)
    });
  },
  newSelectMenu: ({ args, call, state }) => {
    if (opt(args, 4)) {
      state.sideEffects.push(`\`${call}\` — adds the menu to another message`);
      return;
    }
    if (state.rows.length >= MAX_ROWS) fail(`a message can have at most ${MAX_ROWS} component rows`);
    const menu: SimSelectMenu = {
      id: args[0] ?? '',
      min: Number(args[1]),
      max: Number(args[2]),
      placeholder: opt(args, 3),
      options: []
    };
    state.rows.push({ type: 'select', menu });
  },
  addSelectMenuOption: ({ args, call, state }) => {
    if (opt(args, 6)) {
      state.sideEffects.push(`\`${call}\` — adds the option to a menu on another message`);
      return;
    }
    const row = state.rows.find((r) => r.type === 'select' && r.menu.id === args[0]);
    if (!row || row.type !== 'select') return fail('Select menu not found');
    row.menu.options.push({
      label: args[1] ?? '',
      value: args[2] ?? '',
      description: args[3] ?? '',
      default: parseBool(opt(args, 4) ?? 'no'),
      emoji: opt(args, 5)
    });
  }
};
