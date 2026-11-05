import type { BdscriptFunctionIndex } from '@lib/bdfd-ai/bdscript-function-index.js';
import {
  lineColumnAt,
  parseBdscript,
  type BdscriptCallNode,
  type BdscriptNode
} from '@lib/bdfd-ai/bdscript-validation.js';
import { checkArguments } from './arguments.js';
import { evaluateCondition } from './conditions.js';
import { FUNCTIONS, STATEMENT_FUNCTIONS, type CallEnv, type SimState } from './functions.js';
import { FailSignal, NotSimulatedSignal, ResponseSignal, StopSignal, UnsupportedSignal } from './signals.js';
import { BdfdFunctionError, BdfdScriptError, type SimContext, type SimEmbed, type SimResult } from './types.js';

interface IfStmt {
  type: 'if';
  branches: { cond: BdscriptCallNode | null; body: Stmt[] }[];
}

interface TryStmt {
  type: 'try';
  body: Stmt[];
  catchBody: Stmt[];
}

type Stmt = BdscriptNode | IfStmt | TryStmt;

const BLOCK_NAMES = new Set(['if', 'elseif', 'else', 'endif', 'try', 'catch', 'endtry']);
/** Calls that decide whether the rest of the code runs — they can't be skipped when unknown. */
const GATE_NAMES = new Set(['onlyIf', 'argsCheck', 'stop', 'suppressErrors']);

/**
 * An evaluated value, plus the first not-simulated function it depends on (if any). A value
 * built from one is itself unknown: `$sub[$channelCount;1]` can't be computed either.
 */
interface Evaluated {
  text: string;
  unknown: string | null;
}
/** Discord's message content limit. */
const CONTENT_MAX = 2000;

/**
 * Group top-level `$if…$endif` / `$try…$endtry` into blocks. Returns at the first call named in
 * `ends` (the caller decides what it means), or at the end of input.
 */
function buildBlock(
  nodes: BdscriptNode[],
  start: number,
  ends: string[]
): { stmts: Stmt[]; next: number; end?: BdscriptCallNode } {
  const stmts: Stmt[] = [];
  let i = start;

  while (i < nodes.length) {
    const node = nodes[i]!;
    if (node.type === 'call' && ends.includes(node.name)) return { stmts, next: i + 1, end: node };

    if (node.type === 'call' && node.name === 'if') {
      const ifStmt: IfStmt = { type: 'if', branches: [] };
      let cond: BdscriptCallNode | null = node;
      let sawElse = false;
      i++;
      while (true) {
        const block = buildBlock(nodes, i, ['elseif', 'else', 'endif']);
        ifStmt.branches.push({ cond, body: block.stmts });
        i = block.next;
        if (!block.end) throw new BdfdScriptError('`$if` not closed with `$endif`');
        if (block.end.name === 'endif') break;
        if (sawElse) throw new BdfdScriptError(`\`$${block.end.name}\` used after \`$else\``);
        sawElse = block.end.name === 'else';
        cond = sawElse ? null : block.end;
      }
      stmts.push(ifStmt);
      continue;
    }

    if (node.type === 'call' && node.name === 'try') {
      const body = buildBlock(nodes, i + 1, ['catch', 'endtry']);
      if (!body.end) throw new BdfdScriptError('`$try` not closed with `$endtry`');
      let catchBody: Stmt[] = [];
      i = body.next;
      if (body.end.name === 'catch') {
        const handler = buildBlock(nodes, i, ['endtry']);
        if (!handler.end) throw new BdfdScriptError('`$try` not closed with `$endtry`');
        catchBody = handler.stmts;
        i = handler.next;
      }
      stmts.push({ type: 'try', body: body.stmts, catchBody });
      continue;
    }

    if (node.type === 'call' && BLOCK_NAMES.has(node.name)) {
      const opener = node.name === 'catch' || node.name === 'endtry' ? 'try' : 'if';
      throw new BdfdScriptError(`\`$${node.name}\` used without \`$${opener}\``);
    }

    stmts.push(node);
    i++;
  }

  return { stmts, next: i };
}

/**
 * BDFD drops blank lines from the response, so a line holding only functions that output nothing
 * (`$textSplit[...]`, `$var[...]`, `$if[...]`) doesn't leave a gap — every wiki example's
 * documented reply is free of them.
 */
function removeBlankLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');
}

/** BDFD's escape tokens, resolved when the response is sent. */
function resolveEscapes(text: string): string {
  return text.replaceAll('%{-SEMICOL-}%', ';').replaceAll('%{DOL}%', '$').replaceAll('%ESCAPED%', ']');
}

