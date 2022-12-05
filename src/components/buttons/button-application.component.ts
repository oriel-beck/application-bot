import { Inject, Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Button, ButtonContext } from 'necord';
import { DBApplicationApplicationsService } from '../../services';
import {
  generateApplicationDashboardModal,
  generateApplicationResponseComponents,
  generateApplicationResponseEmbed,
} from '../../utils';
import { ConfigService } from '@nestjs/config';
import { GuildTextBasedChannel } from 'discord.js';
import {
  ApplicationExistsGuard,
  ApplicationNotFoundExceptionFilter,
} from '../../guards';
import { ApplicationNotFoundException } from '../../exceptions';
import { COLOR_PROVIDER_TOKEN, Colors } from '../../providers';
import {
  ApplicationDoneButtonResponses,
  ApplicationState,
} from '../../constants';

@UseGuards(ApplicationExistsGuard)
@UseFilters(ApplicationNotFoundExceptionFilter)
@Injectable()
export class ButtonApplicationComponent {
  constructor(
    private configService: ConfigService,
    private appService: DBApplicationApplicationsService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
  ) {}

  @Button('cancel')
  async cancelButton([interaction]: ButtonContext) {
    await this.appService.deleteApplication(BigInt(interaction.user.id));
    return interaction.update({
      embeds: [],
      components: [],
      content:
        'Cancelled application process, you can re-apply by using </apply:0> in <#567714226337087498>.',
    });
  }

  @Button('done')
  async doneButton([interaction]: ButtonContext) {
    await this.appService.updateApplicationState(
      BigInt(interaction.user.id),
      ApplicationState.Pending,
    );

    const finalApp = await this.appService.getApp(BigInt(interaction.user.id));

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

    const app = await this.appService.getApp(BigInt(interaction.user.id));
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
