import {
  Context,
  MessageCommand,
  MessageCommandContext,
  Options,
  SlashCommand,
  SlashCommandContext,
  TargetMessage,
  TargetUser,
  UserCommand,
  UserCommandContext,
} from 'necord';
import { Injectable } from '@nestjs/common';
import { Message, User } from 'discord.js';

// dto
import { ReportDto } from '../../dto/members';

// utils
import { generateReportModal } from '../../utils';

@Injectable()
export class ReportCommandsService {
  @SlashCommand({
    name: 'report',
    description: 'Report a member for cheating on the application.',
    dmPermission: false,
  })
  async reportSlash(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user, proof }: ReportDto,
  ) {
    const msgLink =
      /\/([0-9]{17,19}.*)\/([0-9]{17,19}.*)\/([0-9]{17,19}.*[^/])\/*/.exec(
        proof,
      );
    let msg;

    if (
      Array.isArray(msgLink) &&
      msgLink.at(1) === interaction.guildId &&
      interaction.guild.channels.cache.has(msgLink.at(2))
    ) {
      const channel = await interaction.guild.channels.cache.get(msgLink.at(2));
      if (channel.isTextBased()) {
        msg = await channel.messages.fetch(msgLink.at(3)).catch(() => null);
      }
    }

    return interaction
      .showModal(generateReportModal(user, msg))
      .catch(() => null);
  }

  @UserCommand({
    name: 'Report User',
  })
  reportUserContext(
    @Context() [interaction]: UserCommandContext,
    @TargetUser() user: User,
  ) {
    return interaction.showModal(generateReportModal(user)).catch(() => null);
  }

  @MessageCommand({
    name: 'Report User',
  })
  reportMessageContext(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    return interaction
      .showModal(generateReportModal(message.author, message))
      .catch(() => null);
  }
}
