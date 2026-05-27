import type { Container } from '@sapphire/pieces';
import type { Command } from '@sapphire/framework';
import type { InteractionReplyOptions, Message, MessageEditOptions, MessageReplyOptions } from 'discord.js';
import type { AiReplyPayload } from './response-utils.js';
import {
    buildBusyEmbed,
    buildDisabledEmbed,
    buildRateLimitEmbed,
    buildThinkingEmbed,
    buildUnavailableEmbed,
    formatAiPayload,
    startThinkingAnimation,
    THINKING_STATUSES,
} from './response-utils.js';

export type AiRequestSource =
    | { type: 'message'; message: Message<true> }
    | { type: 'interaction'; interaction: Command.ChatInputCommandInteraction };

export interface ProcessAiRequestOptions {
    container: Container;
    channelId: string;
    userText: string;
    source: AiRequestSource;
    /** When true, skips `settings.ai_enabled` (used by `/ai`). */
    ignoreAiEnabled?: boolean;
    /** When true, skips channel usage limits, thinking lock, and conversation persistence (`/ai`). */
    skipChannelTracking?: boolean;
}

type EditableMessage = {
    edit: (options: AiReplyPayload) => Promise<unknown>;
};

function toInteractionReply(options: AiReplyPayload): InteractionReplyOptions {
    return {
        ...(options.content != null ? { content: options.content } : {}),
        embeds: options.embeds,
        files: options.files,
        components: options.components,
        allowedMentions: options.allowedMentions,
    };
}

async function replyInteraction(
    interaction: Command.ChatInputCommandInteraction,
    options: AiReplyPayload
) {
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(options).catch(() => null);
    } else {
        await interaction.reply(toInteractionReply(options)).catch(() => null);
    }
}

async function createThinkingSurface(
    source: AiRequestSource
): Promise<EditableMessage | null> {
    if (source.type === 'message') {
        const thinking: MessageReplyOptions = { embeds: [buildThinkingEmbed(THINKING_STATUSES[0]!)] };
        const msg = await source.message.reply(thinking).catch(() => null);
        if (!msg) return null;
        return {
            edit: (options) => msg.edit(options as MessageEditOptions),
        };
    }

    await source.interaction.deferReply();
    await source.interaction
        .editReply({ embeds: [buildThinkingEmbed(THINKING_STATUSES[0]!)] })
        .catch(() => null);

    return {
        edit: (options) => source.interaction.editReply(options),
    };
}

export async function processAiRequest(options: ProcessAiRequestOptions): Promise<void> {
    const { container, channelId, userText, source, ignoreAiEnabled, skipChannelTracking } =
        options;

    const settings = await container.settings.get(container.config.guild).catch(() => null);
    if (!ignoreAiEnabled && !settings?.at(0)?.aiEnabled) {
        const payload = { embeds: [buildDisabledEmbed()] };
        if (source.type === 'message') {
            await source.message.reply(payload).catch(() => null);
        } else {
            await replyInteraction(source.interaction, payload);
        }
        return;
    }

    if (!skipChannelTracking) {
        const gate = await container.aiRate.canRespond(channelId);
        if (!gate.ok) {
            const embed =
                gate.reason === 'busy' ? buildBusyEmbed() : buildRateLimitEmbed(gate.limit);
            const payload = { embeds: [embed] };
            if (source.type === 'message') {
                await source.message.reply(payload).catch(() => null);
            } else {
                await replyInteraction(source.interaction, payload);
            }
            return;
        }
    }

    if (!container.rag.isReady) {
        const payload = { embeds: [buildUnavailableEmbed()] };
        if (source.type === 'message') {
            await source.message.reply(payload).catch(() => null);
        } else {
            await replyInteraction(source.interaction, payload);
        }
        return;
    }

    if (!skipChannelTracking) {
        const acquired = await container.aiRate.setThinking(channelId);
        if (!acquired) {
            const payload = { embeds: [buildBusyEmbed()] };
            if (source.type === 'message') {
                await source.message.reply(payload).catch(() => null);
            } else {
                await replyInteraction(source.interaction, payload);
            }
            return;
        }
    }

    const thinkingSurface = await createThinkingSurface(source);
    if (!thinkingSurface) {
        if (!skipChannelTracking) {
            await container.aiRate.clearThinking(channelId);
        }
        return;
    }

    const animation = startThinkingAnimation(thinkingSurface);

    try {
        const history = skipChannelTracking
            ? []
            : await container.aiConversation.getHistory(channelId);
        const response = await container.rag.query(userText, history);

        animation.stop();

        await thinkingSurface.edit(formatAiPayload(response));

        if (!skipChannelTracking) {
            await container.aiConversation.addExchange(channelId, userText, response);
            await container.aiConversation.trimChannel(channelId);
            await container.aiRate.incrementUsage(channelId);
        }
    } catch (err) {
        console.error('[bdfd-ai] query failed:', err);
        animation.stop();
        await thinkingSurface.edit({ embeds: [buildUnavailableEmbed()] }).catch(() => null);
    } finally {
        if (!skipChannelTracking) {
            await container.aiRate.clearThinking(channelId);
        }
    }
}
