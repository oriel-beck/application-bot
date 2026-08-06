import {
    buildTranscriptActionsMessage,
    parseTranscriptChannelPageCustomId,
} from '@lib/command-utils/transcript/list/transcript-list.utils.js';
import { TranscriptCustomIDs } from '@lib/constants/custom-ids.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button,
})
export class TranscriptListManageHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (interaction.user.id !== process.env.OWNER) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const parsed = parseTranscriptChannelPageCustomId(
            interaction.customId,
            TranscriptCustomIDs.buttons.manage,
        );
        if (!parsed) return;

        const data = await this.container.transcripts.get(parsed.channelId, true);
        if (!data) {
            return interaction.reply({
                content: 'Transcript not found.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const message = buildTranscriptActionsMessage(
            parsed.channelId,
            parsed.page,
            data.messages.length,
        );
        return interaction.update({
            components: message.components,
            content: null,
            embeds: [],
        });
    }

    public parse(interaction: ButtonInteraction) {
        if (
            !parseTranscriptChannelPageCustomId(
                interaction.customId,
                TranscriptCustomIDs.buttons.manage,
            )
        ) {
            return this.none();
        }
        return this.some();
    }
}
