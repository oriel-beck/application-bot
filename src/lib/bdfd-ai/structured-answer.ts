/**
 * The model's final answer: prose (`response`) plus raw code (`snippets`), referenced from the
 * prose via `{n}` placeholders. See RESPONSE_FORMAT in rag.service.ts.
 */
export interface StructuredDraft {
  response: string;
  snippets: string[];
}

/** `{0}`, and the `{{0}}` the model sometimes writes instead (template-style double braces). */
const SNIPPET_PLACEHOLDER = /\{\{(\d+)\}\}|\{(\d+)\}/g;
/** A snippet the model wrapped in a fence anyway, despite the "no fences" instruction. */
const WRAPPING_FENCE = /^```[^\n]*\n([\s\S]*?)\n?```$/;

function unwrapFence(snippet: string): string {
  const trimmed = snippet.trim();
  return WRAPPING_FENCE.exec(trimmed)?.[1] ?? trimmed;
}

/** Parse the model's structured JSON answer, falling back to treating raw text as pure prose. */
export function parseStructuredCompletion(content: string | null | undefined): StructuredDraft {
  const fallback: StructuredDraft = { response: content?.trim() || 'I could not generate a response.', snippets: [] };
  if (!content) return fallback;

  try {
    const parsed = JSON.parse(content) as Partial<StructuredDraft>;
    if (typeof parsed.response !== 'string') return fallback;
    const snippets = Array.isArray(parsed.snippets)
      ? parsed.snippets.filter((s): s is string => typeof s === 'string').map(unwrapFence)
      : [];
    return { response: parsed.response, snippets };
  } catch {
    return fallback;
  }
}

export interface SplicedAnswer {
  text: string;
  /** Indices of non-empty snippets the prose never referenced — appended at the end instead of dropped. */
  unreferenced: number[];
}

const fence = (code: string) => `\`\`\`\n${code}\n\`\`\``;

/**
 * Splice snippets back into the prose, as fences, at their `{n}` placeholders. Any snippet the
 * prose forgot to reference is appended at the end: the model often writes "Here's the fixed
 * code:" and puts the code in `snippets` without a `{0}`, and dropping it leaves the user with
 * a lead-in and no code.
 */
export function spliceSnippetsIntoResponse(response: string, snippets: string[]): SplicedAnswer {
  const referenced = new Set<number>();

  let text = response.replace(SNIPPET_PLACEHOLDER, (match, doubled?: string, single?: string) => {
    const index = Number(doubled ?? single);
    if (!Number.isInteger(index) || index < 0 || index >= snippets.length) {
      return match; // not a valid snippet reference — leave the literal text alone
    }
    referenced.add(index);
    return fence(snippets[index]!);
  });

  const unreferenced = snippets.flatMap((snippet, index) => (!referenced.has(index) && snippet ? [index] : []));
  if (unreferenced.length) {
    text = [text.trimEnd(), ...unreferenced.map((index) => fence(snippets[index]!))].join('\n\n');
  }

  return { text, unreferenced };
}
