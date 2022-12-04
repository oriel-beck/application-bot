import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from '@discordjs/builders';
import {
  ButtonStyle,
  Colors,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { BDFDQuestion } from '../entities';

export function utilGenerateQuestions(baseQuestions: string[]) {
  return function (questions: BDFDQuestion[]) {
    return baseQuestions.concat(questions.map((q) => q.question));
  };
}

export function generateApplicationDashboardEmbed(
  num: number,
  question: string,
  answer = 'N/A',
): [EmbedBuilder] {
  return [
    new EmbedBuilder()
      .setColor(Colors.DarkPurple)
      .addFields([
        {
          name: 'Question',
          value: question,
        },
        {
          name: 'Answer',
          value: answer,
        },
      ])
      .setTitle(`Question ${num + 1}`)
      .setFooter({
        text: 'Press the Answer button to answer, you can edit your answers via the select menu, the application will time out in 40 minutes.',
      }),
  ];
}

export function generateApplicationDashboardComponents(
  current: number,
  userid: string,
  questions: string[],
  answers: string[],
): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
  if (answers.length !== questions.length) {
    answers.push('N/A');
  }

  const selectAmount = Math.ceil(questions.length / 25);
  if (selectAmount > 4)
    throw new Error('Cannot generate more than 4 select menus');

  return (
    [
      new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setLabel('Cancel')
          .setCustomId(`cancel`),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel('Answer')
          .setCustomId(`answer-${current}`),
        new ButtonBuilder()
          .setStyle(
            questions.length === answers.length
              ? ButtonStyle.Success
              : ButtonStyle.Secondary,
          )
          .setLabel('Done')
          .setCustomId(`done`)
          .setDisabled(questions.length !== answers.length),
      ]),
    ] as ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[]
  ).concat(
    Array.from({ length: selectAmount }, (_, selectNum) => {
      const options = answers.splice(0, 25).map((answer, i) => ({
        label: `Question ${i + 1 + selectNum * 25}`,
        value: String(i + selectNum * 25),
        description: `Click to view question ${i + 1 + selectNum * 25}`,
      }));
      return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
        new StringSelectMenuBuilder()
          .addOptions(options)
          .setCustomId(`view-${selectNum}`)
          .setPlaceholder('Choose a question to view'),
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
    .setTitle(`Question ${num + 1}`)
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
