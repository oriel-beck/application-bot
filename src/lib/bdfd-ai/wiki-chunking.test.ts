import { describe, expect, it } from 'vitest';
import { chunkMarkdown, MAX_CHUNK_CHARS, slugify } from './wiki-chunking.js';

describe('slugify', () => {
  it('lowercases and dashes non-word runs', () => {
    expect(slugify('Retrieving value from options')).toBe('retrieving-value-from-options');
  });

  it('trims leading/trailing dashes', () => {
    expect(slugify('--Hello!!--')).toBe('hello');
  });
});

describe('chunkMarkdown', () => {
  it('splits on H2/H3 headings and prefixes each with a page/section breadcrumb', () => {
    const content = [
      '# Slash Commands',
      '',
      'intro text',
      '',
      '## Slash options',
      '',
      'options text',
      '',
      '### Retrieving value from options',
      '',
      'Use `$message[<option name>]`.'
    ].join('\n');

    const chunks = chunkMarkdown('src/guides/slashCommands.md', content);
    const headings = chunks.map((c) => c.metadata.heading);

    expect(headings).toEqual([
      'Slash Commands > Introduction',
      'Slash Commands > Slash options',
      'Slash Commands > Slash options > Retrieving value from options'
    ]);

    const target = chunks.find((c) => c.metadata.heading.includes('Retrieving value from options'));
    expect(target?.document).toContain('$message[<option name>]');
  });

  it('gives repeated headings unique chunk ids so Chroma upsert does not overwrite them', () => {
    const content = ['# CHANGELOG', '', '## January', '', 'first entry', '', '## January', '', 'second entry'].join(
      '\n'
    );

    const chunks = chunkMarkdown('src/changelog.md', content);
    const ids = chunks.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(chunks[1]!.document).toContain('first entry');
    expect(chunks[2]!.document).toContain('second entry');
  });

  it('truncates an overlong chunk to MAX_CHUNK_CHARS', () => {
    const longBody = 'x'.repeat(MAX_CHUNK_CHARS + 500);
    const content = `# Title\n\n## Section\n\n${longBody}`;
    const chunks = chunkMarkdown('src/long.md', content);
    expect(chunks[0]!.document.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
  });

  it('produces no chunk for a page with no heading-level content', () => {
    expect(chunkMarkdown('src/empty.md', '')).toEqual([]);
  });
});
