import type { BdfdApiArgument } from './bdfd-api.js';
import type { BdscriptFunctionIndex } from './bdscript-function-index.js';
import { bdscriptFunctionNames, normalizeBdscriptFunctionName } from './bdscript-function-index.js';

const BDSCRIPT_FUNCTION_PATTERN = /\$([A-Za-z][A-Za-z0-9]*)/g;
/** `[word]` / `[@user]` — closing `]` is not escaped. */
const PLACEHOLDER_BRACKET = /^\[(@?[A-Za-z][A-Za-z0-9]*)\]/;
const FUNCTION_OPEN = /^\$[A-Za-z][A-Za-z0-9]*\[/;

/** Common hallucinated names → verified BDFD function. */
const HALLUCINATION_ALIASES: Record<string, string> = {
  length: 'charCount',
  strlen: 'charCount',
  len: 'charCount'
};

/** Thrown when a response still fails validation after all repair attempts. */
export class BdscriptValidationError extends Error {
  constructor(
    public readonly invalidNames: string[],
    public readonly misusedCallbacks: string[],
    public readonly arityIssues: ArityIssue[] = [],
    public readonly earlyClosed: string[] = []
  ) {
    super(
      `BDScript validation failed after retries: invalid=[${invalidNames.join(', ')}] misusedCallbacks=[${misusedCallbacks.join(', ')}] arityIssues=[${arityIssues.map((i) => `$${i.name}(${i.argCount})`).join(', ')}] earlyClosed=[${earlyClosed.join(', ')}]`
    );
    this.name = 'BdscriptValidationError';
  }
}

export function extractBdscriptFunctions(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const match of text.matchAll(BDSCRIPT_FUNCTION_PATTERN)) {
    const name = match[1]!;
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }

  return names;
}

export function findInvalidFunctions(text: string, index: BdscriptFunctionIndex): string[] {
  const known = bdscriptFunctionNames(index);
  return extractBdscriptFunctions(text).filter((name) => !known.has(name));
}

/**
 * Callbacks mixed into a reply-code snippet (same snippet also has BDScript functions).
 * A single-callback-only snippet is treated as a valid trigger example.
 */
export function findCallbacksMisusedInSnippets(snippets: string[], index: BdscriptFunctionIndex): string[] {
  const misused = new Set<string>();

  for (const snippet of snippets) {
    const names = extractBdscriptFunctions(snippet);
    if (!names.length) continue;

    const functions: string[] = [];
    const callbacks: string[] = [];
    for (const name of names) {
      const kind = index.get(name)?.kind;
      if (kind === 'callback') callbacks.push(name);
      else if (kind === 'function') functions.push(name);
    }

    if (functions.length && callbacks.length) {
      for (const name of callbacks) {
        misused.add(name);
      }
    }
  }

  return [...misused];
}

// --- BDScript AST parser + arity validation -------------------------------------------------
//
// Generalizes the bracket/escape-aware walker below (repairFunctionArgs/repairBdscriptCode) into
// a real parser that splits each call's arguments, instead of just re-emitting escaped text.
// Used to check argument *count* against the official API's per-name schema — the gap
// findInvalidFunctions leaves open: a real function name used with the wrong number of
// arguments passes name-existence validation untouched today.

export type BdscriptNode = { type: 'text'; value: string } | BdscriptCallNode;

export interface BdscriptCallNode {
  type: 'call';
  name: string;
  /** False for a bare call with no brackets at all, e.g. `$message` vs `$message[user]`. */
  hasBrackets: boolean;
  /** Each element is one `;`-separated argument, itself a sequence of text/nested-call nodes. */
  args: BdscriptNode[][];
  /**
   * True when an argument opened a literal `[` (e.g. `[@user]`) that was still unmatched by an
   * escaped `\]` when the call's closing `]` arrived — i.e. the call was closed early by what
   * was meant as literal text. `$argsCheck[2;Use [@user] [amount]]` closes right after `@user`.
   */
  closedEarly: boolean;
  /** True when the code ran out before this call's closing `]` (e.g. `$var[a;b`). */
  unclosed: boolean;
  /** Offset of the call's `$` in the parsed code, for line/column diagnostics. */
  start: number;
  /** Offset just past the call (after its closing `]`, or its name when bare). */
  end: number;
}

