/**
 * Every wiki link the bot produces points here. Ingest reads the wiki repo's `dev` branch, which
 * deploys to the nightly site — the production root is built from `prod` and lags behind it, so
 * pages that only exist on `dev` would 404 there.
 */
export const WIKI_BASE_URL = 'https://wiki.botdesignerdiscord.com/nightly/';

/** Wiki paths under these prefixes are excluded from RAG ingest (e.g. deprecated BDJS). */
export const EXCLUDED_WIKI_PATH_PREFIXES = ['src/javascript/'] as const;

export function isWikiPathIncluded(path: string): boolean {
  return !EXCLUDED_WIKI_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Wiki source paths (`src/...md`) that mdBook actually publishes: the ones linked from
 * `SUMMARY.md` (`create-missing = false`, so unlisted files are never built). Draft entries with
 * an empty link (`[Guides]()`) are section labels, not pages.
 */
export function parseSummaryPaths(summary: string): string[] {
  const paths = new Set<string>();
  for (const match of summary.matchAll(/\]\(\s*(?:\.\/)?([^)\s]+\.md)\s*\)/g)) {
    paths.add(`src/${match[1]!}`);
  }
  return [...paths];
}
