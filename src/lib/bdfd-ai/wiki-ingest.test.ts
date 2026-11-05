import { describe, expect, it } from 'vitest';
import { isWikiPathIncluded, parseSummaryPaths } from './wiki-ingest.js';

describe('parseSummaryPaths', () => {
  it('returns linked pages as src/ paths and skips draft section labels', () => {
    const summary = [
      '# Summary',
      '',
      '[Home](./foreword.md)',
      '',
      '- [Guides]()',
      '    - [Variables](./guides/introduction/variables.md)',
      '    - [$removeButtons[]](./bdscript/removeButtonsComplex.md)',
      '    - [$var](bdscript/var.md) ',
      '    - [Duplicate](./bdscript/var.md)'
    ].join('\n');

    expect(parseSummaryPaths(summary)).toEqual([
      'src/foreword.md',
      'src/guides/introduction/variables.md',
      'src/bdscript/removeButtonsComplex.md',
      'src/bdscript/var.md'
    ]);
  });
});

describe('isWikiPathIncluded', () => {
  it('excludes deprecated BDJS pages', () => {
    expect(isWikiPathIncluded('src/javascript/ban.md')).toBe(false);
    expect(isWikiPathIncluded('src/bdscript/var.md')).toBe(true);
  });
});
