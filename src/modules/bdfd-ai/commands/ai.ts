import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { hasRole } from '@lib/precondition-util.js';
import { getBdfdAiChannelKind, resolveChannelAuthorId } from '@lib/bdfd-ai/channel-utils.js';
import { MessageFlags, type TextChannel, type ThreadChannel } from 'discord.js';
import { processAiRequest } from '@lib/bdfd-ai/process-request.js';

@ApplyOptions<Command.Options>({
  name: 'ai',
  description: 'Ask the BDFD AI assistant a question.'
})
export class AiCommand extends Command {
  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const channel = interaction.channel;
    if (!channel?.isTextBased() || channel.isDMBased()) {
      return interaction.reply({
        content: 'This command can only be used in server channels.',
        flags: MessageFlags.Ephemeral
      });
    }

    const isStaffOrTrialSupport =
      hasRole(interaction.member!, this.container.config.roles.staff) ||
      hasRole(interaction.member!, this.container.config.roles.trial_support);

    const textChannel = channel as TextChannel | ThreadChannel;
    const channelKind = getBdfdAiChannelKind(textChannel);
    const botCommandChannels = [
      this.container.config.channels.bot_commands_1,
      this.container.config.channels.bot_commands_2
    ].filter((id): id is string => Boolean(id));
    const effectiveChannelId = channel.isThread() ? channel.parentId : channel.id;
    const isInBotChannels = effectiveChannelId != null && botCommandChannels.includes(effectiveChannelId);

    if (channelKind && !isStaffOrTrialSupport) {
      const authorId = await resolveChannelAuthorId(textChannel, channelKind);
      if (!authorId || interaction.user.id !== authorId) {
        return interaction.reply({
          content: 'You can only use `/ai` here if you are the ticket/post author, staff, or support in training.',
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (!isStaffOrTrialSupport && !channelKind && !isInBotChannels) {
      return interaction.reply({
        content:
          'You can only use `/ai` in the configured bot command channels unless you are staff or support in training.',
        flags: MessageFlags.Ephemeral
      });
    }

    const userText = interaction.options.getString('message', true).trim();
    if (!userText) {
      return interaction.reply({
        content: 'Please provide a message.'
      });
    }

    return processAiRequest({
      container: this.container,
      channelId: interaction.channelId,
      userText,
      source: { type: 'interaction', interaction },
      ignoreAiEnabled: true,
      skipChannelTracking: true
    });
  }

  public registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('Your question or code (use pastebin links if it is very long)')
            .setRequired(true)
            .setMaxLength(2000)
        )
    );
  }
}
