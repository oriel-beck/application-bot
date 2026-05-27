/**
 * Ingest BDFD wiki markdown into Chroma. Run after build:
 *   node dist/src/scripts/ingest-wiki.js
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import OpenAI from 'openai';
import { ChromaClient } from 'chromadb';
import { createHash } from 'crypto';
import {
    bdfdApiCallbacksToChunks,
    bdfdApiFunctionsToChunks,
    fetchBdfdCallbackList,
    fetchBdfdFunctionList,
    registerBdscriptCallbacksFromApi,
    registerBdscriptFunctionsFromApi,
} from '../lib/bdfd-ai/bdfd-api.js';
import {
    bdscriptFunctionIndexToJson,
    registerBdscriptFunctionsFromMarkdown,
    type BdscriptFunctionIndex,
} from '../lib/bdfd-ai/bdscript-function-index.js';
import { isWikiPathIncluded } from '../lib/bdfd-ai/wiki-ingest.js';
import { normalizeWikiMarkdownForRag } from '../lib/bdfd-ai/wiki-markdown.js';

const WIKI_REPO = 'NilPointer-Software/bdfd-wiki';
const WIKI_BRANCH = 'dev';
const COLLECTION_NAME = 'bdfd-wiki';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_CHUNK_CHARS = 3200;

interface WikiChunk {
    id: string;
    document: string;
    metadata: { file: string; heading: string; url: string; source: 'wiki' | 'bdfd-api' };
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}

function chunkMarkdown(filePath: string, content: string): WikiChunk[] {
    const chunks: WikiChunk[] = [];
    const lines = content.split('\n');
    let currentHeading = 'Introduction';
    let body: string[] = [];

    const flush = () => {
        const text = body.join('\n').trim();
        if (!text && currentHeading === 'Introduction') return;
        const doc = `## ${currentHeading}\n\n${text}`.trim();
        if (!doc) return;

        const headingSlug = slugify(currentHeading);
        const id = `${filePath}#${headingSlug}`;
        const wikiPath = filePath.replace(/^src\//, '').replace(/\.md$/, '.html');
        chunks.push({
            id,
            document: doc.slice(0, MAX_CHUNK_CHARS),
            metadata: {
                file: filePath,
                heading: currentHeading,
                url: `https://wiki.botdesignerdiscord.com/${wikiPath}`,
                source: 'wiki',
            },
        });
        body = [];
    };

    for (const line of lines) {
        const headingMatch = /^#{2,3}\s+(.+)$/.exec(line);
        if (headingMatch) {
            flush();
            currentHeading = headingMatch[1]!.trim();
            continue;
        }
        body.push(line);
    }
    flush();

    return chunks;
}

async function listMarkdownPaths(): Promise<string[]> {
    const res = await fetch(
        `https://api.github.com/repos/${WIKI_REPO}/git/trees/${WIKI_BRANCH}?recursive=1`,
        { headers: { 'User-Agent': 'BDFD-Support-Bot-Ingest' } }
    );
    if (!res.ok) throw new Error(`GitHub tree fetch failed: ${res.status}`);

    const data = (await res.json()) as { tree: { path: string; type: string }[] };
    return data.tree
        .filter(
            (t) =>
                t.type === 'blob' &&
                t.path.endsWith('.md') &&
                t.path.startsWith('src/') &&
                isWikiPathIncluded(t.path)
        )
        .map((t) => t.path);
}

async function fetchMarkdown(path: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${WIKI_REPO}/${WIKI_BRANCH}/${path}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'BDFD-Support-Bot-Ingest' } });
    if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
    return res.text();
}

async function embedBatch(openai: OpenAI, texts: string[]): Promise<number[][]> {
    const res = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
    });
    return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function main() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required');

    const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
    const openai = new OpenAI({ apiKey });
    const chroma = new ChromaClient({ path: chromaUrl });

    try {
        await chroma.deleteCollection({ name: COLLECTION_NAME });
        console.log(`Cleared existing collection "${COLLECTION_NAME}"`);
    } catch {
        /* collection may not exist on first run */
    }
    const collection = await chroma.createCollection({ name: COLLECTION_NAME });

    console.log('Listing wiki markdown files (BDScript/docs only; src/javascript/ excluded)...');
    const paths = await listMarkdownPaths();
    console.log(`Found ${paths.length} markdown files`);

    const allChunks: WikiChunk[] = [];
    const functionIndex: BdscriptFunctionIndex = new Map();

    for (const path of paths) {
        const raw = await fetchMarkdown(path);
        registerBdscriptFunctionsFromMarkdown(path, raw, functionIndex);
        const content = normalizeWikiMarkdownForRag(raw);
        allChunks.push(...chunkMarkdown(path, content));
    }
    console.log(`Prepared ${allChunks.length} wiki chunks`);

    console.log('Fetching BDFD public API function_list...');
    const apiFunctions = await fetchBdfdFunctionList();
    const apiAdded = registerBdscriptFunctionsFromApi(apiFunctions, functionIndex);
    const apiChunks = bdfdApiFunctionsToChunks(apiFunctions);
    allChunks.push(...apiChunks);
    console.log(
        `Added ${apiChunks.length} function API chunks (${apiAdded} new names in function index)`
    );

    console.log('Fetching BDFD public API callback_list...');
    const apiCallbacks = await fetchBdfdCallbackList();
    const callbackAdded = registerBdscriptCallbacksFromApi(apiCallbacks, functionIndex);
    const callbackChunks = bdfdApiCallbacksToChunks(apiCallbacks);
    allChunks.push(...callbackChunks);
    console.log(
        `Added ${callbackChunks.length} callback API chunks (${callbackAdded} new names in function index)`
    );
    console.log(`Prepared ${allChunks.length} total chunks`);

    const indexPath = join(process.cwd(), 'json', 'bdscript-functions.json');
    await writeFile(indexPath, `${JSON.stringify(bdscriptFunctionIndexToJson(functionIndex), null, 2)}\n`);
    console.log(`Wrote ${functionIndex.size} BDScript functions to ${indexPath}`);

    const BATCH = 32;
    for (let i = 0; i < allChunks.length; i += BATCH) {
        const batch = allChunks.slice(i, i + BATCH);
        const embeddings = await embedBatch(
            openai,
            batch.map((c) => c.document)
        );

        await collection.upsert({
            ids: batch.map((c) => c.id),
            documents: batch.map((c) => c.document),
            metadatas: batch.map((c) => c.metadata),
            embeddings,
        });

        console.log(`Upserted ${Math.min(i + BATCH, allChunks.length)} / ${allChunks.length}`);
    }

    console.log('Ingest complete.', createHash('sha256').update(String(allChunks.length)).digest('hex').slice(0, 8));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
