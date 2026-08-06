import { AiConversationCustomIDs } from '@lib/constants/custom-ids.js';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    TextDisplayBuilder,
} from 'discord.js';

/** TextDisplay + ActionRow + 2 buttons ≈ 4 comps/row; fits 8 with header + pagination under 40. */
export const AI_CONVERSATION_LIST_PAGE_SIZE = 8;

export type AiConversationListDir = 'first' | 'prev' | 'next' | 'last' | 'noop';

export interface AiConversationListRow {
    channelId: string;
    usage: number;
    limit: number;
    turnCount: number;
}

export function clampAiConversationListPage(page: number, totalCount: number): number {
    const totalPages = Math.max(1, Math.ceil(totalCount / AI_CONVERSATION_LIST_PAGE_SIZE));
    return Math.min(Math.max(0, page), totalPages - 1);
}

export function resolveAiConversationListDirPage(
    dir: AiConversationListDir,
    currentPage: number,
    totalCount: number,
): number {
    const totalPages = Math.max(1, Math.ceil(totalCount / AI_CONVERSATION_LIST_PAGE_SIZE));
    const safe = clampAiConversationListPage(currentPage, totalCount);
    switch (dir) {
        case 'first':
            return 0;
        case 'prev':
            return Math.max(0, safe - 1);
        case 'next':
            return Math.min(totalPages - 1, safe + 1);
        case 'last':
            return totalPages - 1;
        default:
            return safe;
    }
}

export function parseAiConversationListDirCustomId(
    customId: string,
): { dir: AiConversationListDir; page: number } | null {
    const prefix = `${AiConversationCustomIDs.buttons.listDir}:`;
    if (!customId.startsWith(prefix)) return null;
    const rest = customId.slice(prefix.length);
    const [dirRaw, pageRaw] = rest.split(':');
    const dir = dirRaw as AiConversationListDir;
    if (!['first', 'prev', 'next', 'last', 'noop'].includes(dir)) return null;
    const page = Number(pageRaw);
    if (!Number.isInteger(page) || page < 0) return null;
    return { dir, page };
}

export function parseAiConversationChannelPageCustomId(
    customId: string,
    prefix: string,
): { channelId: string; page: number } | null {
    const full = `${prefix}:`;
    if (!customId.startsWith(full)) return null;
    const rest = customId.slice(full.length);
    const colon = rest.lastIndexOf(':');
    if (colon <= 0) return null;
    const channelId = rest.slice(0, colon);
    const page = Number(rest.slice(colon + 1));
    if (!/^\d+$/.test(channelId) || !Number.isInteger(page) || page < 0) return null;
    return { channelId, page };
}

function buildPaginationRow(pageIndex: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
    const base = AiConversationCustomIDs.buttons.listDir;
    const atFirst = pageIndex <= 0;
    const atLast = pageIndex >= totalPages - 1;

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${base}:first:${pageIndex}`)
            .setLabel('<<')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(atFirst),
        new ButtonBuilder()
            .setCustomId(`${base}:prev:${pageIndex}`)
            .setLabel('Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(atFirst),
        new ButtonBuilder()
            .setCustomId(`${base}:noop:${pageIndex}`)
            .setLabel(`${pageIndex + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`${base}:next:${pageIndex}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(atLast),
        new ButtonBuilder()
            .setCustomId(`${base}:last:${pageIndex}`)
            .setLabel('>>')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(atLast),
    );
}

/** Load channel summaries with Redis usage/limit for the list UI. */
export async function loadAiConversationListRows(
    channels: { channelId: string; turnCount: number }[],
    getUsage: (channelId: string) => Promise<number>,
    getLimit: (channelId: string) => Promise<number>,
): Promise<AiConversationListRow[]> {
    return Promise.all(
        channels.map(async (ch) => {
            const [usage, limit] = await Promise.all([
                getUsage(ch.channelId),
                getLimit(ch.channelId),
            ]);
            return {
                channelId: ch.channelId,
                usage,
                limit,
                turnCount: ch.turnCount,
            };
        }),
    );
}

export async function buildAiConversationListMessage(
    channels: { channelId: string; turnCount: number }[],
    pageIndex: number,
    getUsage: (channelId: string) => Promise<number>,
    getLimit: (channelId: string) => Promise<number>,
) {
    const totalCount = channels.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / AI_CONVERSATION_LIST_PAGE_SIZE));
    const safePage = clampAiConversationListPage(pageIndex, totalCount);
    const slice = channels.slice(
        safePage * AI_CONVERSATION_LIST_PAGE_SIZE,
        safePage * AI_CONVERSATION_LIST_PAGE_SIZE + AI_CONVERSATION_LIST_PAGE_SIZE,
    );
    const rows = await loadAiConversationListRows(slice, getUsage, getLimit);

    const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# AI conversations\n**${totalCount}** channels · page **${safePage + 1}** / **${totalPages}**`,
        ),
    );

    if (!rows.length) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent('No AI conversations found.'),
        );
    } else {
        for (const item of rows) {
            container
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**${item.usage}/${item.limit}** · <#${item.channelId}>`,
                    ),
                )
                .addActionRowComponents(
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `${AiConversationCustomIDs.buttons.reset}:${item.channelId}:${safePage}`,
                            )
                            .setLabel('Reset usage')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(
                                `${AiConversationCustomIDs.buttons.delete}:${item.channelId}:${safePage}`,
                            )
                            .setLabel('Delete')
                            .setStyle(ButtonStyle.Danger),
                    ),
                );
        }
    }

    if (totalPages > 1) {
        container.addActionRowComponents(buildPaginationRow(safePage, totalPages));
    }

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    };
}
