const DISCORD_API_BASE = 'https://discord.com/api/v10';
const MAX_MESSAGE_FETCH = 100;
const DEFAULT_CHANNEL_MESSAGE_LIMIT = 500;
const MAX_MESSAGE_DOC_CHARS = 2800;

export interface DiscordIngestMessage {
    id: string;
    content?: string;
    timestamp?: string;
    author?: {
        id: string;
        username: string;
        global_name?: string | null;
    };
    attachments?: Array<{ filename?: string; url?: string; content_type?: string | null }>;
    embeds?: Array<{
        title?: string;
        description?: string;
        url?: string;
        author?: { name?: string };
        footer?: { text?: string };
        fields?: Array<{ name?: string; value?: string; inline?: boolean }>;
    }>;
}

export interface DiscordChannelChunk {
    id: string;
    document: string;
    metadata: {
        file: string;
        heading: string;
        url: string;
        source: 'discord';
    };
}

interface FetchChannelMessagesOptions {
    token: string;
    channelId: string;
    maxMessages: number;
}

function cleanLine(text: string): string {
    return text.replace(/\r/g, '').trim();
}

function ellipsize(text: string, max: number): string {
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function formatMessageDoc(channelId: string, msg: DiscordIngestMessage): string {
    const authorName = msg.author?.global_name?.trim() || msg.author?.username?.trim() || 'unknown-user';
    const lines: string[] = [];
    lines.push(`## Discord guide/faq message (${channelId})`);
    lines.push('');
    lines.push(`**Author:** ${authorName}`);
    lines.push(`**Timestamp:** ${msg.timestamp ?? 'unknown'}`);
    lines.push('');

    const body = cleanLine(msg.content ?? '');
    if (body) {
        lines.push('**Content:**');
        lines.push(body);
        lines.push('');
    }

    const embedText = (msg.embeds ?? [])
        .map((embed, i) => {
            const title = cleanLine(embed.title ?? '');
            const description = cleanLine(embed.description ?? '');
            const url = cleanLine(embed.url ?? '');
            const author = cleanLine(embed.author?.name ?? '');
            const footer = cleanLine(embed.footer?.text ?? '');
            const fieldLines = (embed.fields ?? [])
                .map((field) => {
                    const fieldName = cleanLine(field.name ?? '');
                    const fieldValue = cleanLine(field.value ?? '');
                    if (!fieldName && !fieldValue) return '';
                    const inlineLabel = field.inline ? ' (inline)' : '';
                    return `- ${fieldName || 'field'}${inlineLabel}: ${fieldValue || '—'}`;
                })
                .filter(Boolean);

            const lines: string[] = [`Embed ${i + 1}`];
            if (author) lines.push(`author: ${author}`);
            if (title) lines.push(`title: ${title}`);
            if (description) lines.push(`description: ${description}`);
            if (url) lines.push(`url: ${url}`);
            if (fieldLines.length) {
                lines.push('fields:');
                lines.push(...fieldLines);
            }
            if (footer) lines.push(`footer: ${footer}`);
            return lines.join('\n');
        })
        .filter(Boolean);
    if (embedText.length) {
        lines.push('**Embeds:**');
        lines.push(...embedText);
        lines.push('');
    }

    const attachments = (msg.attachments ?? [])
        .map((att) => {
            const name = cleanLine(att.filename ?? 'attachment');
            const url = cleanLine(att.url ?? '');
            const type = cleanLine(att.content_type ?? '');
            return `${name}${type ? ` (${type})` : ''}${url ? `: ${url}` : ''}`;
        })
        .filter(Boolean);
    if (attachments.length) {
        lines.push('**Attachments:**');
        lines.push(...attachments);
    }

    return ellipsize(lines.join('\n').trim(), MAX_MESSAGE_DOC_CHARS);
}

function parseRetryAfterMs(raw: string | null): number {
    const seconds = Number(raw ?? '');
    if (!Number.isFinite(seconds) || seconds <= 0) return 1_000;
    return Math.ceil(seconds * 1_000);
}

async function discordApiGet<T>(path: string, token: string): Promise<T> {
    const url = `${DISCORD_API_BASE}${path}`;
    let attempts = 0;

    while (true) {
        attempts++;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bot ${token}`,
                'User-Agent': 'BDFD-Support-Bot-Ingest/1.0',
            },
        });

        if (res.status === 429) {
            if (attempts >= 5) {
                throw new Error(`Discord API rate limited too many times for ${path}`);
            }
            const waitMs = parseRetryAfterMs(res.headers.get('retry-after'));
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
        }

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Discord API request failed (${res.status}) ${path}: ${body.slice(0, 300)}`);
        }

        return (await res.json()) as T;
    }
}

export async function fetchChannelMessages(
    options: FetchChannelMessagesOptions
): Promise<DiscordIngestMessage[]> {
    const { token, channelId, maxMessages } = options;
    const out: DiscordIngestMessage[] = [];
    let beforeId: string | undefined;

    while (out.length < maxMessages) {
        const remaining = maxMessages - out.length;
        const limit = Math.min(MAX_MESSAGE_FETCH, remaining);
        const query = beforeId
            ? `/channels/${channelId}/messages?limit=${limit}&before=${beforeId}`
            : `/channels/${channelId}/messages?limit=${limit}`;
        const page = await discordApiGet<DiscordIngestMessage[]>(query, token);
        if (!page.length) break;

        out.push(...page);
        beforeId = page.at(-1)?.id;
        if (!beforeId) break;
    }

    return out;
}

function buildDiscordMessageUrl(guildId: string | undefined, channelId: string, messageId: string): string {
    return `https://discord.com/channels/${guildId ?? '@me'}/${channelId}/${messageId}`;
}

function isUsefulMessage(message: DiscordIngestMessage): boolean {
    const hasText = Boolean(cleanLine(message.content ?? ''));
    const hasEmbeds = Boolean(message.embeds?.length);
    const hasAttachments = Boolean(message.attachments?.length);
    return hasText || hasEmbeds || hasAttachments;
}

export async function ingestDiscordChannels(params: {
    token: string;
    channelIds: string[];
    guildId?: string;
    maxMessagesPerChannel?: number;
}): Promise<DiscordChannelChunk[]> {
    const maxMessagesPerChannel = params.maxMessagesPerChannel ?? DEFAULT_CHANNEL_MESSAGE_LIMIT;
    const chunks: DiscordChannelChunk[] = [];

    for (const channelId of params.channelIds) {
        const messages = await fetchChannelMessages({
            token: params.token,
            channelId,
            maxMessages: maxMessagesPerChannel,
        });

        for (const message of messages) {
            if (!isUsefulMessage(message)) continue;
            const doc = formatMessageDoc(channelId, message);
            if (!doc) continue;

            const heading = `#${channelId} message by ${message.author?.username ?? 'unknown-user'}`;
            chunks.push({
                id: `discord/${channelId}/${message.id}`,
                document: doc,
                metadata: {
                    file: `discord/channels/${channelId}`,
                    heading,
                    url: buildDiscordMessageUrl(params.guildId, channelId, message.id),
                    source: 'discord',
                },
            });
        }
    }

    return chunks;
}
