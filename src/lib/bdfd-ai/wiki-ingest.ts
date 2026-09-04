/** Wiki paths under these prefixes are excluded from RAG ingest (e.g. deprecated BDJS). */
export const EXCLUDED_WIKI_PATH_PREFIXES = ['src/javascript/'] as const;

export function isWikiPathIncluded(path: string): boolean {
  return !EXCLUDED_WIKI_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}
