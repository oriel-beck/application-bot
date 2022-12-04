import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { Channel, Client, DMChannel } from 'discord.js';
import { delay, from, interval, mergeMap, tap } from 'rxjs';

// db services
import {
  DBApplicationApplicationsService,
  DBApplicationBlacklistService,
  DBApplicationQuestionsService,
  DBApplicationSettingsService,
} from '../../services';

// utils
import {
  ApplyCommandFunctionResponses,
  ApplyCommandResponses,
  generateApplicationDashboardComponents,
  generateApplicationDashboardEmbed,
} from '../../utils';
import { ConfigService } from '@nestjs/config';

/**
 * DO NOT initiate this class, this only needs to be initiated once by necord otherwise the loop will overload
 */
@Injectable()
export class MembersCommandsService {
  editLoop = this.configSetvice.get<string>('edit_loop') === 'true';
  timeout = this.configSetvice.get<number>('applications.timeout');
  constructor(
    private appService: DBApplicationApplicationsService,
    private blacklistService: DBApplicationBlacklistService,
    private settingService: DBApplicationSettingsService,
    private questionService: DBApplicationQuestionsService,
    private configSetvice: ConfigService,
    private client: Client,
    @InjectRedis() private redisClient: Redis,
  ) {
    if (this.timeout) {
      const subRedisClient = this.redisClient.duplicate();
      subRedisClient.subscribe('__keyevent@0__:expired');
      subRedisClient.on('message', (_, i) => this.handleApplicationTimeout(i));
    }
    if (this.editLoop) this.startApplicationLoop();
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
      this.redisClient
        .setex(
          `application-${userid}-${initMessage.id}`,
          60 * this.timeout,
          userid,
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

  async handleApplicationTimeout(appString: string) {
    this.appService.deleteApplication(BigInt(appString.split('-').at(1)));
    const msg = await this.getApplicationMessage(appString);
    if (!msg) return;

    return msg
      .edit({
        content: 'Application timed out, components will no longer respond.',
      })
      .catch(() => null);
  }

  async getApplicationMessage(appString: string) {
    const split = appString.split('-');
    const user = await this.client.users.fetch(split.at(1)).catch(() => null);
    if (!user) return;

    const dmChannel: DMChannel = await user.createDM().catch(() => null);
    if (!dmChannel) return;

    const msg = await dmChannel.messages.fetch(split.at(2)).catch(() => null);
    if (!msg) return;
    return msg;
  }

  async editApplicationTimeoutTime(appString: string, seconds: number) {
    if (seconds <= 0) return;

    const msg = await this.getApplicationMessage(appString);
    if (!msg) return;

    msg
      .edit({
        content: `Reminder: The application will time out in **${(
          seconds / 60
        ).toFixed(1)} minutes**`,
      })
      .catch(() => null);
  }

  startApplicationLoop() {
    interval(60000)
      .pipe(
        mergeMap(() => from(this.redisClient.keys('application-*'))),
        mergeMap((apps: string[]) => from(apps).pipe(delay(3000))),
      )
      .subscribe({
        next: async (appString) => {
          const TTL = await this.redisClient.ttl(appString).catch(() => null);
          this.editApplicationTimeoutTime(appString, TTL);
        },
      });
  }
}
