import {
    AttachmentBuilder,
    Colors,
    EmbedBuilder,
    type MessageEditOptions,
    type MessageReplyOptions,
} from 'discord.js';

export const AI_EMBED_MAX = 4000;
const AI_EMBED_ATTACH_THRESHOLD = 3900;
const AI_EMBED_SUMMARY_MAX = 500;

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

export function buildDisabledEmbed(): EmbedBuilder {
    return buildAiEmbed(
        'The AI assistant is currently turned off. Please wait for a staff member to help you.'
    );
}

export function buildPastePromptEmbed(): EmbedBuilder {
    return buildAiEmbed(
        "Your code looks too large to send in Discord. Please upload it to a **pastebin** (use the raw link) or a **.txt** file URL, then reply to this message with that link so I can read it."
    );
}

export function formatAiPayload(text: string): MessageReplyOptions & MessageEditOptions {
    if (text.length <= AI_EMBED_ATTACH_THRESHOLD) {
        return { embeds: [buildAiEmbed(text)] };
    }

    const summary =
        text.slice(0, AI_EMBED_SUMMARY_MAX) +
        (text.length > AI_EMBED_SUMMARY_MAX ? '\n\n…' : '') +
        '\n\n**Full response is attached as `bdfd-ai-response.txt`.**';

    const file = new AttachmentBuilder(Buffer.from(text, 'utf-8'), {
        name: 'bdfd-ai-response.txt',
    });

    return {
        embeds: [buildAiEmbed(summary.slice(0, AI_EMBED_MAX))],
        files: [file],
    };
}

export interface ThinkingSurface {
    edit: (options: MessageEditOptions) => Promise<unknown>;
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