const CALL_NAME = /^\$([A-Za-z][A-Za-z0-9]*)/;
const ARG_TERMINATORS: ReadonlySet<string> = new Set([';', ']']);
const NO_TERMINATORS: ReadonlySet<string> = new Set();

function parseTextRun(
  code: string,
  start: number,
  end: number,
  terminators: ReadonlySet<string>
): { nodes: BdscriptNode[]; stop: number; openLiteral: number } {
  const nodes: BdscriptNode[] = [];
  let buf = '';
  let i = start;
  // Literal (non-call) `[` seen in this run and not yet matched by an escaped `\]`. BDFD has no
  // notion of literal bracket nesting — an unescaped `]` always closes the innermost call — so
  // this only tracks whether the call is about to be closed early, it never defers the close.
  let openLiteral = 0;

  const flush = () => {
    if (buf) {
      nodes.push({ type: 'text', value: buf });
      buf = '';
    }
  };

  while (i < end) {
    const ch = code[i]!;

    if (ch === '\\' && i + 1 < end && (code[i + 1] === ';' || code[i + 1] === ']')) {
      if (code[i + 1] === ']' && openLiteral > 0) openLiteral--;
      buf += code[i + 1];
      i += 2;
      continue;
    }

    if (terminators.has(ch)) {
      break;
    }

    if (ch === '$') {
      const match = CALL_NAME.exec(code.slice(i, end));
      if (match) {
        flush();
        const name = match[1]!;
        const afterName = i + match[0].length;
        if (code[afterName] === '[') {
          const call = parseArgs(code, afterName + 1, end);
          nodes.push({
            type: 'call',
            name,
            hasBrackets: true,
            args: call.args,
            closedEarly: call.closedEarly,
            unclosed: call.unclosed,
            start: i,
            end: call.end
          });
          i = call.end;
        } else {
          nodes.push({
            type: 'call',
            name,
            hasBrackets: false,
            args: [],
            closedEarly: false,
            unclosed: false,
            start: i,
            end: afterName
          });
          i = afterName;
        }
        continue;
      }
    }

    if (ch === '[') openLiteral++;

    buf += ch;
    i++;
  }

  flush();
  return { nodes, stop: i, openLiteral };
}

function parseArgs(
  code: string,
  start: number,
  end: number
): { args: BdscriptNode[][]; end: number; closedEarly: boolean; unclosed: boolean } {
  const args: BdscriptNode[][] = [];
  let i = start;

  while (true) {
    const run = parseTextRun(code, i, end, ARG_TERMINATORS);
    args.push(run.nodes);
    i = run.stop;

    if (i >= end) return { args, end: i, closedEarly: false, unclosed: true }; // missing `]`, stop where we ran out
    if (code[i] === ';') {
      i++;
      continue;
    }
    // code[i] === ']' — consume it. An argument still holding an unmatched literal `[` means
    // this `]` was meant as literal text and should have been escaped as `\]`.
    return { args, end: i + 1, closedEarly: run.openLiteral > 0, unclosed: false };
  }
}

/** Parse a BDScript snippet into a sequence of text/call nodes; calls carry their own nested args. */
export function parseBdscript(code: string): BdscriptNode[] {
  return parseTextRun(code, 0, code.length, NO_TERMINATORS).nodes;
}

export interface FlatBdscriptCall {
  name: string;
  hasBrackets: boolean;
  argCount: number;
  closedEarly: boolean;
}

function countArgs(node: BdscriptCallNode): number {
  if (!node.hasBrackets) return 0;
  // `$fn[]` — nothing between the brackets is "no arguments", not one empty-string argument.
  if (node.args.length === 1 && node.args[0]!.length === 0) return 0;
  return node.args.length;
}

