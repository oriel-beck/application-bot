import { BDFDQuestion } from '../entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from '@discordjs/builders';
import { APIMessageComponentEmoji, ButtonStyle } from 'discord.js';
import { setEmojiToButton } from './set-emojis.utils';

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
  nextEmoji: APIMessageComponentEmoji,
  prevEmoji: APIMessageComponentEmoji,
  page = 0,
): [ActionRowBuilder<ButtonBuilder>] {
  const prevButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Primary)
    .setCustomId(`question-list-${page - 1}`)
    .setDisabled(page === 0);

  setEmojiToButton(prevButton, 'Prev', prevEmoji);

  const nextButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Primary)
    .setCustomId(`question-list-${page + 1}`)
    .setDisabled(page === Math.ceil(questions.length / 10));

  setEmojiToButton(nextButton, 'Next', nextEmoji);

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents([
      prevButton,
      nextButton,
    ]),
  ];
}
