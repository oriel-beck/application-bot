import { describe, expect, it } from 'vitest';
import { extractBdscriptCode } from './check-code.utils.js';

describe('extractBdscriptCode', () => {
  it('uses only code fence bodies when the text has fences', () => {
    expect(extractBdscriptCode('my code is broken:\n```\n$var[a]\n```\nand\n```js\n$var[b]\n```')).toBe(
      '$var[a]\n$var[b]'
    );
  });

  it('falls back to the whole text when there are no fences', () => {
    expect(extractBdscriptCode('  $argsCheck[2;hi\\;]  ')).toBe('$argsCheck[2;hi\\;]');
  });
});
