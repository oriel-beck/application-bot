import {
  formatTranscriptTxt,
  parseTranscriptChannelPageCustomId
} from '@lib/command-utils/transcript/list/transcript-list.utils.js';
import { TranscriptCustomIDs } from '@lib/constants/custom-ids.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { AttachmentBuilder, MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class TranscriptListExportHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    if (interaction.user.id !== process.env.OWNER) {
      return interaction.reply({
        content: 'You are missing permissions to use this.',
        flags: MessageFlags.Ephemeral
      });
    }

    const parsed = parseTranscriptChannelPageCustomId(interaction.customId, TranscriptCustomIDs.buttons.export);
    if (!parsed) return;

    await interaction.deferUpdate();

    const data = await this.container.transcripts.get(parsed.channelId, true);
    if (!data) {
      return interaction.followUp({
        content: 'Transcript not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    const users = new Map<string, string>();
    const author = await this.container.client.users
      .fetch(data.transcript.author.toString())
      .then((u) => {
        users.set(u.id, u.displayName);
        return u;
      })
      .catch(() => null);

    for (const message of data.messages) {
      const uid = message.user.toString();
      if (users.has(uid)) continue;
      const name = await this.container.client.users
        .fetch(uid)
        .then((u) => u.displayName)
        .catch(() => 'UNKNOWN');
      users.set(uid, name);
    }

    const channel = await interaction.guild?.channels.fetch(parsed.channelId).catch(() => null);
    const channelLabel = channel && 'name' in channel ? channel.name : parsed.channelId;

    const text = formatTranscriptTxt({
      channelLabel,
      authorDisplayName: author?.displayName ?? 'UNKNOWN',
      messages: data.messages.map((m: { user: bigint; message: string }) => ({
        userId: m.user.toString(),
        content: m.message
      })),
      userNames: users
    });

    const attachment = new AttachmentBuilder(Buffer.from(text), {
      name: `${channelLabel}.txt`
    });

    return interaction.followUp({
      content: `Transcript for <#${parsed.channelId}>`,
      files: [attachment],
      flags: MessageFlags.Ephemeral
    });
  }

  public parse(interaction: ButtonInteraction) {
    if (!parseTranscriptChannelPageCustomId(interaction.customId, TranscriptCustomIDs.buttons.export)) {
      return this.none();
    }
    return this.some();
  }
}
