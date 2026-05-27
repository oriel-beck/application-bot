const PASTEBIN_HOST = /^(?:www\.)?pastebin\.com$/i;
const RAW_TXT = /\.(txt|md)(\?.*)?$/i;
const MAX_FETCH_BYTES = 120_000;

const URL_RE = /https?:\/\/[^\s<>]+/gi;

export function extractUrls(text: string): string[] {
    return [...new Set((text.match(URL_RE) ?? []).map((u) => u.replace(/[>,.)]+$/, '')))];
}

export function normalizeFetchUrl(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (PASTEBIN_HOST.test(parsed.hostname)) {
            if (parsed.pathname.startsWith('/raw/')) return url;
            const id = parsed.pathname.replace(/^\//, '').split('/')[0];
            if (id && id !== 'login') return `https://pastebin.com/raw/${id}`;
            return null;
        }
        if (parsed.hostname === 'gist.github.com') {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length >= 2) {
                return `https://gist.githubusercontent.com/${parts[0]}/${parts[1]}/raw`;
            }
        }
        if (
            parsed.hostname === 'raw.githubusercontent.com' ||
            RAW_TXT.test(parsed.pathname) ||
            parsed.pathname.endsWith('/raw')
        ) {
            return url;
        }
        return null;
    } catch {
        return null;
    }
}

export function mentionsOversizedCode(text: string): boolean {
    const lower = text.toLowerCase();
    return (
        /\b(too\s+big|too\s+large|won'?t\s+fit|doesn'?t\s+fit|character\s+limit|char\s+limit)\b/i.test(lower) ||
        /\b(pastebin|paste\.ee|hastebin|gist)\b/i.test(lower)
    );
}

export async function fetchExternalContent(urls: string[]): Promise<string | undefined> {
    const chunks: string[] = [];

    for (const raw of urls) {
        const fetchUrl = normalizeFetchUrl(raw);
        if (!fetchUrl) continue;

        try {
            const res = await fetch(fetchUrl, {
                headers: { 'User-Agent': 'BDFD-Support-Bot/1.0' },
                signal: AbortSignal.timeout(15_000),
            });
            if (!res.ok) continue;

            const buf = await res.arrayBuffer();
            if (buf.byteLength > MAX_FETCH_BYTES) {
                chunks.push(`[Skipped ${fetchUrl}: file exceeds size limit]`);
                continue;
            }

            const text = new TextDecoder('utf-8', { fatal: false }).decode(buf).trim();
            if (text) chunks.push(`--- Content from ${fetchUrl} ---\n${text}`);
        } catch {
            chunks.push(`[Failed to fetch ${fetchUrl}]`);
        }
    }

    return chunks.length ? chunks.join('\n\n') : undefined;
}
