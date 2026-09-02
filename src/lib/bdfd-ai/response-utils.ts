import {
    AttachmentBuilder,
    Colors,
    EmbedBuilder,
    type InteractionEditReplyOptions,
} from 'discord.js';

/** Payload for AI output — valid for slash `editReply` / `reply` (and channel replies via cast). */
export type AiReplyPayload = InteractionEditReplyOptions;

/** Discord embed description limit — attach .txt when response exceeds this */
export const DISCORD_EMBED_DESCRIPTION_MAX = 4000; // Leave some space
export const AI_EMBED_ATTACH_THRESHOLD = DISCORD_EMBED_DESCRIPTION_MAX;

const AI_EMBED_PREVIEW_MAX = 500;
const ATTACHMENT_NOTICE =
    '\n\n**Full response is attached as `bdfd-ai-response.txt`.**';
const ATTACHMENT_FILENAME = 'bdfd-ai-response.txt';

/** Shown on successful RAG replies (not rate-limit / unavailable embeds). */
export const AI_RESPONSE_DISCLAIMER =
    'AI-generated from the wiki — may be inaccurate. Verify important details or ask staff.';

export function shouldAttachAiResponse(text: string): boolean {
    return text.length > DISCORD_EMBED_DESCRIPTION_MAX;
}

export const THINKING_STATUSES = [
    'Thinking...',
    'Searching the wiki...',
    'Analyzing your message...',
    'Preparing a response...',
] as const;

export function buildThinkingEmbed(status: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(Colors.Grey)
        .setTitle('BDFD AI')
        .setDescription(status);
}

export function buildAiEmbed(description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle('BDFD AI')
        .setDescription(description);
}

export function buildAiResponseEmbed(description: string): EmbedBuilder {
    return buildAiEmbed(description).setFooter({ text: AI_RESPONSE_DISCLAIMER });
}

export function buildRateLimitEmbed(limit: number): EmbedBuilder {
    return buildAiEmbed(
        `You've used all **${limit}** AI responses allowed in this channel. Please wait for a staff member, or open a new ticket/post if you still need help.`
    );
}

export function buildBusyEmbed(): EmbedBuilder {
    return buildAiEmbed(
        "I'm still working on your previous question. Please wait until I finish before sending another reply."
    );
}

export function buildUnavailableEmbed(): EmbedBuilder {
    return buildAiEmbed(
        'The AI assistant is currently unavailable. Please wait for a staff member to help you.'
    );
}

export function buildValidationFailedEmbed(): EmbedBuilder {
    return buildAiEmbed(
        "I couldn't put together a verified answer. Please try asking again with more detail " +
            '(e.g. the exact command or reply code you\'re working with) — this attempt did not count against your usage limit.'
    );
}

export function buildDisabledEmbed(): EmbedBuilder {
    return buildAiEmbed(
        'The AI assistant is currently turned off. Please wait for a staff member to help you.'
    );
}

export function formatAiPayload(text: string): AiReplyPayload {
    if (!shouldAttachAiResponse(text)) {
        return { embeds: [buildAiResponseEmbed(text)] };
    }

    const previewBody =
        text.slice(0, AI_EMBED_PREVIEW_MAX) + (text.length > AI_EMBED_PREVIEW_MAX ? '\n\n…' : '');
    const previewMax = DISCORD_EMBED_DESCRIPTION_MAX - ATTACHMENT_NOTICE.length;
    const description = (previewBody + ATTACHMENT_NOTICE).slice(0, previewMax);

    const file = new AttachmentBuilder(Buffer.from(text, 'utf-8'), {
        name: ATTACHMENT_FILENAME,
    });

    return {
        embeds: [buildAiResponseEmbed(description)],
        files: [file],
    };
}

export interface ThinkingSurface {
    edit: (options: AiReplyPayload) => Promise<unknown>;
}

export function startThinkingAnimation(
    surface: ThinkingSurface,
    intervalMs = 2500
): { stop: () => void } {
    let index = 0;
    const interval = setInterval(() => {
        index = (index + 1) % THINKING_STATUSES.length;
        surface
            .edit({ embeds: [buildThinkingEmbed(THINKING_STATUSES[index]!)] })
            .catch(() => null);
    }, intervalMs);

    return {
        stop: () => clearInterval(interval),
    };
}