/** Flatten all calls in a parsed tree, including ones nested inside another call's arguments. */
export function flattenBdscriptCalls(nodes: BdscriptNode[]): FlatBdscriptCall[] {
  const calls: FlatBdscriptCall[] = [];

  const visit = (list: BdscriptNode[]) => {
    for (const node of list) {
      if (node.type !== 'call') continue;
      calls.push({
        name: node.name,
        hasBrackets: node.hasBrackets,
        argCount: countArgs(node),
        closedEarly: node.closedEarly
      });
      for (const arg of node.args) visit(arg);
    }
  };

  visit(nodes);
  return calls;
}

export interface ArityIssue {
  name: string;
  argCount: number;
  /** Human-readable expected-count description, one per syntax overload. */
  expected: string[];
}

function describeVariant(variant: BdfdApiArgument[] | null): { min: number; max: number; label: string } {
  if (!variant?.length) {
    return { min: 0, max: 0, label: 'no arguments' };
  }

  const min = variant.filter((arg) => arg.required).length;
  // A repeatable argument (`$sum[number;...]`) lifts the upper bound entirely.
  const max = variant.some((arg) => arg.repeatable) ? Infinity : variant.length;
  const names = variant.map((arg) => (arg.repeatable ? `${arg.name}...` : arg.name)).join(', ');
  return {
    min,
    max,
    label:
      max === Infinity
        ? `at least ${min} argument(s) (${names})`
        : min === max
          ? `${max} argument(s) (${names})`
          : `${min}-${max} argument(s) (${names})`
  };
}

/**
 * Flag calls whose argument count doesn't fit any of the name's known syntax overloads.
 * Skips names with no `variants` schema (wiki-only entries) rather than guessing.
 */
export function findArityIssues(calls: FlatBdscriptCall[], index: BdscriptFunctionIndex): ArityIssue[] {
  return calls.flatMap((call) => arityIssueFor(call.name, call.argCount, index) ?? []);
}

function arityIssueFor(name: string, argCount: number, index: BdscriptFunctionIndex): ArityIssue | null {
  const variants = index.get(name)?.variants;
  if (!variants?.length) return null;

  const ranges = variants.map(describeVariant);
  const fits = ranges.some((r) => argCount >= r.min && argCount <= r.max);
  return fits ? null : { name, argCount, expected: ranges.map((r) => r.label) };
}

/** Same as findArityIssues, but scoped to a reply's code snippets (for checking a model's reply code). */
export function findArityIssuesInSnippets(snippets: string[], index: BdscriptFunctionIndex): ArityIssue[] {
  const seen = new Set<string>();
  const issues: ArityIssue[] = [];

  for (const snippet of snippets) {
    const calls = flattenBdscriptCalls(parseBdscript(snippet));
    for (const issue of findArityIssues(calls, index)) {
      if (seen.has(issue.name)) continue;
      seen.add(issue.name);
      issues.push(issue);
    }
  }

  return issues;
}

/** Names of calls closed early by an unescaped `]` meant as literal text (see `closedEarly`). */
export function findEarlyClosedCalls(calls: FlatBdscriptCall[]): string[] {
  return [...new Set(calls.filter((call) => call.closedEarly).map((call) => call.name))];
}

/** Same as findEarlyClosedCalls, but scoped to a reply's code snippets. */
export function findEarlyClosedCallsInSnippets(snippets: string[]): string[] {
  return [
    ...new Set(snippets.flatMap((snippet) => findEarlyClosedCalls(flattenBdscriptCalls(parseBdscript(snippet)))))
  ];
}

// --- User-facing lint ---------------------------------------------------------------------------

export type BdscriptDiagnosticKind = 'unknown-function' | 'arity' | 'closed-early' | 'unclosed';

export interface BdscriptDiagnostic {
  kind: BdscriptDiagnosticKind;
  name: string;
  /** 1-based position of the call's `$`. */
  line: number;
  column: number;
  message: string;
}

export function lineColumnAt(code: string, offset: number): { line: number; column: number } {
  const before = code.slice(0, offset);
  const lastNewline = before.lastIndexOf('\n');
  return { line: before.split('\n').length, column: offset - lastNewline };
}

/**
 * Run every parser-level check over a user's BDScript code and report each problem with its
 * position — the same checks the AI pipeline uses, but per call instead of deduped by name.
 */
