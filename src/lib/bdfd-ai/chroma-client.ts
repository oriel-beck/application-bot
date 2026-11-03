import { ChromaClient } from 'chromadb';

/**
 * Build a ChromaClient from a `CHROMA_URL` like `http://chroma:8000`.
 * `path` is deprecated in favor of `host`/`port`/`ssl` — parse the URL into those instead.
 */
export function createChromaClient(url: string): ChromaClient {
  const parsed = new URL(url);
  return new ChromaClient({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 8000,
    ssl: parsed.protocol === 'https:'
  });
}
