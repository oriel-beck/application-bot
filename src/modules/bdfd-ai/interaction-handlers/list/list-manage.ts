import {
    buildAiConversationActionsMessage,
    parseAiConversationChannelPageCustomId,
} from '@lib/command-utils/bdfd-ai/list/ai-conversation-list.utils.js';
import { AiConversationCustomIDs } from '@lib/constants/custom-ids.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button,
})
export class AiConversationListManageHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (interaction.user.id !== process.env.OWNER) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const parsed = parseAiConversationChannelPageCustomId(
            interaction.customId,
            AiConversationCustomIDs.buttons.manage,
        );
        if (!parsed) return;

        const channels = await this.container.aiConversation.listChannels();
        const found = channels.find((c) => c.channelId === parsed.channelId);
        if (!found) {
            return interaction.reply({
                content: 'AI conversation not found.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const [usage, limit] = await Promise.all([
            this.container.aiRate.getUsage(parsed.channelId),
            this.container.aiRate.getLimit(parsed.channelId),
        ]);

        const message = buildAiConversationActionsMessage(
            parsed.channelId,
            parsed.page,
            usage,
            limit,
            found.turnCount,
        );
        return interaction.update({
            components: message.components,
            content: null,
            embeds: [],
        });
    }

    public parse(interaction: ButtonInteraction) {
        if (
            !parseAiConversationChannelPageCustomId(
                interaction.customId,
                AiConversationCustomIDs.buttons.manage,
            )
        ) {
            return this.none();
        }
        return this.some();
    }
}
