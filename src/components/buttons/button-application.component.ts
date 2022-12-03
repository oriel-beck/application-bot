import { Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Button, ButtonContext } from 'necord';
import { DBApplicationApplicationsService } from '../../services';
import {
  ApplicationDoneButtonResponses,
  ApplicationState,
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

@UseGuards(ApplicationExistsGuard)
@UseFilters(ApplicationNotFoundExceptionFilter)
@Injectable()
export class ButtonApplicationComponent {
  constructor(
    private configService: ConfigService,
    private appService: DBApplicationApplicationsService,
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
      .fetch(this.configService.get('PENDING_CHANNEL'))
      .catch(() => null);

    const msg = await channel
      ?.send({
        embeds: await generateApplicationResponseEmbed(
          finalApp,
          interaction.client,
        ),
        components: generateApplicationResponseComponents(
          finalApp.userid.toString(),
        ),
      })
      .catch(() => null);

    if (!msg)
      return interaction.reply({
        content: ApplicationDoneButtonResponses.Failed,
        ephemeral: true,
      });

    return interaction.update({
      content: ApplicationDoneButtonResponses.Success,
      embeds: [],
      components: [],
    });
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
        app.answers[num],
      ),
    );
  }
}
