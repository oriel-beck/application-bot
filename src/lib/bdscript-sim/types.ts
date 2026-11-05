/** Discord context the simulated command runs in — the person running `/simulate` stands in as the author. */
export interface SimUser {
  id: string;
  username: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string;
}

export interface SimContext {
  author: SimUser;
  /** Users `$username[ID]` & co. can resolve: the author, plus users mentioned in args or code. */
  users: ReadonlyMap<string, SimUser>;
  channel: { id: string; name: string };
  guild: { id: string; name: string; memberCount: number };
  /** Text after the command trigger — what `$message` returns. */
  args: string;
  now: Date;
  /** Injectable for deterministic tests; `Math.random` in the command. */
  random: () => number;
}

export interface SimEmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface SimEmbed {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  footer?: string;
  footerIcon?: string;
  author?: string;
  authorIcon?: string;
  authorUrl?: string;
  thumbnail?: string;
  image?: string;
  timestamp?: Date;
  fields: SimEmbedField[];
}

export type SimButtonStyle = 'primary' | 'secondary' | 'success' | 'danger' | 'link';

export interface SimButton {
  /** Custom ID, or the URL for a `link` button. */
  id: string;
  label: string;
  style: SimButtonStyle;
  disabled: boolean;
  emoji?: string;
}

export interface SimSelectOption {
  label: string;
  value: string;
  description: string;
  default: boolean;
  emoji?: string;
}

export interface SimSelectMenu {
  id: string;
  min: number;
  max: number;
  placeholder?: string;
  options: SimSelectOption[];
}

export type SimComponentRow = { type: 'buttons'; buttons: SimButton[] } | { type: 'select'; menu: SimSelectMenu };

export interface SimResult {
  /** The response text, after escapes are resolved and the ends trimmed. */
  content: string;
  embeds: SimEmbed[];
  components: SimComponentRow[];
  /**
   * Why execution ended early, if it did. `error` means `content` is BDFD's error message;
   * `unsupported` means control flow hinged on something not simulated (see `unsupportedReason`).
   */
  stoppedBy?: 'stop' | 'onlyIf' | 'argsCheck' | 'error' | 'unsupported';
  unsupportedReason?: string;
  /** Discord actions the code asked for but the simulator didn't perform. */
  sideEffects: string[];
  /** Calls the simulator can't evaluate, left in the output as written. */
  notSimulated: string[];
  /** Things worth knowing about this run: random values, unset variables, assumptions. */
  notes: string[];
}

/**
 * A BDFD function error, formatted like BDFD's own:
 * ❌ Function `$sum` at `2:9` returned an error: expected integer in position 2, got 'a'
 * The location is the call's last character (its closing `]`), as BDFD reports it.
 */
export class BdfdFunctionError extends Error {
  constructor(
    readonly fn: string,
    readonly reason: string,
    readonly row: number,
    readonly column: number,
    /** The code line the error happened on, for `$error[source]`. */
    readonly sourceLine: string
  ) {
    super(`❌ Function \`$${fn}\` at \`${row}:${column}\` returned an error: ${reason}`);
  }
}

/** A structural error BDFD reports without a function location, e.g. an unclosed `$if`. */
export class BdfdScriptError extends Error {}
