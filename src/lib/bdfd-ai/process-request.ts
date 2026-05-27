import type { Container } from '@sapphire/pieces';
import type { Command } from '@sapphire/framework';
import type { Message, MessageEditOptions, MessageReplyOptions } from 'discord.js';
import {
    buildBusyEmbed,
    buildDisabledEmbed,
    buildPastePromptEmbed,
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
}

type EditableMessage = {
    edit: (options: MessageEditOptions) => Promise<unknown>;
};

async function replyInteraction(
    interaction: Command.ChatInputCommandInteraction,
    options: MessageEditOptions
) {
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(options as MessageReplyOptions).catch(() => null);
    } else {
        await interaction.reply({ ...options, ephemeral: true }).catch(() => null);
    }
}

async function createThinkingSurface(
    source: AiRequestSource
): Promise<EditableMessage | null> {
    if (source.type === 'message') {
        return source.message
            .reply({ embeds: [buildThinkingEmbed(THINKING_STATUSES[0]!)] })
            .catch(() => null);
    }

    await source.interaction.deferReply();
    await source.interaction
        .editReply({ embeds: [buildThinkingEmbed(THINKING_STATUSES[0]!)] })
        .catch(() => null);

    return {
        edit: (options) => source.interaction.editReply(options as MessageReplyOptions),
    };
}

export async function processAiRequest(options: ProcessAiRequestOptions): Promise<void> {
    const { container, channelId, userText, source } = options;

    const settings = await container.settings.get(container.config.guild).catch(() => null);
    if (!settings?.at(0)?.aiEnabled) {
        const payload = { embeds: [buildDisabledEmbed()] };
        if (source.type === 'message') {
            await source.message.reply(payload).catch(() => null);
        } else {
            await replyInteraction(source.interaction, payload);
        }
        return;
    }

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

    if (!container.rag.isReady) {
        const payload = { embeds: [buildUnavailableEmbed()] };
        if (source.type === 'message') {
            await source.message.reply(payload).catch(() => null);
        } else {
            await replyInteraction(source.interaction, payload);
        }
        return;
    }

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

    const thinkingSurface = await createThinkingSurface(source);
    if (!thinkingSurface) {
        await container.aiRate.clearThinking(channelId);
        return;
    }

    const animation = startThinkingAnimation(thinkingSurface);

    try {
        const history = await container.aiConversation.getHistory(channelId);
        const response = await container.rag.query(userText, history);

        animation.stop();

        if (response === '__PASTE_PROMPT__') {
            await thinkingSurface.edit({ embeds: [buildPastePromptEmbed()] });
            await container.aiConversation.addTurn(channelId, 'user', userText);
            await container.aiConversation.trimChannel(channelId);
            return;
        }

        await thinkingSurface.edit(formatAiPayload(response));
        await container.aiConversation.addExchange(channelId, userText, response);
        await container.aiConversation.trimChannel(channelId);
        await container.aiRate.incrementUsage(channelId);
    } catch (err) {
        console.error('[bdfd-ai] query failed:', err);
        animation.stop();
        await thinkingSurface.edit({ embeds: [buildUnavailableEmbed()] }).catch(() => null);
    } finally {
        await container.aiRate.clearThinking(channelId);
    }
}
