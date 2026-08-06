import {
    buildAiConversationListMessage,
    parseAiConversationListDirCustomId,
    resolveAiConversationListDirPage,
} from '@lib/command-utils/bdfd-ai/list/ai-conversation-list.utils.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button,
})
export class AiConversationListDirHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (interaction.user.id !== process.env.OWNER) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const parsed = parseAiConversationListDirCustomId(interaction.customId);
        if (!parsed || parsed.dir === 'noop') return;

        const channels = await this.container.aiConversation.listChannels();
        const page = resolveAiConversationListDirPage(parsed.dir, parsed.page, channels.length);
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
        const parsed = parseAiConversationListDirCustomId(interaction.customId);
        if (!parsed || parsed.dir === 'noop') return this.none();
        return this.some();
    }
}
