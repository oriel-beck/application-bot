import {
    buildTranscriptListMessage,
} from '@lib/command-utils/transcript/list/transcript-list.utils.js';
import { TranscriptCustomIDs } from '@lib/constants/custom-ids.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button,
})
export class TranscriptListBackHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (interaction.user.id !== process.env.OWNER) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const prefix = `${TranscriptCustomIDs.buttons.back}:`;
        if (!interaction.customId.startsWith(prefix)) return;
        const page = Number(interaction.customId.slice(prefix.length));
        if (!Number.isInteger(page) || page < 0) {
            return interaction.reply({
                content: 'Invalid navigation.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const items = await this.container.transcripts.listWithCounts();
        const message = buildTranscriptListMessage(items, page);
        return interaction.update({
            components: message.components,
            content: null,
            embeds: [],
        });
    }

    public parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith(`${TranscriptCustomIDs.buttons.back}:`)) {
            return this.none();
        }
        return this.some();
    }
}
