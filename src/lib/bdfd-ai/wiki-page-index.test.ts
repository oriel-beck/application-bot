import { describe, expect, it } from 'vitest';
import {
  headingAnchor,
  resolveWikiLinks,
  sectionDisplayText,
  sectionUrl,
  tokenScore,
  truncateMarkdown,
  WikiPageIndex,
  type WikiChunkRecord
} from './wiki-page-index.js';

function record(file: string, heading: string, document = `## ${heading}\n\nbody`): WikiChunkRecord {
  return { file, heading, document, source: 'wiki' };
}

function apiRecord(name: string): WikiChunkRecord {
  return {
    file: `api/bdfd/${name}.md`,
    heading: `$${name}[...]`,
    document: `## BDFD API: $${name}\n\n_Official BDFD public API definition._\n\n**Syntax:** \`$${name}[...]\``,
    source: 'bdfd-api'
  };
}

const index = new WikiPageIndex([
  record('src/bdscript/var.md', '$var > Introduction'),
  record('src/bdscript/textSplit.md', '$textSplit > Introduction'),
  record('src/bdscript/userAvatar.md', '$userAvatar > Introduction'),
  record('src/guides/variables.md', 'Variables > Introduction'),
  record('src/guides/variables.md', 'Variables > Setting a variable'),
  record('src/guides/slashCommands.md', 'Slash Commands > Introduction'),
  record('src/guides/slashCommands.md', 'Slash Commands > Slash options'),
  record('src/guides/slashCommands.md', 'Slash Commands > Slash options > Retrieving value from options'),
  record('src/SUMMARY.md', 'Summary > Introduction'),
  record('src/noTitle.md', 'Only H2'),
  apiRecord('var'),
  apiRecord('addActionRow')
]);

function titles(query: string): string[] {
  return index.search(query, 5).map((hit) => hit.page.title);
}

describe('tokenScore', () => {
  it('ranks exact > prefix > substring > typo', () => {
    const exact = tokenScore('split', 'split');
    const prefix = tokenScore('spl', 'split');
    const substring = tokenScore('vatar', 'useravatar');
    const typo = tokenScore('spilt', 'split');
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(0);
    expect(typo).toBeGreaterThan(0);
  });

  it('matches a partial and misspelled prefix', () => {
    expect(tokenScore('varibl', 'variables')).toBeGreaterThan(0);
  });

  it('does not fuzzy-match very short words', () => {
    expect(tokenScore('ab', 'xy')).toBe(0);
  });
});

describe('WikiPageIndex', () => {
  it('derives titles from the Introduction breadcrumb, falling back to the file name', () => {
    expect(index.get('src/bdscript/var.md')?.title).toBe('$var');
    expect(index.get('src/noTitle.md')?.title).toBe('noTitle');
  });

  it('locates the page and section a chunk document belongs to', () => {
    const located = index.locate('## Variables > Setting a variable\n\nbody');
    expect(located?.page.title).toBe('Variables');
    expect(located?.sectionIndex).toBe(1);
    expect(index.locate('unknown')).toBeUndefined();
  });

  it('labels function references and guides', () => {
    expect(index.get('src/bdscript/var.md')?.kind).toBe('function');
    expect(index.get('src/guides/variables.md')?.kind).toBe('guide');
  });

  it('links pages to the nightly wiki', () => {
    expect(index.get('src/bdscript/var.md')?.url).toBe('https://wiki.botdesignerdiscord.com/nightly/bdscript/var.html');
  });

  it('adds API-only functions without a URL, but not functions that have a wiki page', () => {
    const actionRow = index.get('api/bdfd/addActionRow.md');
    expect(actionRow).toMatchObject({ title: '$addActionRow', kind: 'function', url: null });
    expect(index.get('api/bdfd/var.md')).toBeUndefined();
    expect(titles('addActonRow')[0]).toBe('$addActionRow');
  });

  it('filters by kind', () => {
    expect(index.search('variables', 5, 'guide').map((h) => h.page.title)).toEqual(['Variables']);
    expect(index.search('var', 5, 'function').every((h) => h.page.kind === 'function')).toBe(true);
  });

  it('skips mdBook SUMMARY.md', () => {
    expect(index.get('src/SUMMARY.md')).toBeUndefined();
  });

  it('finds exact names with or without $', () => {
    expect(titles('$var')[0]).toBe('$var');
    expect(titles('var')[0]).toBe('$var');
  });

  it('ranks an exact title above titles that merely contain the word', () => {
    const exactIndex = new WikiPageIndex([
      record('src/bdscript/getVar.md', '$getVar > Introduction'),
      record('src/bdscript/var.md', '$var > Introduction'),
      record('src/bdscript/setVarSomething.md', '$setVar > Introduction')
    ]);
    const [first, second] = exactIndex.search('var', 5);
    expect(first?.page.title).toBe('$var');
    expect(first!.score).toBeGreaterThan(second!.score);
  });

  it('finds partial queries', () => {
    expect(titles('textspl')).toContain('$textSplit');
    expect(titles('avatar')).toContain('$userAvatar');
  });

  it('finds misspelled queries', () => {
    expect(titles('textSplti')[0]).toBe('$textSplit');
    expect(titles('varaibles')[0]).toBe('Variables');
    expect(titles('slsh comands')[0]).toBe('Slash Commands');
  });

  it('matches camelCase names typed as separate words', () => {
    expect(titles('text split')[0]).toBe('$textSplit');
    expect(titles('user avatar')[0]).toBe('$userAvatar');
  });

  it('points at the matching section when a heading matches better than the title', () => {
    const [hit] = index.search('retrieving value from options', 5);
    expect(hit?.page.title).toBe('Slash Commands');
    expect(hit?.page.sections[hit.sectionIndex!]?.heading).toBe('Retrieving value from options');
  });

  it('returns nothing for unrelated or empty queries', () => {
    expect(index.search('zzqx', 5)).toEqual([]);
    expect(index.search('  ', 5)).toEqual([]);
  });
});

