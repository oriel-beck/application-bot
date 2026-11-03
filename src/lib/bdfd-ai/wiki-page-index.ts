import { posix } from 'node:path';
import { editDistance } from './bdscript-validation.js';
import { WIKI_BASE_URL } from './wiki-ingest.js';

const INTRODUCTION = 'Introduction';
/** Wiki folders whose `$name` pages are function/callback references; everything else is a guide. */
const FUNCTION_PAGE_PREFIXES = ['src/bdscript/', 'src/premium/', 'src/callbacks/'];
/** mdBook navigation files are ingested like any page but aren't documentation. */
const EXCLUDED_FILES = new Set(['src/SUMMARY.md']);
/** Hits below this are noise (e.g. a 3-letter query fuzzily matching an unrelated word). */
export const MIN_WIKI_SEARCH_SCORE = 0.6;
/** Section matches rank just behind an equally good page-title match. */
const SECTION_WEIGHT = 0.9;

/**
 * One chunk as stored in Chroma: a wiki page section (`source: 'wiki'`), or an official BDFD API
 * function/callback definition (`source: 'bdfd-api'`, file `api/bdfd/[callback/]<name>.md`).
 */
export interface WikiChunkRecord {
  file: string;
  /** Breadcrumb from `chunkMarkdown`, e.g. `Slash Commands > Slash options`. */
  heading: string;
  document: string;
  source: 'wiki' | 'bdfd-api';
}

/** `guide`: guides/resources pages. `function`: a `$function`/callback reference. */
export type WikiPageKind = 'guide' | 'function';

export interface WikiSection {
  /** The section's own heading (last breadcrumb segment). */
  heading: string;
  breadcrumb: string;
  document: string;
}

export interface WikiPage {
  /** Wiki source path, e.g. `src/bdscript/var.md` — stable id for autocomplete values. */
  file: string;
  title: string;
  kind: WikiPageKind;
  /**
   * `null` for a function the official API lists but the wiki has no page for yet — its entry
   * shows the API definition instead, and must never link to a guessed URL.
   */
  url: string | null;
  sections: WikiSection[];
}

export interface WikiSearchHit {
  page: WikiPage;
  /** Set when a section heading matched better than the page title. */
  sectionIndex?: number;
  score: number;
}

interface SearchTerms {
  tokens: string[];
  /** Lowercase alphanumerics only, so `text split` and `$textSplit` compare equal. */
  compact: string;
}

interface IndexedPage {
  page: WikiPage;
  title: SearchTerms;
  sections: { index: number; terms: SearchTerms }[];
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Field tokens include camelCase parts (`$userAvatar` → `useravatar`, `user`, `avatar`). */
function fieldTerms(text: string): SearchTerms {
  const camelSplit = text.replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, '$1 $2');
  return {
    tokens: [...new Set([...words(text), ...words(camelSplit)])],
    compact: words(text).join('')
  };
}

/** How well one query word matches one field token: exact > prefix > substring > typo. */
export function tokenScore(query: string, token: string): number {
  if (query === token) return 1;
  if (query.length >= 2 && token.startsWith(query)) return 0.9;
  if (query.length >= 3 && token.includes(query)) return 0.75;
  if (query.length < 3) return 0;

  // Roughly one typo per four characters, but always allow one.
  const allowed = Math.max(1, Math.floor(query.length / 4));
  // Edit distance is at least the length difference — skip the DP when it can't pass.
  if (Math.abs(query.length - token.length) <= allowed) {
    const distance = editDistance(query, token);
    if (distance <= allowed) return 0.85 - 0.1 * distance;
  }

  // Partial *and* misspelled (`varibl` → `variables`): compare against the token's prefixes,
  // ±1 length so a dropped or doubled letter doesn't shift the comparison window.
  if (token.length > query.length) {
    let prefixDistance = Infinity;
    for (let len = query.length - 1; len <= Math.min(query.length + 1, token.length - 1); len++) {
      prefixDistance = Math.min(prefixDistance, editDistance(query, token.slice(0, len)));
    }
    if (prefixDistance <= allowed) return 0.75 - 0.1 * prefixDistance;
  }

  return 0;
}

