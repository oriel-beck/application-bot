import { Injectable } from '@nestjs/common';
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
import { Message, User } from 'discord.js';
import { ReportDto } from '../../dto/members';
import { generateReportModal } from '../../utils';

@Injectable()
export class ReportService {
  @SlashCommand({
    name: 'report',
    description: 'Report a member for cheating on the application.',
  })
  reportSlash(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: ReportDto,
  ) {
    return interaction.showModal(generateReportModal(user)).catch(() => null);
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
