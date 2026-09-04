import { TranscriptCustomIDs } from '@lib/constants/custom-ids.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder
} from 'discord.js';

/** TextDisplay + ActionRow + 2 buttons ≈ 4 comps/row; fits 8 with header + pagination under 40. */
export const TRANSCRIPT_LIST_PAGE_SIZE = 8;

export interface TranscriptListRow {
  channelId: string;
  authorId: string;
  messageCount: number;
}

export type TranscriptListDir = 'first' | 'prev' | 'next' | 'last' | 'noop';

export function clampTranscriptListPage(page: number, totalCount: number): number {
  const totalPages = Math.max(1, Math.ceil(totalCount / TRANSCRIPT_LIST_PAGE_SIZE));
  return Math.min(Math.max(0, page), totalPages - 1);
}

export function resolveTranscriptListDirPage(dir: TranscriptListDir, currentPage: number, totalCount: number): number {
  const totalPages = Math.max(1, Math.ceil(totalCount / TRANSCRIPT_LIST_PAGE_SIZE));
  const safe = clampTranscriptListPage(currentPage, totalCount);
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

export function parseTranscriptListDirCustomId(customId: string): { dir: TranscriptListDir; page: number } | null {
  const prefix = `${TranscriptCustomIDs.buttons.listDir}:`;
  if (!customId.startsWith(prefix)) return null;
  const rest = customId.slice(prefix.length);
  const [dirRaw, pageRaw] = rest.split(':');
  const dir = dirRaw as TranscriptListDir;
  if (!['first', 'prev', 'next', 'last', 'noop'].includes(dir)) return null;
  const page = Number(pageRaw);
  if (!Number.isInteger(page) || page < 0) return null;
  return { dir, page };
}

export function parseTranscriptChannelPageCustomId(
  customId: string,
  prefix: string
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
  const base = TranscriptCustomIDs.buttons.listDir;
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
      .setDisabled(atLast)
  );
}

export function buildTranscriptListMessage(items: TranscriptListRow[], pageIndex: number) {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / TRANSCRIPT_LIST_PAGE_SIZE));
  const safePage = clampTranscriptListPage(pageIndex, totalCount);
  const slice = items.slice(
    safePage * TRANSCRIPT_LIST_PAGE_SIZE,
    safePage * TRANSCRIPT_LIST_PAGE_SIZE + TRANSCRIPT_LIST_PAGE_SIZE
  );

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# Transcripts\n**${totalCount}** stored · page **${safePage + 1}** / **${totalPages}**`
    )
  );

  if (!slice.length) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('No transcripts found.'));
  } else {
    for (const item of slice) {
      container
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${item.messageCount}** messages · <#${item.channelId}>`)
        )
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`${TranscriptCustomIDs.buttons.export}:${item.channelId}:${safePage}`)
              .setLabel('Export')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`${TranscriptCustomIDs.buttons.delete}:${item.channelId}:${safePage}`)
              .setLabel('Delete')
              .setStyle(ButtonStyle.Danger)
          )
        );
    }
  }

  if (totalPages > 1) {
    container.addActionRowComponents(buildPaginationRow(safePage, totalPages));
  }

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
  };
}

export type TranscriptExportPayload = {
  channelLabel: string;
  authorDisplayName: string;
  messages: { userId: string; content: string }[];
  userNames: Map<string, string>;
};

/** Build plain-text transcript body for .txt export. */
export function formatTranscriptTxt(payload: TranscriptExportPayload): string {
  let text = `Transcript of ${payload.channelLabel}\nTicket author: ${payload.authorDisplayName}`;
  for (const message of payload.messages) {
    const name = payload.userNames.get(message.userId) ?? 'UNKNOWN';
    text += `\n\n${name}: ${message.content}`;
  }
  return text;
}