function fieldScore(queryWords: string[], queryCompact: string, field: SearchTerms): number {
  if (!queryWords.length || !field.tokens.length) return 0;
  if (queryCompact === field.compact) return 1;

  let total = 0;
  for (const word of queryWords) {
    let best = 0;
    for (const token of field.tokens) {
      best = Math.max(best, tokenScore(word, token));
      if (best === 1) break;
    }
    total += best;
  }

  // Whole-string comparison catches spacing differences (`text split` vs `$textSplit`).
  // Both are capped below 1 so only an exact title (`$var`) outranks `$getVar` for `var`.
  const compact = tokenScore(queryCompact, field.compact);
  return Math.max(total / queryWords.length, compact) * 0.95;
}

function lastSegment(breadcrumb: string): string {
  const parts = breadcrumb.split(' > ');
  return parts[parts.length - 1]!.trim();
}

function titleFromFile(file: string): string {
  return posix.basename(file, '.md');
}

/** Same mapping mdBook uses: `src/guides/x.md` → `<wiki>/guides/x.html`. */
export function wikiPageUrl(file: string): string {
  return `${WIKI_BASE_URL}${file.replace(/^src\//, '').replace(/\.md$/, '.html')}`;
}

/** `$removeButtons[]` → `removeButtons`, so wiki titles and API names compare. */
function functionName(title: string): string {
  return title.replace(/^\$/, '').replace(/\[\]$/, '');
}

/**
 * The page title is the breadcrumb root of its `Introduction` chunk (`Title > Introduction`);
 * pages without an H1 fall back to the file name.
 */
function pageTitle(file: string, records: WikiChunkRecord[]): string {
  for (const record of records) {
    const parts = record.heading.split(' > ');
    if (parts.length >= 2 && parts[parts.length - 1] === INTRODUCTION) return parts[0]!.trim();
  }
  return titleFromFile(file);
}

/** Fuzzy title/heading search over wiki pages built from the ingested Chroma chunks. */
export class WikiPageIndex {
  private readonly pages: IndexedPage[] = [];
  private readonly byFile = new Map<string, IndexedPage>();
  private readonly byDocument = new Map<string, { page: WikiPage; sectionIndex: number }>();

  constructor(records: WikiChunkRecord[]) {
    const grouped = new Map<string, WikiChunkRecord[]>();
    const apiRecords: WikiChunkRecord[] = [];
    for (const record of records) {
      if (EXCLUDED_FILES.has(record.file)) continue;
      if (record.source === 'bdfd-api') {
        apiRecords.push(record);
        continue;
      }
      const list = grouped.get(record.file) ?? [];
      list.push(record);
      grouped.set(record.file, list);
    }

    const wikiFunctionNames = new Set<string>();
    for (const [file, list] of grouped) {
      // Introduction first; otherwise keep ingest order.
      const ordered = [
        ...list.filter((r) => lastSegment(r.heading) === INTRODUCTION),
        ...list.filter((r) => lastSegment(r.heading) !== INTRODUCTION)
      ];
      const title = pageTitle(file, ordered);
      const isFunction = title.startsWith('$') && FUNCTION_PAGE_PREFIXES.some((prefix) => file.startsWith(prefix));
      if (isFunction) wikiFunctionNames.add(functionName(title));
      this.add({
        file,
        title,
        kind: isFunction ? 'function' : 'guide',
        url: wikiPageUrl(file),
        sections: ordered.map((r) => ({
          heading: lastSegment(r.heading),
          breadcrumb: r.heading,
          document: r.document
        }))
      });
    }

    // Functions the wiki has no page for are still searchable via their official API definition.
    for (const record of apiRecords) {
      const name = posix.basename(record.file, '.md');
      if (wikiFunctionNames.has(name) || this.byFile.has(record.file)) continue;
      this.add({
        file: record.file,
        title: `$${name}`,
        kind: 'function',
        url: null,
        sections: [{ heading: INTRODUCTION, breadcrumb: `$${name}`, document: record.document }]
      });
    }
  }

  private add(page: WikiPage): void {
    const { title, sections } = page;
    const indexed: IndexedPage = {
      page,
      title: fieldTerms(title),
      sections: sections
        .map((section, index) => ({ index, section }))
        .filter(({ section }) => section.heading !== INTRODUCTION)
        .map(({ index, section }) => ({ index, terms: fieldTerms(`${title} ${section.heading}`) }))
    };
    sections.forEach((section, sectionIndex) => this.byDocument.set(section.document, { page, sectionIndex }));
    this.pages.push(indexed);
    this.byFile.set(page.file, indexed);
  }

  get size(): number {
    return this.pages.length;
  }

