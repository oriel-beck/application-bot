import type { BdscriptFunctionIndex } from './bdscript-function-index.js';
import {
  type ArityIssue,
  findArityIssuesInSnippets,
  findCallbacksMisusedInSnippets,
  findEarlyClosedCallsInSnippets,
  findInvalidFunctions,
  lintBdscript,
  repairBdscriptCode
} from './bdscript-validation.js';

/**
 * BDScript checks for the AI's markdown answers: the `check_bdscript_code` tool the model calls
 * on its code before replying, and the backstop run on the code blocks of its final answer.
 */

/** A fenced block with an optional language tag; group 1 is the body. */
const CODE_BLOCK = /```[^\n`]*\n([\s\S]*?)\n?```/g;

/** Bodies of the fenced code blocks in a markdown answer. */
export function extractCodeBlocks(markdown: string): string[] {
  return [...markdown.matchAll(CODE_BLOCK)].map((m) => m[1]!);
}

/**
 * Deterministically escape placeholder brackets (`[@user]` → `[@user\]`) inside each code block,
 * so the most common mistake is fixed without another model round trip.
 */
export function escapeCodeBlocks(markdown: string): string {
  return markdown.replace(CODE_BLOCK, (block: string, body: string) => {
    // The body starts right after the opening fence line.
    const header = block.slice(0, block.indexOf('\n') + 1);
    return header + repairBdscriptCode(body) + block.slice(header.length + body.length);
  });
}

export interface AnswerProblems {
  /** Unknown `$names`, in the prose too ("you could also try `$fooBar`"). */
  invalidNames: string[];
  misusedCallbacks: string[];
  arityIssues: ArityIssue[];
  earlyClosed: string[];
}

export function findAnswerProblems(markdown: string, index: BdscriptFunctionIndex): AnswerProblems {
  const blocks = extractCodeBlocks(markdown);
  return {
    invalidNames: findInvalidFunctions(markdown, index),
    misusedCallbacks: findCallbacksMisusedInSnippets(blocks, index),
    arityIssues: findArityIssuesInSnippets(blocks, index),
    earlyClosed: findEarlyClosedCallsInSnippets(blocks)
  };
}

export function hasAnswerProblems(problems: AnswerProblems): boolean {
  return Object.values(problems).some((list) => list.length > 0);
}

/** `check_bdscript_code` result: every problem in each code, with its line and column. */
export function formatCodeCheckResults(codes: string[], index: BdscriptFunctionIndex): string {
  return codes
    .map((code, i) => {
      const problems = lintBdscript(code, index).map((d) => `- line ${d.line}:${d.column} — ${d.message}`);
      for (const name of findCallbacksMisusedInSnippets([code], index)) {
        problems.push(
          `- \`$${name}\` is a callback (command trigger only) — put it under **Trigger**, not in reply code`
        );
      }
      return problems.length
        ? `Code ${i + 1}: ${problems.length} problem(s):\n${problems.join('\n')}`
        : `Code ${i + 1}: no problems found.`;
    })
    .join('\n\n');
}
