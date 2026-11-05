import { describe, expect, it } from 'vitest';
import { WikiPageIndex, type WikiChunkRecord } from '@lib/bdfd-ai/wiki-page-index.js';
import { buildSearchChoices, buildSearchResultEmbed, resolvePickedResult } from './search.utils.js';

function record(file: string, heading: string, body = 'body'): WikiChunkRecord {
  return { file, heading, document: `## ${heading}\n\n${body}`, source: 'wiki' };
}

const index = new WikiPageIndex([
  record('src/guides/slashCommands.md', 'Slash Commands > Introduction', 'Slash commands intro.'),
  record('src/guides/slashCommands.md', 'Slash Commands > Slash options', 'Options text.'),
  record('src/bdscript/var.md', '$var > Introduction', 'Sets or gets a temp variable.'),
  {
    file: 'api/bdfd/addActionRow.md',
    heading: '$addActionRow',
    document: '## BDFD API: $addActionRow\n\n**Syntax:** `$addActionRow`',
    source: 'bdfd-api'
  }
]);

describe('autocomplete choices', () => {
  it('round-trips a picked page and section through the choice value', () => {
    const hits = index.search('slash options', 5);
    const [choice] = buildSearchChoices(hits);
    expect(choice?.name).toBe('Slash Commands › Slash options · Guide');

    const picked = resolvePickedResult(choice!.value, index);
    expect(picked?.page.file).toBe('src/guides/slashCommands.md');
    expect(picked?.sectionIndex).toBe(1);
  });

  it('round-trips a whole-page pick', () => {
    const [choice] = buildSearchChoices(index.search('var', 5));
    expect(choice?.value).toBe('page:src/bdscript/var.md');
    expect(resolvePickedResult(choice!.value, index)?.sectionIndex).toBeUndefined();
  });

  it('treats free text and unknown pages as a search, not a pick', () => {
    expect(resolvePickedResult('slash options', index)).toBeUndefined();
    expect(resolvePickedResult('page:src/missing.md', index)).toBeUndefined();
  });

  it('ignores an out-of-range section index', () => {
    const picked = resolvePickedResult('page:src/bdscript/var.md#9', index);
    expect(picked?.page.title).toBe('$var');
    expect(picked?.sectionIndex).toBeUndefined();
  });

  it('falls back to the label when the value would exceed 100 chars', () => {
    const longFile = `src/${'a'.repeat(120)}.md`;
    const longIndex = new WikiPageIndex([record(longFile, 'Long Page > Introduction')]);
    const [choice] = buildSearchChoices(longIndex.search('long page', 5));
    expect(choice?.value).toBe('Long Page');
  });
});

describe('buildSearchResultEmbed', () => {
  it('shows the section text, links other sections and other results', () => {
    const [best, ...others] = [...index.search('slash commands', 5), ...index.search('var', 5)];
    const embed = buildSearchResultEmbed(best!, others, index).toJSON();

    expect(embed.title).toBe('Slash Commands');
    expect(embed.url).toBe('https://wiki.botdesignerdiscord.com/nightly/guides/slashCommands.html');
    expect(embed.description).toBe('Slash commands intro.');
    expect(embed.fields?.find((f) => f.name === 'On this page')?.value).toContain('#slash-options');
    expect(embed.fields?.find((f) => f.name === 'Other results')?.value).toContain('[$var]');
  });

  it('shows an API-only function without a link', () => {
    const [hit] = index.search('addActionRow', 1);
    const embed = buildSearchResultEmbed(hit!, [], index).toJSON();
    expect(embed.url).toBeUndefined();
    expect(embed.description).toBe('**Syntax:** `$addActionRow`');
    expect(embed.footer?.text).toContain('no wiki page yet');
  });
});
