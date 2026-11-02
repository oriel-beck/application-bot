/**
 * Normalizes BDFD wiki markdown before RAG ingest.
 * The wiki uses ```discord yaml blocks for rendered message previews (mdbook-discord-components)
 * and ```admonish blocks for callout notes (mdbook-admonish). Neither is BDFD code — left as
 * real fences they read as literal BDScript to a model told "plain triple-backtick fences are
 * real BDScript", so both get stripped/converted before chunks are embedded.
 */
const DISCORD_PREVIEW_PLACEHOLDER =
  '[Discord UI preview omitted — not BDFD code. Use the plain ``` code block in this section for the real command.]';

const DISCORD_YAML_FENCE = /```\s*discord\s+yaml\s*\n[\s\S]*?```/gi;
const ADMONISH_FENCE = /```\s*admonish[^\n]*\n([\s\S]*?)```/gi;

function admonishToBlockquote(body: string): string {
  return body
    .trim()
    .split('\n')
    .map((line) => `> ${line}`.trimEnd())
    .join('\n');
}

/**
 * Strip wiki-only Discord YAML preview fences; convert admonition fences to plain
 * blockquotes (same content, no longer shaped like a code fence); collapse extra blank lines.
 *
 * Normalizes CRLF to LF first — the wiki repo's source files use CRLF, and `chunkMarkdown`'s
 * heading regex (`(.+)$` with no `s` flag) never matches a line ending in `\r`, so without this
 * every multi-section wiki page previously ingested as a single chunk truncated at
 * `MAX_CHUNK_CHARS`, silently dropping anything past the first ~3200 characters of the page.
 */
export function normalizeWikiMarkdownForRag(markdown: string): string {
  let out = markdown.replace(/\r\n/g, '\n');
  out = out.replace(DISCORD_YAML_FENCE, DISCORD_PREVIEW_PLACEHOLDER);
  out = out.replace(ADMONISH_FENCE, (_match, body: string) => `${admonishToBlockquote(body)}\n`);
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}
