import type { BdscriptFunctionIndex } from './bdscript-function-index.js';
import { bdscriptFunctionNames, normalizeBdscriptFunctionName } from './bdscript-function-index.js';

const BDSCRIPT_FUNCTION_PATTERN = /\$([A-Za-z][A-Za-z0-9]*)/g;

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
    const known = [...bdscriptFunctionNames(index)];
    const suggestions = new Map<string, string[]>();

    for (const invalid of invalidNames) {
        const normalized = normalizeBdscriptFunctionName(invalid);
        const alias = HALLUCINATION_ALIASES[normalized];
        if (alias && index.has(alias)) {
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

export function buildRepairPrompt(invalidNames: string[], index: BdscriptFunctionIndex): string {
    const suggestions = suggestFunctionAlternatives(invalidNames, index);
    const lines = invalidNames.map((name) => {
        const alts = suggestions.get(name);
        if (alts?.length) {
            return `- \`$${name}\` is invalid — use \`$${alts[0]}\` instead`;
        }
        return `- \`$${name}\` is not a valid BDScript function`;
    });

    return [
        'Your previous answer used invalid BDScript function names:',
        ...lines,
        '',
        'Rewrite the **full** answer using only verified BDScript functions from wiki_context and relevant_functions.',
        'For normal command replies, output plain text or $function results directly — do **not** wrap them in $sendMessage unless sending a separate/extra message.',
        'String length checks use $charCount[text] — there is no $length.',
    ].join('\n');
}
