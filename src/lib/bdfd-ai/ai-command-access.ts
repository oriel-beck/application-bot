import { container, type Command } from '@sapphire/framework';
import { hasRole } from '@lib/precondition-util.js';
import type { TextChannel, ThreadChannel } from 'discord.js';
import { getBdfdAiChannelKind, resolveChannelAuthorId } from './channel-utils.js';

/**
 * Who may run an AI slash command (`/ai`, `/search ai`) where: staff and support in training
 * anywhere; everyone else only in the bot command channels, or in a support/intl post or ticket
 * they opened. Returns the denial message, or `null` when allowed.
 */
export async function getAiCommandDenial(
  interaction: Command.ChatInputCommandInteraction,
  commandName: string
): Promise<string | null> {
  const { config } = container;
  const channel = interaction.channel;
  if (!channel?.isTextBased() || channel.isDMBased()) {
    return 'This command can only be used in server channels.';
  }

  const isStaffOrTrialSupport =
    hasRole(interaction.member!, config.roles.staff) || hasRole(interaction.member!, config.roles.trial_support);
  if (isStaffOrTrialSupport) return null;

  const textChannel = channel as TextChannel | ThreadChannel;
  const channelKind = getBdfdAiChannelKind(textChannel);
  if (channelKind) {
    const authorId = await resolveChannelAuthorId(textChannel, channelKind);
    return authorId && interaction.user.id === authorId
      ? null
      : `You can only use \`${commandName}\` here if you are the ticket/post author, staff, or support in training.`;
  }

  const botCommandChannels = [config.channels.bot_commands_1, config.channels.bot_commands_2].filter(
    (id): id is string => Boolean(id)
  );
  const effectiveChannelId = channel.isThread() ? channel.parentId : channel.id;
  if (effectiveChannelId != null && botCommandChannels.includes(effectiveChannelId)) return null;

  return `You can only use \`${commandName}\` in the configured bot command channels unless you are staff or support in training.`;
}
