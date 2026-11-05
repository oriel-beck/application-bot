import { Colors, EmbedBuilder, type APIApplicationCommandOptionChoice } from 'discord.js';
import { WIKI_BASE_URL } from '@lib/bdfd-ai/wiki-ingest.js';
import {
  sectionUrl,
  truncateMarkdown,
  type WikiPage,
  type WikiPageIndex,
  type WikiSearchHit
} from '@lib/bdfd-ai/wiki-page-index.js';

/** Autocomplete values for a picked result: `page:<file>` or `page:<file>#<section index>`. */
const PICK_PREFIX = 'page:';
const CHOICE_MAX = 100;
const EXCERPT_MAX = 2500;
const FIELD_VALUE_MAX = 1024;
const MAX_PAGE_SECTIONS = 10;
export const SEARCH_RESULT_LIMIT = 6;

const KIND_LABEL = { guide: 'Guide', function: 'Function' } as const;

function hitLabel(hit: WikiSearchHit): string {
  const section = hit.sectionIndex === undefined ? undefined : hit.page.sections[hit.sectionIndex];
  return section ? `${hit.page.title} › ${section.heading}` : hit.page.title;
}

export function buildSearchChoices(hits: WikiSearchHit[]): APIApplicationCommandOptionChoice<string>[] {
  return hits.map((hit) => {
    const name = `${hitLabel(hit)} · ${KIND_LABEL[hit.page.kind]}`.slice(0, CHOICE_MAX);
    const value = `${PICK_PREFIX}${hit.page.file}${hit.sectionIndex === undefined ? '' : `#${hit.sectionIndex}`}`;
    // A value Discord would reject falls back to the label, which searches back to the same page.
    return { name, value: value.length <= CHOICE_MAX ? value : hitLabel(hit).slice(0, CHOICE_MAX) };
  });
}

/** The page/section a picked autocomplete value points at, or `undefined` for free text. */
export function resolvePickedResult(value: string, index: WikiPageIndex): WikiSearchHit | undefined {
  if (!value.startsWith(PICK_PREFIX)) return undefined;
  const match = /^(.*?)(?:#(\d+))?$/.exec(value.slice(PICK_PREFIX.length))!;
  const page = index.get(match[1]!);
  if (!page) return undefined;
  const sectionIndex = match[2] === undefined ? undefined : Number(match[2]);
  return {
    page,
    sectionIndex: sectionIndex !== undefined && page.sections[sectionIndex] ? sectionIndex : undefined,
    score: 1
  };
}

/** A markdown link, or plain text plus a note when there's no wiki page to link to. */
function link(label: string, url: string | null): string {
  const text = label.replace(/[[\]]/g, '');
  return url ? `[${text}](${url})` : `${text} _(no wiki page yet)_`;
}

/** As many lines as fit in a single embed field value. */
function fieldLines(lines: string[]): string {
  let value = '';
  for (const line of lines) {
    const next = value ? `${value}\n${line}` : line;
    if (next.length > FIELD_VALUE_MAX) break;
    value = next;
  }
  return value;
}

function pageSectionsField(page: WikiPage, current: number): string {
  const lines = page.sections
    .map((section, index) => ({ section, index }))
    .filter(({ section, index }) => index !== current && section.heading !== 'Introduction')
    .slice(0, MAX_PAGE_SECTIONS)
    .map(({ section, index }) => `- ${link(section.heading, sectionUrl(page, index))}`);
  return fieldLines(lines);
}

/** Embed for the best hit (its section text) plus links to the other results. */
export function buildSearchResultEmbed(
  best: WikiSearchHit,
  others: WikiSearchHit[],
  index: WikiPageIndex
): EmbedBuilder {
  const { page } = best;
  const sectionIndex = best.sectionIndex ?? 0;
  const excerpt = truncateMarkdown(index.sectionText(page, sectionIndex), EXCERPT_MAX);
  const url = sectionUrl(page, best.sectionIndex);

  const embed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle(hitLabel(best).slice(0, 256))
    .setDescription(excerpt || '_This section has no text — open the page for details._')
    .setFooter({
      text: url
        ? `BDFD Wiki · ${KIND_LABEL[page.kind]} · Ask about it with /search ai`
        : 'Official BDFD function list · This function has no wiki page yet'
    });
  if (url) embed.setURL(url);

  const sections = pageSectionsField(page, sectionIndex);
  if (sections) embed.addFields({ name: 'On this page', value: sections });

  const otherLines = others.map((hit) => `- ${link(hitLabel(hit), sectionUrl(hit.page, hit.sectionIndex))}`);
  const otherValue = fieldLines(otherLines);
  if (otherValue) embed.addFields({ name: 'Other results', value: otherValue });

  return embed;
}

export function buildNoResultsEmbed(query: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.Grey)
    .setTitle('No wiki pages found')
    .setDescription(
      `Nothing in the wiki matched **${query.slice(0, 200).replace(/[*_`~|]/g, '')}**.\n` +
        'Try fewer or different words, or ask a question with `/search ai`. ' +
        `You can also browse ${WIKI_BASE_URL}`
    );
}
