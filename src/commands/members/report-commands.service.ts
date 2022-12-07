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
