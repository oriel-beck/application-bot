import type { BdscriptFunctionIndex } from './bdscript-function-index.js';
import { bdscriptFunctionNames, normalizeBdscriptFunctionName } from './bdscript-function-index.js';

const BDSCRIPT_FUNCTION_PATTERN = /\$([A-Za-z][A-Za-z0-9]*)/g;
const CODE_FENCE_PATTERN = /```(?:[^\n`]*)\n?([\s\S]*?)```/g;

/** Common hallucinated names → verified BDFD function. */
const HALLUCINATION_ALIASES: Record<string, string> = {
    length: 'charCount',
    strlen: 'charCount',
    len: 'charCount',
};

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
export function findCallbacksMisusedInReplyCode(
    text: string,
    index: BdscriptFunctionIndex
): string[] {
    const misused = new Set<string>();

    for (const match of text.matchAll(CODE_FENCE_PATTERN)) {
        const body = match[1] ?? '';
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
    const known = [...index.entries()]
        .filter(([, rec]) => rec.kind === 'function')
        .map(([name]) => name);
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
    misusedCallbacks: string[] = []
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

    return parts.join('\n');
}
