import { describe, expect, it } from 'vitest';
import { normalizeWikiMarkdownForRag } from './wiki-markdown.js';

describe('normalizeWikiMarkdownForRag', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeWikiMarkdownForRag('# Title\r\n\r\nSome text\r\n')).toBe('# Title\n\nSome text');
  });

  it('strips a discord-yaml preview fence and replaces it with a placeholder note', () => {
    const input = ['before', '```discord yaml', '- user_id: 1', '  content: hi', '```', 'after'].join('\n');
    const out = normalizeWikiMarkdownForRag(input);
    expect(out).not.toContain('user_id');
    expect(out).toContain('[Discord UI preview omitted');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });

  it('converts an admonish fence to a blockquote, leaving a real code fence untouched', () => {
    const input = [
      '```admonish danger title="BDScript 2"',
      'Can only be used in BDScript 2.',
      '```',
      '',
      '```',
      '$var[Name;(Value)]',
      '```'
    ].join('\n');

    const out = normalizeWikiMarkdownForRag(input);
    expect(out).toContain('> Can only be used in BDScript 2.');
    expect(out).not.toContain('```admonish');
    expect(out).toContain('```\n$var[Name;(Value)]\n```');
  });

  it('collapses 3+ blank lines down to one', () => {
    expect(normalizeWikiMarkdownForRag('a\n\n\n\n\nb')).toBe('a\n\nb');
  });
});
