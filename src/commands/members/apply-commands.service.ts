import { Inject, Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ConfigService } from '@nestjs/config';

// db services
import {
  DBApplicationApplicationsService,
  DBApplicationBlacklistService,
  DBApplicationQuestionsService,
  DBApplicationSettingsService,
} from '../../services/postgres';
import { ApplicationExpireService, RedisService } from '../../services/redis';

// utils
import {
  generateApplicationDashboardComponents,
  generateApplicationDashboardEmbed,
} from '../../utils';

// constants
import {
  ApplyCommandFunctionResponses,
  ApplyCommandResponses,
} from '../../constants';

// providers
import { COLOR_PROVIDER_TOKEN } from '../../providers';
import type { Colors } from '../../providers';

@Injectable()
export class ApplyCommandsService {
  editLoop = this.configService.get<boolean>('edit_loop');
  timeout = this.configService.get<number>('applications.timeout');
  constructor(
    private appService: DBApplicationApplicationsService,
    private blacklistService: DBApplicationBlacklistService,
    private settingService: DBApplicationSettingsService,
    private questionService: DBApplicationQuestionsService,
    private configService: ConfigService,
    private redisService: RedisService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
    private expireService: ApplicationExpireService,
  ) {
    expireService.init();
  }

  @SlashCommand({
    name: 'apply',
    description: 'Start the application process',
    dmPermission: false,
  })
  async startApplication(@Context() [interaction]: SlashCommandContext) {
    // check if applications are enabled
    const applicationsEnabled = await this.settingService.getCurrentState(
      BigInt(interaction.guildId),
    );
    if (!applicationsEnabled)
      return interaction
        .reply({
          content: ApplyCommandResponses.Disabled,
          ephemeral: true,
        })
        .catch(() => null);

    // save the user ID as bigint
    const userid = BigInt(interaction.user.id);
    const guildid = BigInt(interaction.guildId);

    // check if the user is blacklisted
    const blacklisted = await this.blacklistService.getBlacklist(
      userid,
      guildid,
    );

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
    const hasApplication = await this.appService.getApp(userid, guildid);
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
      .createApp(userid, guildid)
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
        '',
        this.colors['primary'],
      ),
      components: generateApplicationDashboardComponents(
        0,
        interaction.user.id,
        this.questionService.baseQuestions,
        [],
      ),
    });

    // update the message ID of the app in the database
    await this.appService.updateAppMessageID(
      userid,
      BigInt(initMessage.id),
      guildid,
    );

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
