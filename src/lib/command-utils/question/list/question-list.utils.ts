import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { QuestionCustomIDs } from '../../../constants/custom-ids.js';
import type { Question } from '../../../types.js';

/** One string select per message (Discord is unreliable with several selects + rows at once). */
const QUESTIONS_PER_PAGE = 25;
const SELECT_MENU_ROW_INDEX = 0;

const SELECT_OPTION_LABEL_MAX = 100;

export function truncateSelectLabel(text: string, maxLength = SELECT_OPTION_LABEL_MAX): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength);
}

export function generateQuestionListEmbed(
  questions: Question[],
  opts?: { pageIndex: number; perPage: number; totalPages: number }
) {
  const count = questions.length;

  const howTo = 'Pick a question from the menu below, or use **/question show** with an id for full text.';

  let description: string;
  if (opts && opts.totalPages > 1) {
    const start = opts.pageIndex * opts.perPage + 1;
    const end = Math.min(count, (opts.pageIndex + 1) * opts.perPage);
    const pageLine = `\n\n**Page ${opts.pageIndex + 1}** of **${opts.totalPages}** — questions **${start}–${end}**.`;
    description = `There are **${count}** questions. ${howTo}${pageLine}`;
  } else {
    description = `There are **${count}** questions. ${howTo}`;
  }

  return [
    new EmbedBuilder().setTitle(`Listing ${count} questions`).setColor(Colors.Blurple).setDescription(description)
  ];
}

export function generateQuestionListComponents(
  questions: Question[],
  pageIndex: number,
  totalCount: number
): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
  const perPage = QUESTIONS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const safePage = Math.min(Math.max(0, pageIndex), totalPages - 1);
  const pageSlice = questions.slice(safePage * perPage, safePage * perPage + perPage);

  const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

  if (pageSlice.length) {
    const optionBase = safePage * perPage;
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${QuestionCustomIDs.selects.list}:${SELECT_MENU_ROW_INDEX}`)
          .setMaxValues(1)
          .setMinValues(1)
          .setPlaceholder('Select a question to view')
          .addOptions(pageSlice.map((q, j) => mapQuestionToStringSelectMenuOption(q, optionBase + j)))
      )
    );
  }

  if (totalPages > 1) {
    rows.push(buildQuestionListPageButtonRow(safePage, totalPages));
  }

  return rows;
}

function buildQuestionListPageButtonRow(pageIndex: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  const base = QuestionCustomIDs.buttons.listDir;
  const prevPage = Math.max(0, pageIndex - 1);
  const nextPage = Math.min(totalPages - 1, pageIndex + 1);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${base}:${prevPage}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex <= 0),
    new ButtonBuilder()
      .setCustomId(`${base}:noop`)
      .setLabel(`${pageIndex + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${base}:${nextPage}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex >= totalPages - 1)
  );
}

/** Discord rejects duplicate `value`s in a message's string selects; `#slot` disambiguates. */
function mapQuestionToStringSelectMenuOption(question: Question, optionSlot: number): StringSelectMenuOptionBuilder {
  const base = `${question.id} — ${question.question}`;
  return new StringSelectMenuOptionBuilder()
    .setLabel(truncateSelectLabel(base))
    .setValue(`${question.id}#${optionSlot}`);
}
