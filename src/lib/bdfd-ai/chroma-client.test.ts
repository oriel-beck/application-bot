import { describe, expect, it } from 'vitest';
import { parseChromaUrl } from './chroma-client.js';

describe('parseChromaUrl', () => {
  it('parses the docker-compose default URL', () => {
    expect(parseChromaUrl('http://chroma:8000')).toEqual({ host: 'chroma', port: 8000, ssl: false });
  });

  it('parses localhost', () => {
    expect(parseChromaUrl('http://localhost:8000')).toEqual({ host: 'localhost', port: 8000, ssl: false });
  });

  it('detects ssl from https', () => {
    expect(parseChromaUrl('https://chroma.example.com:8443')).toEqual({
      host: 'chroma.example.com',
      port: 8443,
      ssl: true
    });
  });

  it('defaults to port 8000 when none is given', () => {
    expect(parseChromaUrl('https://chroma.example.com')).toEqual({
      host: 'chroma.example.com',
      port: 8000,
      ssl: true
    });
  });
});
