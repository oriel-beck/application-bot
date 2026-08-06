import {
    buildAiConversationListMessage,
    parseAiConversationChannelPageCustomId,
} from '@lib/command-utils/bdfd-ai/list/ai-conversation-list.utils.js';
import { AiConversationCustomIDs } from '@lib/constants/custom-ids.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button,
})
export class AiConversationListResetHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (interaction.user.id !== process.env.OWNER) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const parsed = parseAiConversationChannelPageCustomId(
            interaction.customId,
            AiConversationCustomIDs.buttons.reset,
        );
        if (!parsed) return;

        await this.container.aiRate.resetUsage(parsed.channelId);

        const channels = await this.container.aiConversation.listChannels();
        const message = await buildAiConversationListMessage(
            channels,
            parsed.page,
            (id) => this.container.aiRate.getUsage(id),
            (id) => this.container.aiRate.getLimit(id),
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
                AiConversationCustomIDs.buttons.reset,
            )
        ) {
            return this.none();
        }
        return this.some();
    }
}