  get(file: string): WikiPage | undefined {
    return this.byFile.get(file)?.page;
  }

  /** The page/section a retrieved chunk document belongs to (RAG source links). */
  locate(document: string): { page: WikiPage; sectionIndex: number } | undefined {
    return this.byDocument.get(document);
  }

  /** Section text for display, with links kept only where they point at an indexed wiki page. */
  sectionText(page: WikiPage, sectionIndex: number): string {
    const section = page.sections[sectionIndex];
    if (!section) return '';
    return sectionDisplayText(section, page.file, (file) => this.byFile.get(file)?.page.url != null);
  }

  /** `kind` limits results to guides or function references; omitted searches both. */
  search(query: string, limit: number, kind?: WikiPageKind): WikiSearchHit[] {
    const queryWords = words(query);
    if (!queryWords.length) return [];
    const queryCompact = queryWords.join('');

    const hits: WikiSearchHit[] = [];
    for (const entry of this.pages) {
      if (kind && entry.page.kind !== kind) continue;
      const titleScore = fieldScore(queryWords, queryCompact, entry.title);

      let sectionScore = 0;
      let sectionIndex: number | undefined;
      for (const section of entry.sections) {
        const score = fieldScore(queryWords, queryCompact, section.terms) * SECTION_WEIGHT;
        if (score > sectionScore) {
          sectionScore = score;
          sectionIndex = section.index;
        }
      }

      const hit: WikiSearchHit =
        sectionScore > titleScore
          ? { page: entry.page, sectionIndex, score: sectionScore }
          : { page: entry.page, score: titleScore };
      if (hit.score >= MIN_WIKI_SEARCH_SCORE) hits.push(hit);
    }

    return hits
      .sort(
        (a, b) =>
          b.score - a.score || a.page.title.length - b.page.title.length || a.page.title.localeCompare(b.page.title)
      )
      .slice(0, limit);
  }
}

/** mdBook heading id: lowercase, spaces → `-`, anything but letters/digits/`_`/`-` dropped. */
export function headingAnchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
}

export function sectionUrl(page: WikiPage, sectionIndex: number | undefined): string | null {
  if (page.url === null) return null;
  const section = sectionIndex === undefined ? undefined : page.sections[sectionIndex];
  if (!section || section.heading === INTRODUCTION) return page.url;
  return `${page.url}#${headingAnchor(section.heading)}`;
}

/**
 * Relative wiki links (`../bdscript/var.md`) → absolute wiki URLs; images are dropped. With
 * `isPublished`, a link whose target page isn't published (e.g. a typo'd path in the wiki
 * source, which 404s on the wiki too) is reduced to its text.
 */
export function resolveWikiLinks(markdown: string, file: string, isPublished?: (file: string) => boolean): string {
  return markdown.replace(
    /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (match, bang, text: string, target: string) => {
      if (bang) return '';
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return match;

      const [path, anchor] = target.split('#', 2) as [string, string | undefined];
      const resolved = path ? posix.normalize(posix.join(posix.dirname(file), path)) : file;
      if (!resolved.endsWith('.md') || (isPublished && !isPublished(resolved))) return text;
      return `[${text}](${wikiPageUrl(resolved)}${anchor ? `#${anchor}` : ''})`;
    }
  );
}

/** Section text for display: no breadcrumb header, no ingest-only placeholder/boilerplate lines. */
export function sectionDisplayText(
  section: WikiSection,
  file: string,
  isPublished?: (file: string) => boolean
): string {
  const body = section.document
    .replace(/^## [^\n]*\n*/, '')
    .split('\n')
    .filter((line) => !line.startsWith('[Discord UI preview omitted') && !line.startsWith('_Official BDFD public API'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return resolveWikiLinks(body, file, isPublished);
}

/** Cut at a line boundary under `max` chars, closing a code fence the cut left open. */
export function truncateMarkdown(text: string, max: number): string {
  if (text.length <= max) return text;

  const suffix = '\n…';
  const fenceClose = '\n```';
  const budget = max - suffix.length - fenceClose.length;
  let cut = text.slice(0, budget);
  const lastNewline = cut.lastIndexOf('\n');
  if (lastNewline > budget / 2) cut = cut.slice(0, lastNewline);

  const openFence = (cut.match(/```/g)?.length ?? 0) % 2 === 1;
  return `${cut.trimEnd()}${openFence ? fenceClose : ''}${suffix}`;
}
