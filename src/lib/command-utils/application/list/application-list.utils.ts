import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from "discord.js";
import { ApplicationCustomIDs } from "../../../constants/custom-ids.js";
import type { ApplicationStateKeys } from "../../../constants/application.js";
import { Application } from "@lib/types.js";

const SELECT_ROWS_FULL = 5;
const OPTIONS_PER_SELECT = 25;
const MAX_LIST_WITHOUT_DIR = SELECT_ROWS_FULL * OPTIONS_PER_SELECT;

const SELECT_ROWS_PAGED = 4;
const PAGE_SIZE_WITH_BUTTONS = SELECT_ROWS_PAGED * OPTIONS_PER_SELECT;

export function generateApplicationListEmbed(
    count: number,
    state: ApplicationStateKeys,
    opts?: { pageIndex: number; perPage: number; totalPages: number },
) {
    const base = `There are currently \`${count}\` \`${state}\` applications`;
    let extra = "";
    if (opts) {
        const start = opts.pageIndex * opts.perPage + 1;
        const end = Math.min(count, (opts.pageIndex + 1) * opts.perPage);
        extra = `\n\n**Page ${opts.pageIndex + 1}** of **${opts.totalPages}** — showing **${start}–${end}**.`;
    }
    return [
        new EmbedBuilder()
            .setTitle("Application list")
            .setDescription(`${base}${extra}`)
            .setColor(Colors.Aqua),
    ];
}

export function generateApplicationListComponents(
    applications: Application[],
    state: ApplicationStateKeys,
    pageIndex: number,
    totalCount: number,
): ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] {
    const needsDir = totalCount > MAX_LIST_WITHOUT_DIR;
    const perPage = needsDir ? PAGE_SIZE_WITH_BUTTONS : MAX_LIST_WITHOUT_DIR;
    const pageSlice = applications.slice(pageIndex * perPage, pageIndex * perPage + perPage);

    const selectRowCount = needsDir
        ? Math.min(SELECT_ROWS_PAGED, Math.ceil(pageSlice.length / OPTIONS_PER_SELECT) || 1)
        : Math.min(SELECT_ROWS_FULL, Math.ceil(pageSlice.length / OPTIONS_PER_SELECT) || 1);

    const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];
    for (let i = 0; i < selectRowCount; i++) {
        const chunk = pageSlice.slice(
            i * OPTIONS_PER_SELECT,
            i * OPTIONS_PER_SELECT + OPTIONS_PER_SELECT,
        );
        if (!chunk.length) break;
        rows.push(
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                generateStringSelectMenu(i, chunk),
            ),
        );
    }

    if (needsDir) {
        const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
        rows.push(buildDirectoryButtonRow(state, pageIndex, totalPages));
    }

    return rows;
}

function buildDirectoryButtonRow(
    state: ApplicationStateKeys,
    pageIndex: number,
    totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
    const base = ApplicationCustomIDs.buttons.listDir;
    const prevPage = Math.max(0, pageIndex - 1);
    const nextPage = Math.min(totalPages - 1, pageIndex + 1);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${base}:${state}:${prevPage}`)
            .setLabel("Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex <= 0),
        new ButtonBuilder()
            .setCustomId(`${base}:${state}:noop`)
            .setLabel(`${pageIndex + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`${base}:${state}:${nextPage}`)
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex >= totalPages - 1),
    );
}

function generateStringSelectMenu(index: number, applications: Application[]) {
    return new StringSelectMenuBuilder()
        .setCustomId(`${ApplicationCustomIDs.selects!.list}:${index}`)
        .setMaxValues(1)
        .setMinValues(1)
        .setPlaceholder("Select an application to view")
        .addOptions(applications.map(mapApplicationToStringSelectMenuOption));
}

function mapApplicationToStringSelectMenuOption(application: Application): StringSelectMenuOptionBuilder {
    return new StringSelectMenuOptionBuilder()
        .setLabel(`View Application ${application.user}`)
        .setValue(application.user.toString());
}
