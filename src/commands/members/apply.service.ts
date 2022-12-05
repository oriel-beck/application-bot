import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { Client, DMChannel } from 'discord.js';
import { delay, from, interval, mergeMap } from 'rxjs';
import { ConfigService } from '@nestjs/config';

// db services
import {
  ApplicationExpireService,
  DBApplicationApplicationsService,
  DBApplicationBlacklistService,
  DBApplicationQuestionsService,
  DBApplicationSettingsService,
  RedisService,
} from '../../services';

// utils
import {
  ApplyCommandFunctionResponses,
  ApplyCommandResponses,
  generateApplicationDashboardComponents,
  generateApplicationDashboardEmbed,
} from '../../utils';

@Injectable()
export class MembersCommandsService {
  editLoop = this.configService.get<string>('edit_loop') === 'true';
  timeout = this.configService.get<number>('applications.timeout');
  constructor(
    private appService: DBApplicationApplicationsService,
    private blacklistService: DBApplicationBlacklistService,
    private settingService: DBApplicationSettingsService,
    private questionService: DBApplicationQuestionsService,
    private configService: ConfigService,
    private redisService: RedisService,
    expireService: ApplicationExpireService,
  ) {
    expireService.init();
  }

  @SlashCommand({
    name: 'apply',
    description: 'Start the application process',
  })
  async startApplication(@Context() [interaction]: SlashCommandContext) {
    // check if applications are enabled
    const applicationsEnabled = await this.settingService.getCurrentState(
      BigInt(interaction.guildId),
    );
    if (!applicationsEnabled.enabled)
      return interaction
        .reply({
          content: ApplyCommandResponses.Disabled,
          ephemeral: true,
        })
        .catch(() => null);

    // save the user ID as bigint
    const userid = BigInt(interaction.user.id);

    // check if the user is blacklisted
    const blacklisted = await this.blacklistService.getBlacklist(userid);
    if (blacklisted)
      return interaction
        .reply({
          content: ApplyCommandFunctionResponses.blacklistedMessage(
            blacklisted.reason,
          ),
          ephemeral: true,
        })
        .catch(() => null);

    // check if there is any application is progress or made
    const hasApplication = await this.appService.getApp(userid);
    if (hasApplication)
      return interaction
        .reply({
          content: ApplyCommandResponses.InProgress,
          ephemeral: true,
        })
        .catch(() => null);

    // check if you can DM the user
    const initMessage = await interaction.user
      .send(ApplyCommandResponses.Starting)
      .catch(() => null);
    if (!initMessage)
      return interaction
        .reply({
          content: ApplyCommandResponses.OpenDMs,
          ephemeral: true,
        })
        .catch(() => null);

    // check if you can start the application
    const applicationStart = await this.appService
      .createApp(userid)
      .catch(() => null);
    if (!applicationStart) {
      initMessage
        .edit({
          content: ApplyCommandResponses.FailedStart,
        })
        .catch(() => null);
      return interaction
        .reply({
          content: ApplyCommandResponses.FailedStart,
          ephemeral: true,
        })
        .catch(() => null);
    }

    // edit the initial message into the application embed
    initMessage.edit({
      content: '',
      embeds: generateApplicationDashboardEmbed(
        0,
        this.questionService.baseQuestions[0],
      ),
      components: generateApplicationDashboardComponents(
        0,
        interaction.user.id,
        this.questionService.baseQuestions,
        [],
      ),
    });

    // update the message ID of the app in the database
    await this.appService.updateAppMessageID(userid, BigInt(initMessage.id));

    if (this.editLoop) {
      this.redisService
        .setex(
          `application-${userid}-${initMessage.id}`,
          60 * this.timeout,
          userid.toString(),
        )
        .catch(() => null);
    }

    // notify the user the embed is ready
    return interaction
      .reply({
        content: ApplyCommandResponses.Started,
        ephemeral: true,
      })
      .catch(() => null);
  }
}
