import { Inject, Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Modal, ModalContext } from 'necord';
import { DBApplicationApplicationsService } from '../../services/postgres';
import { TextInputModalData } from 'discord.js';
import {
  generateApplicationDashboardComponents,
  generateApplicationDashboardEmbed,
} from '../../utils';
import {
  ApplicationExistsGuard,
  ApplicationNotFoundExceptionFilter,
} from '../../guards';
import { ApplicationErrors } from '../../constants';
import { COLOR_PROVIDER_TOKEN, Colors } from '../../providers';

@Injectable()
export class ModalApplicationComponent {
  constructor(
    private appService: DBApplicationApplicationsService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
  ) {}

  @UseGuards(ApplicationExistsGuard)
  @UseFilters(ApplicationNotFoundExceptionFilter)
  @Modal('answer')
  async applicationAnswer([interaction]: ModalContext) {
    // get the text input data
    const data = interaction.components[0].components[0] as TextInputModalData;

    // get the question number
    let qnum = Number(data.customId.split('-').at(-1));

    // get the current state of the app (if exists)
    const app = await this.appService.getApp(BigInt(interaction.user.id));

    if (!app)
      return interaction
        .reply({
          content: ApplicationErrors.NotExistStartNew,
          ephemeral: true,
        })
        .catch(() => null);

    // If the answer doesn't exist and the amount of questions is not the same as the amount of questions skips to the next question
    const showNextQuestion =
      !app.answers[qnum] && app.answers.length - 1 !== app.questions.length;

    // If an answer exist, update the question
    if (app.answers[qnum]) {
      app.answers[qnum] = data.value;
      // Postgres arrays start from 1, so up the number by 1
      await this.appService.updateAppAnswer(
        BigInt(interaction.user.id),
        qnum + 1,
        data.value,
      );
    } else {
      // If the answer doesn't exist, append the answer
      app.answers.push(data.value);
      await this.appService.addAnswer(BigInt(interaction.user.id), data.value);
    }

    // Update the question num to show the next question
    qnum = showNextQuestion ? qnum + 1 : qnum;
    qnum = qnum >= app.questions.length ? app.questions.length : qnum;

    // Defer the interaction so I can close the modal
    await interaction.deferUpdate();

    // Edit the message with the new question and component
    return interaction.message.edit({
      embeds: generateApplicationDashboardEmbed(
        qnum,
        app.questions[qnum],
        app.answers[qnum],
        this.colors['primary'],
      ),
      components: generateApplicationDashboardComponents(
        qnum,
        interaction.user.id,
        app.questions,
        app.answers,
      ),
    });
  }
}
