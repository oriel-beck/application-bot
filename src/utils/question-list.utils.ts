import { BDFDQuestion } from '../entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from '@discordjs/builders';
import { ButtonStyle } from 'discord.js';

export function generateQuestionListEmbed(
  questions: BDFDQuestion[],
  page = 0,
): [EmbedBuilder] {
  questions = [...questions.splice(page * 25, (page + 1) * 25)];
  return [
    new EmbedBuilder().setFields(
      questions.map((q) => ({
        name: q.id,
        value: q.question,
      })),
    ),
  ];
}

export function generateQuestionListComponents(
  questions: BDFDQuestion[],
  page = 0,
): [ActionRowBuilder<ButtonBuilder>] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        // TODO: find a prev emoji
        .setLabel('Prev')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`question-list-${page - 1}`)
        .setDisabled(page === 0),
      new ButtonBuilder()
        // TODO: find a next emoji
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`question-list-${page + 1}`)
        .setDisabled(page === Math.ceil(questions.length / 10)),
    ]),
  ];
}
