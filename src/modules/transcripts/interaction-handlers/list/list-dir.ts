import {
  buildTranscriptListMessage,
  parseTranscriptListDirCustomId,
  resolveTranscriptListDirPage
} from '@lib/command-utils/transcript/list/transcript-list.utils.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class TranscriptListDirHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    if (interaction.user.id !== process.env.OWNER) {
      return interaction.reply({
        content: 'You are missing permissions to use this.',
        flags: MessageFlags.Ephemeral
      });
    }

    const parsed = parseTranscriptListDirCustomId(interaction.customId);
    if (!parsed || parsed.dir === 'noop') return;

    const items = await this.container.transcripts.listWithCounts();
    const page = resolveTranscriptListDirPage(parsed.dir, parsed.page, items.length);
    const message = buildTranscriptListMessage(items, page);
    return interaction.update({
      components: message.components,
      content: null,
      embeds: []
    });
  }

  public parse(interaction: ButtonInteraction) {
    const parsed = parseTranscriptListDirCustomId(interaction.customId);
    if (!parsed || parsed.dir === 'noop') return this.none();
    return this.some();
  }
}