export function lintBdscript(code: string, index: BdscriptFunctionIndex): BdscriptDiagnostic[] {
  const diagnostics: BdscriptDiagnostic[] = [];
  const known = bdscriptFunctionNames(index);

  const report = (node: BdscriptCallNode, kind: BdscriptDiagnosticKind, message: string) => {
    diagnostics.push({ kind, name: node.name, ...lineColumnAt(code, node.start), message });
  };

  const visit = (list: BdscriptNode[]) => {
    for (const node of list) {
      if (node.type !== 'call') continue;

      if (!known.has(node.name)) {
        const alt = suggestFunctionAlternatives([node.name], index).get(node.name)?.[0];
        report(
          node,
          'unknown-function',
          `\`$${node.name}\` is not a BDScript function${alt ? ` — did you mean \`$${alt}\`?` : ''}`
        );
      } else {
        const arity = arityIssueFor(node.name, countArgs(node), index);
        if (arity) {
          report(
            node,
            'arity',
            `\`$${node.name}\` got ${arity.argCount} argument(s); expected ${arity.expected.join(' or ')}. ` +
              'A literal `;` inside an argument must be escaped as `\\;`.'
          );
        }
      }

      if (node.closedEarly) {
        report(
          node,
          'closed-early',
          `\`$${node.name}[...]\` is closed early by an unescaped \`]\` in literal text like \`[@user]\` — ` +
            'escape it as `\\]`.'
        );
      }

      if (node.unclosed) {
        report(node, 'unclosed', `\`$${node.name}[\` is never closed — add the missing \`]\`.`);
      }

      for (const arg of node.args) visit(arg);
    }
  };

  visit(parseBdscript(code));
  return diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
}

// --- Deterministic escaping repair (existing)------------------------------------------------

/**
 * Escape literal `]` in placeholder-like `[word]` / `[@user]` inside `$function[...]` args.
 * Idempotent for already-escaped `\]`. Does not touch `;` (needs arity to distinguish separators).
 */
function repairFunctionArgs(code: string, start: number): { text: string; end: number } {
  let out = '';
  let i = start;
  let depth = 1;

  while (i < code.length && depth > 0) {
    const ch = code[i]!;

    if (ch === '\\' && i + 1 < code.length && (code[i + 1] === ';' || code[i + 1] === ']')) {
      out += ch + code[i + 1];
      i += 2;
      continue;
    }

    if (ch === '$') {
      const open = FUNCTION_OPEN.exec(code.slice(i));
      if (open) {
        out += open[0];
        i += open[0].length;
        const nested = repairFunctionArgs(code, i);
        out += nested.text;
        i = nested.end;
        continue;
      }
    }

    const placeholder = PLACEHOLDER_BRACKET.exec(code.slice(i));
    if (placeholder) {
      out += `[${placeholder[1]}\\]`;
      i += placeholder[0].length;
      continue;
    }

    if (ch === '[') {
      depth++;
      out += ch;
      i++;
      continue;
    }

    if (ch === ']') {
      depth--;
      out += ch;
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  return { text: out, end: i };
}

/** Repair `$function[...]` escaping inside a BDScript snippet (fence body or code line). */
export function repairBdscriptCode(code: string): string {
  let out = '';
  let i = 0;

  while (i < code.length) {
    if (code[i] === '$') {
      const open = FUNCTION_OPEN.exec(code.slice(i));
      if (open) {
        out += open[0];
        i += open[0].length;
        const args = repairFunctionArgs(code, i);
        out += args.text;
        i = args.end;
        continue;
      }
    }

    out += code[i];
    i++;
  }

  return out;
}

/**
 * Optimal-string-alignment edit distance (Levenshtein + adjacent transpositions), so the
 * common `$lenght` / `$mesage` typos are one edit away from the real name.
 */
export function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0]![j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, rows[i - 2]![j - 2]! + 1);
      }
      rows[i]![j] = best;
    }
  }

  return rows[a.length]![b.length]!;
}

