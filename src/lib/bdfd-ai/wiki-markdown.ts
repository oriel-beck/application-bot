/**
 * Normalizes BDFD wiki markdown before RAG ingest.
 * The wiki uses ```discord yaml blocks for rendered message previews (mdbook-discord-components).
 * Those are not BDFD code and confuse embeddings / the chat model.
 */
const DISCORD_PREVIEW_PLACEHOLDER =
  '[Discord UI preview omitted — not BDFD code. Use the plain ``` code block in this section for the real command.]';

const DISCORD_YAML_FENCE = /```\s*discord\s+yaml\s*\n[\s\S]*?```/gi;

/** Strip wiki-only Discord YAML preview fences; collapse extra blank lines. */
export function normalizeWikiMarkdownForRag(markdown: string): string {
  let out = markdown.replace(DISCORD_YAML_FENCE, DISCORD_PREVIEW_PLACEHOLDER);
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}
