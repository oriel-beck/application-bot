import { BDFDApplication } from '../entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from '@discordjs/builders';
import {
  APIMessageComponentEmoji,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { Client } from 'discord.js';
import { Colors } from '../providers';
import {
  ApplicationReviewEmbedResponses,
  ApplicationReviewModalFunctionResponses,
  ApplicationReviewModalResponses,
} from '../constants';
import { setEmojiToButton } from './set-emojis.utils';

export async function generateApplicationResponseEmbed(
  app: BDFDApplication,
  client: Client,
  colors: Colors,
  maxQuestionsPerPage: number,
  page = 0,
): Promise<[EmbedBuilder]> {
  const maxperpage = Number(maxQuestionsPerPage);
  // copy the answers so the application won't change
  const answers = [...app.answers].splice(page * maxperpage, maxperpage);
  // copy the questions so the application won't change
  const questions = [...app.questions].splice(page * maxperpage, maxperpage);

  return [
    new EmbedBuilder()
      .setTitle(ApplicationReviewEmbedResponses.Title)
      .addFields(
        Array.from({ length: answers.length }, (_, i) => ({
          name: `${i + 1 + page * maxperpage}) ${questions[i]}`,
          value: answers[i],
        })),
      )
      .setFooter({
        text: app.userid.toString(),
      })
      .setColor(colors[app.state]),
  ];
}

export function generateApplicationResponseComponents(
  userid: string | bigint,
  maxQuestionsPerPage: number,
  maxQuestions: number,
  nextEmoji: APIMessageComponentEmoji,
  prevEmoji: APIMessageComponentEmoji,
  page = 0,
  pending = true,
): [ActionRowBuilder<ButtonBuilder>] {
  const actionRow = new ActionRowBuilder<ButtonBuilder>();
  const paginationNeeded = maxQuestionsPerPage > maxQuestions;
  const lastPage = Math.ceil(maxQuestions / maxQuestionsPerPage);

  if (paginationNeeded) {
    const prevButton = new ButtonBuilder()
      .setCustomId(`prev-${userid}-${page - 1}`)
      .setDisabled(page === 0)
      .setStyle(ButtonStyle.Primary);

    setEmojiToButton(prevButton, 'Prev', prevEmoji);

    actionRow.addComponents(prevButton);
  }

  if (pending) {
    actionRow.addComponents([
      new ButtonBuilder()
        .setCustomId(`deny-${userid}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`accept-${userid}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
    ]);
  }

  if (paginationNeeded) {
    const nextButton = new ButtonBuilder()
      .setCustomId(`next-${userid}-${page + 1}`)
      .setDisabled(page === lastPage)
      .setStyle(ButtonStyle.Primary);

    setEmojiToButton(nextButton, 'Next', nextEmoji);

    actionRow.addComponents();
  }
  return [actionRow];
}

export function generateAcceptModal(userid: bigint): ModalBuilder {
  return new ModalBuilder()
    .setTitle(ApplicationReviewModalFunctionResponses.acceptTitle(userid))
    .setCustomId(`accept-${userid}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents([
        new TextInputBuilder()
          .setLabel(ApplicationReviewModalResponses.AcceptLabel)
          .setStyle(TextInputStyle.Paragraph)
          .setCustomId(`accept-input-${userid}`)
          .setRequired(false),
      ]),
    );
}

export function generateDenyModal(userid: bigint): ModalBuilder {
  return new ModalBuilder()
    .setTitle(ApplicationReviewModalFunctionResponses.denyTitle(userid))
    .setCustomId(`deny-${userid}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents([
        new TextInputBuilder()
          .setLabel(ApplicationReviewModalResponses.DenyLabel)
          .setStyle(TextInputStyle.Paragraph)
          .setCustomId(`deny-input-${userid}`)
          .setRequired(false),
      ]),
    );
}
