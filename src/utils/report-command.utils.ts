import { Message, User } from 'discord.js';
import { EmbedBuilder } from '@discordjs/builders';
import { Colors } from '../providers';

export function generateReportEmbed(
  user: User,
  message: string,
  targetUser: User,
  colors: Colors,
  targetMsg?: Message,
): [EmbedBuilder] {
  return [
    new EmbedBuilder()
      .setTitle(`New report from ${user.tag}`)
      .setDescription(
        `Reported user: ${targetUser} (${targetUser.id})\n\nReason: ${message}${
          targetMsg ? `\n\nProof: [${targetMsg.content}](${targetMsg.url})` : ''
        }`,
      )
      .setColor(colors['primary']),
  ];
}
