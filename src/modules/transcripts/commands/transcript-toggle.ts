import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'transcript-toggle',
  description: 'Enable or disable ticket transcripts for this server.',
  preconditions: ['OwnerOnly']
})
export class TranscriptToggleCommand extends Command {
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const guildId = this.container.config.guild;
    const rows = await this.container.settings.get(guildId);
    const current = rows.at(0)?.transcriptsEnabled ?? true;
    const next = !current;

    await this.container.settings.update(guildId, 'transcriptsEnabled', next);

    const embed = new EmbedBuilder()
      .setTitle('Ticket transcripts')
      .setDescription(
        next
          ? 'Ticket transcripts are now **enabled**. Messages in ticket channels are recorded, and closing a ticket DMs the transcript.'
          : 'Ticket transcripts are now **disabled**. New messages are not recorded, and closing a ticket does not DM a transcript. Existing transcripts are kept.'
      );

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  public registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description).setDMPermission(false)
    );
  }
}
