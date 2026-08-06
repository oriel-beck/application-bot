import {
    buildAiConversationListMessage,
} from '@lib/command-utils/bdfd-ai/list/ai-conversation-list.utils.js';
import { AiConversationCustomIDs } from '@lib/constants/custom-ids.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button,
})
export class AiConversationListBackHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (interaction.user.id !== process.env.OWNER) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const prefix = `${AiConversationCustomIDs.buttons.back}:`;
        if (!interaction.customId.startsWith(prefix)) return;
        const page = Number(interaction.customId.slice(prefix.length));
        if (!Number.isInteger(page) || page < 0) {
            return interaction.reply({
                content: 'Invalid navigation.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const channels = await this.container.aiConversation.listChannels();
        const message = await buildAiConversationListMessage(
            channels,
            page,
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
        if (!interaction.customId.startsWith(`${AiConversationCustomIDs.buttons.back}:`)) {
            return this.none();
        }
        return this.some();
    }
}