function finalizeEmbed(embed: SimEmbed): SimEmbed | null {
  const e: SimEmbed = { ...embed, fields: embed.fields.map((f) => ({ ...f })) };
  for (const key of ['title', 'description', 'footer', 'author'] as const) {
    const value = e[key];
    if (value !== undefined) e[key] = resolveEscapes(value);
  }
  for (const field of e.fields) {
    field.name = resolveEscapes(field.name);
    field.value = resolveEscapes(field.value);
  }
  const visible = e.title || e.description || e.footer || e.author || e.image || e.thumbnail || e.fields.length;
  return visible ? e : null;
}

class Interpreter {
  private readonly state: SimState;

  constructor(
    private readonly code: string,
    private readonly ctx: SimContext,
    private readonly index: BdscriptFunctionIndex
  ) {
    this.state = {
      embeds: new Map(),
      rows: [],
      tempVars: new Map(),
      vars: new Map(),
      split: null,
      unknown: new Map(),
      decimals: false,
      suppressErrors: undefined,
      nomention: false,
      lastError: null,
      sideEffects: [],
      notSimulated: [],
      notes: []
    };
  }

  run(): SimResult {
    let content: string;
    let stoppedBy: SimResult['stoppedBy'];
    let unsupportedReason: string | undefined;

    try {
      const { stmts } = buildBlock(parseBdscript(this.code), 0, []);
      content = this.execBlock(stmts);
    } catch (err) {
      if (err instanceof StopSignal) {
        stoppedBy = 'stop';
        content = this.partial;
      } else if (err instanceof UnsupportedSignal) {
        stoppedBy = 'unsupported';
        unsupportedReason = err.reason;
        content = this.partial;
      } else if (err instanceof ResponseSignal) {
        stoppedBy = err.by;
        content = err.content;
        this.clearResponse();
      } else if (err instanceof BdfdFunctionError || err instanceof BdfdScriptError) {
        stoppedBy = 'error';
        this.clearResponse();
        if (this.state.suppressErrors !== undefined) {
          content = this.state.suppressErrors;
          this.state.notes.push(`\`$suppressErrors\` replaced this error: ${err.message}`);
        } else {
          content = err.message;
        }
      } else {
        throw err;
      }
    }

    content = removeBlankLines(resolveEscapes(content)).trim();
    if (content.length > CONTENT_MAX) {
      this.state.notes.push(`The response is ${content.length} characters; Discord allows ${CONTENT_MAX}.`);
      content = content.slice(0, CONTENT_MAX);
    }
    if (!this.state.nomention && stoppedBy !== 'error' && (content || this.state.embeds.size)) {
      this.state.notes.push(
        'Without `$nomention`, a prefix command also mentions the author in its response (not shown).'
      );
    }

    return {
      content,
      embeds: [...this.state.embeds.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, embed]) => finalizeEmbed(embed))
        .filter((e): e is SimEmbed => e !== null),
      components: this.state.rows,
      stoppedBy,
      unsupportedReason,
      sideEffects: this.state.sideEffects,
      notSimulated: [...new Set(this.state.notSimulated)],
      notes: [...new Set(this.state.notes)]
    };
  }

  /** Output accumulated so far, kept for `$stop`. */
  private partial = '';

  private clearResponse(): void {
    this.state.embeds.clear();
    this.state.rows.length = 0;
  }

  private execBlock(stmts: Stmt[]): string {
    const base = this.partial;
    let out = '';
    const append = (text: string) => {
      out += text;
      this.partial = base + out;
    };

    for (const stmt of stmts) {
      if (stmt.type === 'text') {
        append(stmt.value);
      } else if (stmt.type === 'call') {
        append(this.evalCall(stmt).text);
      } else if (stmt.type === 'if') {
        for (const branch of stmt.branches) {
          if (!branch.cond || this.condition(branch.cond)) {
            append(this.execBlock(branch.body));
            break;
          }
        }
      } else {
        const mark = this.partial;
        try {
          append(this.execBlock(stmt.body));
        } catch (err) {
          if (!(err instanceof BdfdFunctionError)) throw err;
          // The failed body's output is dropped; only the `$catch` block's output is sent.
          this.partial = mark;
          this.state.lastError = err;
          append(this.execBlock(stmt.catchBody));
        }
      }
    }

    return out;
  }

  private fnError(node: BdscriptCallNode, reason: string): BdfdFunctionError {
    const { line, column } = lineColumnAt(this.code, Math.max(node.start, node.end - 1));
    const sourceLine = this.code.split('\n')[line - 1]?.trim() ?? '';
    return new BdfdFunctionError(node.name, reason, line, column, sourceLine);
  }

  private evalNodes(nodes: BdscriptNode[]): Evaluated {
    let text = '';
    let unknown: string | null = null;
    for (const n of nodes) {
      const value = n.type === 'text' ? { text: n.value, unknown: null } : this.evalCall(n);
      text += value.text;
      unknown ??= value.unknown;
    }
    return { text, unknown };
  }

  /** Evaluated arguments, plus the not-simulated function one of them depends on (if any). */
  private evalArgs(node: BdscriptCallNode): { args: string[]; unknown: string | null; firstKnown: boolean } {
    if (node.unclosed) throw new BdfdScriptError(`\`$${node.name}\` is missing its closing \`]\``);
    const values = node.hasBrackets ? node.args.map((a) => this.evalNodes(a)) : [];
    const unknown = values.find((v) => v.unknown)?.unknown ?? null;
    const args = values.map((v) => v.text);
    // Unknown values are raw code, so type-checking them would report errors BDFD wouldn't.
    if (node.hasBrackets && !unknown) {
      const reason = checkArguments(this.index.get(node.name)?.variants, args);
      if (reason) throw this.fnError(node, reason);
    }
    return { args, unknown, firstKnown: !values[0]?.unknown };
  }

  private condition(node: BdscriptCallNode): boolean {
    if (!node.hasBrackets) throw this.fnError(node, 'expected at least 1 arguments, got 0');
    const { args, unknown } = this.evalArgs(node);
    if (unknown) {
      throw new UnsupportedSignal(`\`$${node.name}\` depends on \`${unknown}\`, which the simulator can't evaluate`);
    }
    const cond = args[0] ?? '';
    const result = evaluateCondition(cond);
    if (result === null) throw this.fnError(node, `invalid condition '${cond}'`);
    return result;
  }

  /** A skipped assignment leaves its target unknown, so later reads don't see a stale value. */
  private markUnknownAssignment(name: string, args: string[], nameKnown: boolean, dep: string): void {
    if (name === 'textSplit') {
      this.state.unknown.set('split', dep);
    } else if (name === 'var' && args.length >= 2 && nameKnown) {
      this.state.unknown.set(`temp:${args[0]}`, dep);
    } else if (/^set(User|Server|Channel)?Var$/.test(name) && nameKnown) {
      this.state.unknown.set(`var:${args[0]}`, dep);
    }
  }

  private evalCall(node: BdscriptCallNode): Evaluated {
    const raw = this.code.slice(node.start, node.end);
    const unknownRaw = (reason: string): Evaluated => {
      this.state.notSimulated.push(reason);
      return { text: raw, unknown: `$${node.name}` };
    };
    if (BLOCK_NAMES.has(node.name)) {
      throw new BdfdScriptError(`\`$${node.name}\` must be on the top level of the code, not inside a function`);
    }
    // `$c[...]` is a comment: nothing inside it runs.
    if (node.name === 'c') return { text: '', unknown: null };

    if (!this.index.has(node.name)) {
      // BDFD sends unknown `$words` as plain text, so this is a known value, not an unknown one.
      this.state.notes.push(`\`$${node.name}\` isn't a BDFD function, so it was left as text.`);
      return { text: raw, unknown: null };
    }

    const { args, unknown, firstKnown } = this.evalArgs(node);
    if (unknown) {
      this.markUnknownAssignment(node.name, args, firstKnown, unknown);
      if (GATE_NAMES.has(node.name)) {
        throw new UnsupportedSignal(`\`$${node.name}\` depends on \`${unknown}\`, which the simulator can't evaluate`);
      }
      if (STATEMENT_FUNCTIONS.has(node.name) || (node.name === 'var' && node.args.length >= 2)) {
        this.state.notSimulated.push(`${raw} — depends on \`${unknown}\``);
        return { text: '', unknown: null };
      }
      return { text: raw, unknown };
    }
    const handler = FUNCTIONS[node.name];
    if (!handler) return unknownRaw(`$${node.name}`);

    const env: CallEnv = {
      name: node.name,
      args,
      bare: !node.hasBrackets,
      call: node.hasBrackets ? `$${node.name}[${args.join(';')}]` : `$${node.name}`,
      ctx: this.ctx,
      state: this.state,
      evaluateCondition: (cond) => {
        const result = evaluateCondition(cond);
        if (result === null) throw new FailSignal(`invalid condition '${cond}'`);
        return result;
      }
    };

    try {
      return { text: handler(env) ?? '', unknown: null };
    } catch (err) {
      if (err instanceof FailSignal) throw this.fnError(node, err.reason);
      if (err instanceof NotSimulatedSignal) return unknownRaw(`${raw} — ${err.reason}`);
      throw err;
    }
  }
}

/** Run BDScript `code` as a command invoked in `ctx`, without touching Discord. */
export function simulateBdscript(code: string, ctx: SimContext, index: BdscriptFunctionIndex): SimResult {
  return new Interpreter(code, ctx, index).run();
}
