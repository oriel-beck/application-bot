import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class ReportService {
  constructor(private configService: ConfigService) {}

  @SlashCommand({
    name: 'report',
    description: 'Report a member for cheating on the application.',
  })
  reportSlash(
    @Context() [interaction]: SlashCommandContext,
    @Options() { user }: ReportDto,
  ) {
    return;
  }

  @UserCommand({
    name: 'Report User',
  })
  reportUserContext(
    @Context() [interaction]: UserCommandContext,
    @TargetUser() user: User,
  ) {
    return;
  }

  @MessageCommand({
    name: 'Report User',
  })
  reportMessageContext(
    @Context() [interaction]: MessageCommandContext,
    @TargetMessage() message: Message,
  ) {
    return;
  }
}
