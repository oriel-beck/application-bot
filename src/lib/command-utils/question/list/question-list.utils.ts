import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from "discord.js";
import { QuestionCustomIDs } from "../../../constants/custom-ids.js";
import type { Question } from "../../../types.js";

const SELECT_OPTIONS_PER_MENU = 25;
const SELECT_ROWS_FULL = 5;
const MAX_QUESTIONS_WITHOUT_DIR = SELECT_OPTIONS_PER_MENU * SELECT_ROWS_FULL;

const SELECT_ROWS_PAGED = 4;
const PAGE_SIZE_WITH_BUTTONS = SELECT_OPTIONS_PER_MENU * SELECT_ROWS_PAGED;

const DETAILED_EMBED_MAX_QUESTIONS = 20;
const SELECT_OPTION_LABEL_MAX = 100;

export function truncateSelectLabel(text: string, maxLength = SELECT_OPTION_LABEL_MAX): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength);
}

export function generateQuestionListEmbed(
    questions: Question[],
    opts?: { pageIndex: number; perPage: number; totalPages: number },
) {
    const count = questions.length;

    let description: string;
    if (opts) {
        const start = opts.pageIndex * opts.perPage + 1;
        const end = Math.min(count, (opts.pageIndex + 1) * opts.perPage);
        const pageLine = `\n\n**Page ${opts.pageIndex + 1}** of **${opts.totalPages}** — showing questions **${start}–${end}**.`;
        description = `There are **${count}** questions. Use the select menu(s) below to view a question.${pageLine}`;
    } else if (count > DETAILED_EMBED_MAX_QUESTIONS) {
        const truncationNote =
            count > MAX_QUESTIONS_WITHOUT_DIR
                ? `\n\nOnly the first **${MAX_QUESTIONS_WITHOUT_DIR}** questions appear in the select menus. Use **/question show** with an id for the rest until full pagination ships.`
                : "";
        description = `There are **${count}** questions. Use the select menu(s) below to view a question.${truncationNote}`;
    } else {
        description = questions.map((q) => `ID: ${q.id}\nQ: ${q.question}`).join("---\n");
    }

    return [
        new EmbedBuilder()
            .setTitle(`Listing ${count} questions`)
            .setColor(Colors.Blurple)
            .setDescription(description),
    ];
}

export function generateQuestionListComponents(
    questions: Question[],
    pageIndex: number,
    totalCount: number,
): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
    const needsDir = totalCount > MAX_QUESTIONS_WITHOUT_DIR;
    const perPage = needsDir ? PAGE_SIZE_WITH_BUTTONS : MAX_QUESTIONS_WITHOUT_DIR;
    const pageSlice = questions.slice(pageIndex * perPage, pageIndex * perPage + perPage);

    const selectRowCount = needsDir
        ? Math.min(SELECT_ROWS_PAGED, Math.ceil(pageSlice.length / SELECT_OPTIONS_PER_MENU) || 1)
        : Math.min(SELECT_ROWS_FULL, Math.ceil(pageSlice.length / SELECT_OPTIONS_PER_MENU) || 1);

    const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];
    let optionSlot = 0;
    for (let i = 0; i < selectRowCount; i++) {
        const chunk = pageSlice.slice(
            i * SELECT_OPTIONS_PER_MENU,
            i * SELECT_OPTIONS_PER_MENU + SELECT_OPTIONS_PER_MENU,
        );
        if (!chunk.length) break;
        rows.push(
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                generateStringSelectMenu(i, chunk, optionSlot),
            ),
        );
        optionSlot += chunk.length;
    }

    if (needsDir) {
        const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
        rows.push(buildQuestionDirectoryButtonRow(pageIndex, totalPages));
    }

    return rows;
}

function buildQuestionDirectoryButtonRow(pageIndex: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
    const base = QuestionCustomIDs.buttons.listDir;
    const prevPage = Math.max(0, pageIndex - 1);
    const nextPage = Math.min(totalPages - 1, pageIndex + 1);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${base}:${prevPage}`)
            .setLabel("Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex <= 0),
        new ButtonBuilder()
            .setCustomId(`${base}:noop`)
            .setLabel(`${pageIndex + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`${base}:${nextPage}`)
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex >= totalPages - 1),
    );
}

function generateStringSelectMenu(index: number, chunk: Question[], optionSlotBase: number) {
    return new StringSelectMenuBuilder()
        .setCustomId(`${QuestionCustomIDs.selects.list}:${index}`)
        .setMaxValues(1)
        .setMinValues(1)
        .setPlaceholder("Select a question to view")
        .addOptions(
            chunk.map((q, j) => mapQuestionToStringSelectMenuOption(q, optionSlotBase + j)),
        );
}

/** Discord rejects duplicate `value`s in a message's string selects; `#slot` disambiguates. */
function mapQuestionToStringSelectMenuOption(
    question: Question,
    optionSlot: number,
): StringSelectMenuOptionBuilder {
    const base = `${question.id} — ${question.question}`;
    return new StringSelectMenuOptionBuilder()
        .setLabel(truncateSelectLabel(base))
        .setValue(`${question.id}#${optionSlot}`);
}
