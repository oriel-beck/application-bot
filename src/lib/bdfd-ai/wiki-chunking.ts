import { WIKI_BASE_URL } from './wiki-ingest.js';

export const MAX_CHUNK_CHARS = 3200;

export interface WikiChunk {
  id: string;
  document: string;
  metadata: { file: string; heading: string; url: string; source: 'wiki' | 'bdfd-api' | 'discord' };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Splits on H2/H3 headings; each chunk's heading/document is prefixed with a breadcrumb
 * (page title, plus the parent H2 for an H3 split) so a short section title like
 * "Retrieving value from options" embeds with its full topic context instead of in isolation —
 * otherwise it competes poorly against a query embedding a long, unrelated code snippet.
 */
export function chunkMarkdown(filePath: string, content: string): WikiChunk[] {
  const chunks: WikiChunk[] = [];
  const lines = content.split('\n');
  const pageTitle = /^#\s+(.+)$/m.exec(content)?.[1]?.trim();
  /** Repeated H2/H3 titles (e.g. CHANGELOG months) share a slug — suffix so Chroma IDs stay unique. */
  const slugCounts = new Map<string, number>();

  let currentH2: string | undefined;
  let currentHeading = 'Introduction';
  let currentLevel = 2;
  let body: string[] = [];

  const buildBreadcrumb = (heading: string, level: number): string => {
    const raw = [pageTitle, level === 3 ? currentH2 : undefined, heading];
    const parts: string[] = [];
    for (const part of raw) {
      if (part && parts[parts.length - 1] !== part) parts.push(part);
    }
    return parts.join(' > ');
  };

  const uniqueChunkId = (headingSlug: string): string => {
    const base = `${filePath}#${headingSlug}`;
    const n = slugCounts.get(base) ?? 0;
    slugCounts.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };

  const flush = () => {
    const text = body.join('\n').trim();
    if (!text && currentHeading === 'Introduction') return;
    const breadcrumb = buildBreadcrumb(currentHeading, currentLevel);
    const doc = `## ${breadcrumb}\n\n${text}`.trim();
    if (!doc) return;

    const id = uniqueChunkId(slugify(currentHeading));
    const wikiPath = filePath.replace(/^src\//, '').replace(/\.md$/, '.html');
    chunks.push({
      id,
      document: doc.slice(0, MAX_CHUNK_CHARS),
      metadata: {
        file: filePath,
        heading: breadcrumb,
        url: `${WIKI_BASE_URL}${wikiPath}`,
        source: 'wiki'
      }
    });
    body = [];
  };

  for (const line of lines) {
    const headingMatch = /^(#{2,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flush();
      const level = headingMatch[1]!.length;
      currentHeading = headingMatch[2]!.trim();
      if (level === 2) currentH2 = currentHeading;
      currentLevel = level;
      continue;
    }
    body.push(line);
  }
  flush();

  return chunks;
}
