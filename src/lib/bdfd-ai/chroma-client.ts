import { ChromaClient } from 'chromadb';

export interface ChromaConnectionArgs {
  host: string;
  port: number;
  ssl: boolean;
}

/** `path` is deprecated in favor of `host`/`port`/`ssl` — parse a `CHROMA_URL` into those. */
export function parseChromaUrl(url: string): ChromaConnectionArgs {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 8000,
    ssl: parsed.protocol === 'https:'
  };
}

/** Build a ChromaClient from a `CHROMA_URL` like `http://chroma:8000`. */
export function createChromaClient(url: string): ChromaClient {
  return new ChromaClient(parseChromaUrl(url));
}
