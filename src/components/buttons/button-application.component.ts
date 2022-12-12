import { Inject, Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Button, ButtonContext } from 'necord';
import { ConfigService } from '@nestjs/config';
import type {
  APIMessageComponentEmoji,
  GuildTextBasedChannel,
} from 'discord.js';

// db services
import { DBApplicationApplicationsService } from '../../services/postgres';
import { RedisService } from '../../services/redis';

// utils
import {
  generateApplicationDashboardModal,
  generateApplicationResponseComponents,
  generateApplicationResponseEmbed,
} from '../../utils';

// guards
import {
  ApplicationExistsGuard,
  ApplicationNotFoundExceptionFilter,
} from '../../guards';

// exceptions
import { ApplicationNotFoundException } from '../../exceptions';

// providers
import { COLOR_PROVIDER_TOKEN } from '../../providers';
import type { Colors } from '../../providers';

// constants
import {
  ApplicationDoneButtonResponses,
  ApplicationState,
  ButtonApplicationComponentFunctionResponses,
} from '../../constants';

@UseGuards(ApplicationExistsGuard)
@UseFilters(ApplicationNotFoundExceptionFilter)
@Injectable()
export class ButtonApplicationComponent {
  constructor(
    private configService: ConfigService,
    private appService: DBApplicationApplicationsService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
    private redisService: RedisService,
  ) {}

  @Button('cancel')
  async cancelButton([interaction]: ButtonContext) {
    await this.appService.deleteApplication(
      BigInt(interaction.user.id),
      BigInt(interaction.guildId),
    );

    return interaction.update({
      embeds: [],
      components: [],
      content: ButtonApplicationComponentFunctionResponses.Cancelled(
        this.configService.get<string>('command_id'),
        this.configService.get<string>('channels.bot'),
      ),
    });
  }

  @Button('done')
  async doneButton([interaction]: ButtonContext) {
    await this.appService.updateApplicationState(
      BigInt(interaction.user.id),
      ApplicationState.Pending,
    );

    const finalApp = await this.appService.getApp(
      BigInt(interaction.user.id),
      BigInt(interaction.guildId),
    );

    if (!finalApp) throw new ApplicationNotFoundException();

    const channel: GuildTextBasedChannel = await interaction.client.channels
      .fetch(this.configService.get('channels.pending'))
      .catch(() => null);

    const msg = await channel
      ?.send({
        embeds: await generateApplicationResponseEmbed(
          finalApp,
          interaction.client,
          this.colors,
          this.configService.get<number>('applications.max_questions_per_page'),
        ),
        components: generateApplicationResponseComponents(
          finalApp.userid.toString(),
          this.configService.get<number>('applications.max_questions_per_page'),
          this.configService.get<number>('applications.max_questions'),
          this.configService.get<APIMessageComponentEmoji>('emojis.next'),
          this.configService.get<APIMessageComponentEmoji>('emojis.prev'),
        ),
      })
      .catch(() => null);

    if (!msg)
      return interaction
        .reply({
          content: ApplicationDoneButtonResponses.Failed,
          ephemeral: true,
        })
        .catch(() => null);

    this.redisService
      .del(`application-${interaction.user.id}-${interaction.message.id}`)
      .catch(() => null);

    return interaction
      .update({
        content: ApplicationDoneButtonResponses.Success,
        embeds: [],
        components: [],
      })
      .catch(() => null);
  }

  @Button('answer-:id')
  async answerButton([interaction]: ButtonContext) {
    const num = Number(interaction.customId.split('-').at(-1));

    const app = await this.appService.getApp(
      BigInt(interaction.user.id),
      BigInt(interaction.guildId),
    );
    if (!app) throw new ApplicationNotFoundException();

    return interaction.showModal(
      generateApplicationDashboardModal(
        num,
        app.questions[num],
        this.configService.get<number>('applications.max_answer_length'),
        app.answers[num],
      ),
    );
  }
}
