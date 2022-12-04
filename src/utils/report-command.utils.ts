import {
  Message,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
} from 'discord.js';
import { ActionRowBuilder, EmbedBuilder } from '@discordjs/builders';
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

export function generateReportModal(
  targetUser: User,
  targetMessage?: Message,
): ModalBuilder {
  return new ModalBuilder()
    .addComponents([
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('message')
          .setLabel('Report reason')
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000),
      ),
    ])
    .setCustomId(`report-modal-${targetUser.id}-${targetMessage.id}`)
    .setTitle('New Report');
}
