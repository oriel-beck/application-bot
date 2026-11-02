import type { BdfdApiArgument } from './bdfd-api.js';
import type { BdscriptFunctionIndex } from './bdscript-function-index.js';
import { bdscriptFunctionNames, normalizeBdscriptFunctionName } from './bdscript-function-index.js';

const BDSCRIPT_FUNCTION_PATTERN = /\$([A-Za-z][A-Za-z0-9]*)/g;
const CODE_FENCE_PATTERN = /```([^\n`]*)\n?([\s\S]*?)```/g;
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
    public readonly arityIssues: ArityIssue[] = []
  ) {
    super(
      `BDScript validation failed after retries: invalid=[${invalidNames.join(', ')}] misusedCallbacks=[${misusedCallbacks.join(', ')}] arityIssues=[${arityIssues.map((i) => `$${i.name}(${i.argCount})`).join(', ')}]`
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
 * Callbacks mixed into a reply-code fence (same fence also has BDScript functions).
 * Single-callback-only fences are treated as valid trigger examples.
 */
export function findCallbacksMisusedInReplyCode(text: string, index: BdscriptFunctionIndex): string[] {
  const misused = new Set<string>();

  for (const match of text.matchAll(CODE_FENCE_PATTERN)) {
    const body = match[2] ?? '';
    const names = extractBdscriptFunctions(body);
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
}

const CALL_NAME = /^\$([A-Za-z][A-Za-z0-9]*)/;
const ARG_TERMINATORS: ReadonlySet<string> = new Set([';', ']']);
const NO_TERMINATORS: ReadonlySet<string> = new Set();

function parseTextRun(
  code: string,
  start: number,
  end: number,
  terminators: ReadonlySet<string>
): { nodes: BdscriptNode[]; stop: number } {
  const nodes: BdscriptNode[] = [];
  let buf = '';
  let i = start;
  // Depth of literal (non-call) `[...]` we're inside, e.g. an unescaped `[@user]` placeholder —
  // its own `]` must not be mistaken for the enclosing call's terminator.
  let bareDepth = 0;

  const flush = () => {
    if (buf) {
      nodes.push({ type: 'text', value: buf });
      buf = '';
    }
  };

  while (i < end) {
    const ch = code[i]!;

    if (ch === '\\' && i + 1 < end && (code[i + 1] === ';' || code[i + 1] === ']')) {
      buf += code[i + 1];
      i += 2;
      continue;
    }

    if (bareDepth === 0 && terminators.has(ch)) {
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
          nodes.push({ type: 'call', name, hasBrackets: true, args: call.args });
          i = call.end;
        } else {
          nodes.push({ type: 'call', name, hasBrackets: false, args: [] });
          i = afterName;
        }
        continue;
      }
    }

    if (ch === '[') {
      bareDepth++;
      buf += ch;
      i++;
      continue;
    }

    if (ch === ']' && bareDepth > 0) {
      bareDepth--;
      buf += ch;
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  flush();
  return { nodes, stop: i };
}

function parseArgs(code: string, start: number, end: number): { args: BdscriptNode[][]; end: number } {
  const args: BdscriptNode[][] = [];
  let i = start;

  while (true) {
    const run = parseTextRun(code, i, end, ARG_TERMINATORS);
    args.push(run.nodes);
    i = run.stop;

    if (i >= end) return { args, end: i }; // unterminated — missing `]`, stop where we ran out
    if (code[i] === ';') {
      i++;
      continue;
    }
    return { args, end: i + 1 }; // code[i] === ']' — consume it
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
      calls.push({ name: node.name, hasBrackets: node.hasBrackets, argCount: countArgs(node) });
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
  const max = variant.length;
  const names = variant.map((arg) => arg.name).join(', ');
  return {
    min,
    max,
    label: min === max ? `${max} argument(s) (${names})` : `${min}-${max} argument(s) (${names})`
  };
}

/**
 * Flag calls whose argument count doesn't fit any of the name's known syntax overloads.
 * Skips names with no `variants` schema (wiki-only entries) rather than guessing.
 */
export function findArityIssues(calls: FlatBdscriptCall[], index: BdscriptFunctionIndex): ArityIssue[] {
  const issues: ArityIssue[] = [];

  for (const call of calls) {
    const variants = index.get(call.name)?.variants;
    if (!variants?.length) continue;

    const ranges = variants.map(describeVariant);
    const fits = ranges.some((r) => call.argCount >= r.min && call.argCount <= r.max);
    if (!fits) {
      issues.push({ name: call.name, argCount: call.argCount, expected: ranges.map((r) => r.label) });
    }
  }

  return issues;
}

/** Same as findArityIssues, but scoped to code-fence bodies (for checking a model's reply code). */
export function findArityIssuesInReplyCode(text: string, index: BdscriptFunctionIndex): ArityIssue[] {
  const seen = new Set<string>();
  const issues: ArityIssue[] = [];

  for (const match of text.matchAll(CODE_FENCE_PATTERN)) {
    const body = match[2] ?? '';
    const calls = flattenBdscriptCalls(parseBdscript(body));
    for (const issue of findArityIssues(calls, index)) {
      if (seen.has(issue.name)) continue;
      seen.add(issue.name);
      issues.push(issue);
    }
  }

  return issues;
}

// --- Deterministic escaping repair (existing) ------------------------------------------------

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
 * Deterministically escape placeholder `]` in BDScript within an assistant reply
 * (code fences + lines that start with `$`). No model round-trip.
 */
export function repairBdscriptEscaping(text: string): string {
  const withFences = text.replace(CODE_FENCE_PATTERN, (_m, lang: string, body: string) => {
    return `\`\`\`${lang}\n${repairBdscriptCode(body)}\`\`\``;
  });

  return withFences
    .split('\n')
    .map((line) => (/^\s*\$[A-Za-z]/.test(line) ? repairBdscriptCode(line) : line))
    .join('\n');
}

function scoreNameSimilarity(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return 100;
  if (right.includes(left) || left.includes(right)) return 80;

  let matches = 0;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  for (const char of shorter) {
    if (longer.includes(char)) matches++;
  }

  return Math.round((matches / longer.length) * 60);
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
      .map((name) => ({ name, score: scoreNameSimilarity(normalized, name) }))
      .filter((entry) => entry.score >= 40)
      .sort((a, b) => b.score - a.score)
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
  arityIssues: ArityIssue[] = []
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
      'Rewrite the **full** answer using the correct argument count for each function, matching relevant_functions.'
    );
  }

  return parts.join('\n');
}
