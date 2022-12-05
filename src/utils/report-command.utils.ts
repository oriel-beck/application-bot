import {
  Message,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
} from 'discord.js';
import { ActionRowBuilder, EmbedBuilder } from '@discordjs/builders';
import { Colors } from '../providers';
import {
  ReportEmbedFunctionResponses,
  ReportModalResponses,
} from '../constants';

export function generateReportEmbed(
  user: User,
  message: string,
  targetUser: User,
  colors: Colors,
  targetMsg?: Message,
): [EmbedBuilder] {
  return [
    new EmbedBuilder()
      .setTitle(ReportEmbedFunctionResponses.title(user.tag))
      .setDescription(
        ReportEmbedFunctionResponses.description(
          targetUser,
          message,
          targetMsg,
        ),
      )
      .setColor(colors['primary']),
  ];
}

export function generateReportModal(
  targetUser: User,
  targetMessage?: Message,
): ModalBuilder {
  return new ModalBuilder()
    .setTitle(ReportModalResponses.Heading)
    .setCustomId(`report-modal-${targetUser.id}-${targetMessage.id}`)
    .addComponents([
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('message')
          .setLabel(ReportModalResponses.Label)
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000),
      ),
    ]);
}