describe('display helpers', () => {
  it('builds mdBook heading anchors', () => {
    expect(headingAnchor('Retrieving value from options')).toBe('retrieving-value-from-options');
    expect(headingAnchor('$var (Example)')).toBe('var-example');
  });

  it('links sections by anchor and the introduction by page url', () => {
    const page = index.get('src/guides/slashCommands.md')!;
    expect(sectionUrl(page, 0)).toBe(page.url);
    expect(sectionUrl(page, 1)).toBe(`${page.url}#slash-options`);
    expect(sectionUrl(page, undefined)).toBe(page.url);
    expect(sectionUrl(index.get('api/bdfd/addActionRow.md')!, 0)).toBeNull();
  });

  it('keeps links only to published pages when given a check', () => {
    const published = (file: string) => file === 'src/bdscript/var.md';
    const out = resolveWikiLinks(
      '[ok](../bdscript/var.md) and [typo](../bdscript/chanelID.md)',
      'src/guides/x.md',
      published
    );
    expect(out).toBe('[ok](https://wiki.botdesignerdiscord.com/nightly/bdscript/var.html) and typo');
  });

  it('strips API boilerplate and unlinks unpublished targets via the index', () => {
    const page = index.get('api/bdfd/addActionRow.md')!;
    expect(index.sectionText(page, 0)).toBe('**Syntax:** `$addActionRow[...]`');
  });

  it('resolves relative links, keeps absolute ones and drops images', () => {
    const out = resolveWikiLinks(
      'See [var](../bdscript/var.md#usage), [here](#below), [site](https://x.com) ![img](pic.png)',
      'src/guides/variables.md'
    );
    expect(out).toBe(
      'See [var](https://wiki.botdesignerdiscord.com/nightly/bdscript/var.html#usage), ' +
        '[here](https://wiki.botdesignerdiscord.com/nightly/guides/variables.html#below), [site](https://x.com) '
    );
  });

  it('strips the breadcrumb header and ingest placeholders from section text', () => {
    const text = sectionDisplayText(
      {
        heading: 'Example',
        breadcrumb: '$var > Example',
        document:
          '## $var > Example\n\nUse it like this:\n\n[Discord UI preview omitted — not BDFD code.]\n\n\n```\n$var[a;b]\n```'
      },
      'src/bdscript/var.md'
    );
    expect(text).toBe('Use it like this:\n\n```\n$var[a;b]\n```');
  });

  it('truncates at a line boundary and closes an open code fence', () => {
    const text = ['intro', '```', ...Array.from({ length: 50 }, (_, i) => `$line[${i}]`), '```'].join('\n');
    const out = truncateMarkdown(text, 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith('```\n…')).toBe(true);
    expect((out.match(/```/g) ?? []).length % 2).toBe(0);
  });

  it('leaves short text untouched', () => {
    expect(truncateMarkdown('short', 100)).toBe('short');
  });
});