/** Lower is closer; `null` when `candidate` isn't a plausible fix for `typed`. */
function nameDistance(typed: string, candidate: string): number | null {
  const left = typed.toLowerCase();
  const right = candidate.toLowerCase();
  if (left === right) return 0;

  const distance = editDistance(left, right);
  // Roughly one typo per three characters, but always allow one.
  if (distance <= Math.max(1, Math.floor(left.length / 3))) return distance;

  // One name containing the other (`$avatar` → `$userAvatar`), ranked behind every typo match.
  const shorter = left.length <= right.length ? left : right;
  const longer = shorter === left ? right : left;
  if (shorter.length >= 4 && longer.includes(shorter)) return 100 + longer.length - shorter.length;

  return null;
}

export function suggestFunctionAlternatives(
  invalidNames: string[],
  index: BdscriptFunctionIndex
): Map<string, string[]> {
  const known = [...index.entries()].filter(([, rec]) => rec.kind === 'function').map(([name]) => name);
  const suggestions = new Map<string, string[]>();

  for (const invalid of invalidNames) {
    const normalized = normalizeBdscriptFunctionName(invalid);
    const alias = HALLUCINATION_ALIASES[normalized];
    if (alias && index.get(alias)?.kind === 'function') {
      suggestions.set(invalid, [alias]);
      continue;
    }

    const ranked = known
      .map((name) => ({ name, distance: nameDistance(normalized, name) }))
      .filter((entry): entry is { name: string; distance: number } => entry.distance !== null)
      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
      .slice(0, 3)
      .map((entry) => entry.name);

    if (ranked.length) {
      suggestions.set(invalid, ranked);
    }
  }

  return suggestions;
}

export function buildRepairPrompt(
  invalidNames: string[],
  index: BdscriptFunctionIndex,
  misusedCallbacks: string[] = [],
  arityIssues: ArityIssue[] = [],
  earlyClosed: string[] = []
): string {
  const parts: string[] = [];

  if (invalidNames.length) {
    const suggestions = suggestFunctionAlternatives(invalidNames, index);
    const lines = invalidNames.map((name) => {
      const alts = suggestions.get(name);
      if (alts?.length) {
        return `- \`$${name}\` is invalid — use \`$${alts[0]}\` instead`;
      }
      return `- \`$${name}\` is not a valid BDScript function`;
    });

    parts.push(
      'Your previous answer used invalid BDScript function names:',
      ...lines,
      '',
      'Rewrite the **full** answer using only verified BDScript functions from wiki_context and relevant_functions.',
      'For normal command replies, output plain text or $function results directly — do **not** wrap them in $sendMessage unless sending a separate/extra message.',
      'String length checks use $charCount[text] — there is no $length.'
    );
  }

  if (misusedCallbacks.length) {
    if (parts.length) parts.push('');
    parts.push(
      'Your previous answer mixed **callbacks** into reply-code fences:',
      ...misusedCallbacks.map((name) => `- \`$${name}\` is a callback (command **trigger** only)`),
      '',
      'Rewrite the **full** answer with labeled parts:',
      '- **Trigger:** put callbacks here (alone in a fence is fine)',
      '- **Reply code:** BDScript $functions only — no callbacks in the same fence as reply functions'
    );
  }

  if (arityIssues.length) {
    if (parts.length) parts.push('');
    parts.push(
      'Your previous answer used BDScript functions with the wrong number of arguments:',
      ...arityIssues.map(
        (issue) =>
          `- \`$${issue.name}\` was called with ${issue.argCount} argument(s); expected ${issue.expected.join(' or ')}`
      ),
      '',
      'Rewrite the **full** answer using the correct argument count for each function, matching relevant_functions.',
      'A literal `;` inside an argument must be escaped as `\\;` — an unescaped `;` (even a trailing one) starts a new argument.'
    );
  }

  if (earlyClosed.length) {
    if (parts.length) parts.push('');
    parts.push(
      'Your previous answer closed BDScript functions early with an unescaped `]`:',
      ...earlyClosed.map(
        (name) => `- \`$${name}[...]\` contains literal text like \`[...]\` whose \`]\` ends the function call`
      ),
      '',
      'Rewrite the **full** answer escaping every literal `]` inside a function argument as `\\]`, e.g. `$argsCheck[2;Use [@user\\] [amount\\]]`.'
    );
  }

  return parts.join('\n');
}
