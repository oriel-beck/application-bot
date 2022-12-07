import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from '@discordjs/builders';
import {
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { BDFDQuestion } from '../entities';
import {
  ApplicationApplyDashboardComponentsFunctionResponses,
  ApplicationApplyDashboardComponentsResponses,
  ApplicationApplyDashboardEmbedResponses,
  ApplicationApplyDashboardModalFunctionResponses,
} from '../constants';

export function utilGenerateQuestions(baseQuestions: string[]) {
  return function (questions: BDFDQuestion[]) {
    return baseQuestions.concat(questions.map((q) => q.question));
  };
}

export function generateApplicationDashboardEmbed(
  num: number,
  question: string,
  answer: string,
  primaryColor: number,
): [EmbedBuilder] {
  answer ||= ApplicationApplyDashboardEmbedResponses.MissingAnswer;
  return [
    new EmbedBuilder()
      .setColor(primaryColor)
      .addFields([
        {
          name: ApplicationApplyDashboardEmbedResponses.QuestionName,
          value: question,
        },
        {
          name: ApplicationApplyDashboardEmbedResponses.AnswerName,
          value: answer,
        },
      ])
      .setTitle(`Question ${num + 1}`)
      .setFooter({
        text: ApplicationApplyDashboardEmbedResponses.FooterText,
      }),
  ];
}

export function generateApplicationDashboardComponents(
  current: number,
  userid: string,
  questions: string[],
  answers: string[],
): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
  const selectAmount = Math.ceil(questions.length / 25);
  if (selectAmount > 4)
    throw new Error('Cannot generate more than 4 select menus');
  const components = [
    new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel(ApplicationApplyDashboardComponentsResponses.Cancel)
        .setCustomId(`cancel`),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setLabel(ApplicationApplyDashboardComponentsResponses.Answer)
        .setCustomId(`answer-${current}`),
      new ButtonBuilder()
        .setStyle(
          questions.length === answers.length
            ? ButtonStyle.Success
            : ButtonStyle.Secondary,
        )
        .setLabel(ApplicationApplyDashboardComponentsResponses.Done)
        .setCustomId(`done`)
        .setDisabled(questions.length !== answers.length),
    ]),
  ] as ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];

  if (answers.length !== questions.length) {
    answers.push(ApplicationApplyDashboardComponentsResponses.MissingAnswer);
  }
  return components.concat(
    Array.from({ length: selectAmount }, (_, selectNum) => {
      const options = answers.splice(0, 25).map((answer, i) => ({
        label: ApplicationApplyDashboardComponentsFunctionResponses.selectLabel(
          i + 1 + selectNum * 25,
        ),
        value: String(i + selectNum * 25),
        description:
          ApplicationApplyDashboardComponentsFunctionResponses.selectDescription(
            i + 1 + selectNum * 25,
          ),
      }));
      return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
        new StringSelectMenuBuilder()
          .addOptions(options)
          .setCustomId(`view-${selectNum}`)
          .setPlaceholder(
            ApplicationApplyDashboardComponentsResponses.SelectPlaceholder,
          ),
      ]);
    }),
  );
}

export function generateApplicationDashboardModal(
  num: number,
  question: string,
  maxAnswerLength: number,
  answer?: string,
): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`answer`)
    .setTitle(ApplicationApplyDashboardModalFunctionResponses.title(num + 1))
    .addComponents([
      new ActionRowBuilder<TextInputBuilder>().addComponents([
        new TextInputBuilder()
          .setCustomId(`answer-${num}`)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(maxAnswerLength)
          .setRequired(true)
          .setLabel(
            question.length > 45 ? question.substring(0, 42) + '...' : question,
          )
          .setValue(answer || ''),
      ]),
    ]);
}
