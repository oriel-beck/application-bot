import { cleanupClosedSupportChannel } from '@lib/bdfd-ai/cleanup-channel.js';
import { ForumCustomIDs } from '@lib/constants/custom-ids.js';
import { container } from '@sapphire/framework';
import {
  DiscordAPIError,
  type ActionRowBuilder,
  type ButtonBuilder,
  type EmbedBuilder,
  type Message,
  type ThreadChannel
} from 'discord.js';
import {
  bugReportNotABugDm,
  bugReportNotABugEmbed,
  bugReportResolvedDm,
  bugReportResolvedEmbed,
  generateBugReportHelpEmbed
} from './bug-report-util.js';
import {
  detectInternationalSupportLanguage,
  formatInternationalResolvedDm,
  getInternationalSupportStrings
} from './international-support.i18n.js';
import { generateInternationalPostHelpEmbed, internationalResolvedEmbed } from './international-util.js';
import { generatePostHelpEmbed, supportResolvedDm, supportResolvedEmbed } from './util.js';

export type ForumPostKind = 'support' | 'international_support' | 'bug_reports';
export type ForumCloseKind = 'resolved' | 'not_a_bug';

export function forumHelpMessageKey(threadId: string) {
  return `forum:help:${threadId}`;
}

export function forumTagsKey(threadId: string) {
  return `forum:tags:${threadId}`;
}

export function forumClosedKey(threadId: string) {
  return `forum:closed:${threadId}`;
}

export function getForumPostKind(parentId: string | null | undefined): ForumPostKind | null {
  const { channels } = container.config;
  if (parentId === channels.support) return 'support';
  if (parentId === channels.international_support) return 'international_support';
  if (parentId === channels.bug_reports) return 'bug_reports';
  return null;
}

export function sameTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((tag) => set.has(tag));
}

export function getCloseAction(kind: ForumPostKind, oldTags: string[], newTags: string[]): ForumCloseKind | null {
  const oldSet = new Set(oldTags);
  const newSet = new Set(newTags);

  if (kind === 'bug_reports') {
    const { resolved, not_a_bug } = container.config.bug_report_tags;
    if (!oldSet.has(resolved) && newSet.has(resolved)) return 'resolved';
    if (!oldSet.has(not_a_bug) && newSet.has(not_a_bug)) return 'not_a_bug';
    return null;
  }

  const resolved =
    kind === 'support' ? container.config.support_tags.resolved : container.config.international_support_tags.resolved;
  if (!oldSet.has(resolved) && newSet.has(resolved)) return 'resolved';
  return null;
}

export function hasCloseTag(kind: ForumPostKind, tags: string[]): boolean {
  const set = new Set(tags);
  if (kind === 'bug_reports') {
    const { resolved, not_a_bug } = container.config.bug_report_tags;
    return set.has(resolved) || set.has(not_a_bug);
  }
  const resolved =
    kind === 'support' ? container.config.support_tags.resolved : container.config.international_support_tags.resolved;
  return set.has(resolved);
}

export function generateHelpPayload(
  kind: ForumPostKind,
  appliedTags: string[]
): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> } {
  if (kind === 'support') return generatePostHelpEmbed(appliedTags);
  if (kind === 'international_support') return generateInternationalPostHelpEmbed(appliedTags);
  return generateBugReportHelpEmbed(appliedTags);
}

function isForumHelpMessage(message: Message): boolean {
  const botId = message.client.user?.id;
  if (!botId || message.author.id !== botId) return false;

  for (const row of message.components) {
    if (!('components' in row)) continue;
    for (const component of row.components) {
      if (!('customId' in component) || !component.customId) continue;
      if (
        component.customId.startsWith(`${ForumCustomIDs.toggleTag}:`) ||
        component.customId.startsWith(`${ForumCustomIDs.supportResolve}:`) ||
        component.customId.startsWith(`${ForumCustomIDs.bugClose}:`)
      )
        return true;
    }
  }
  return false;
}

export async function storeForumHelpMessageId(threadId: string, messageId: string) {
  await container.redis.set(forumHelpMessageKey(threadId), messageId);
}

export async function storeForumTags(threadId: string, tags: string[]) {
  await container.redis.set(forumTagsKey(threadId), JSON.stringify(tags));
}

export async function getStoredForumTags(threadId: string): Promise<string[] | null> {
  const raw = await container.redis.get(forumTagsKey(threadId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.every((tag) => typeof tag === 'string') ? parsed : null;
  } catch {
    return null;
  }
}

async function dmThreadOwner(thread: ThreadChannel, content: string) {
  const ownerId = thread.ownerId ?? (await thread.fetchOwner().catch(() => null))?.id;
  if (!ownerId) return;

  const user = await thread.client.users.fetch(ownerId).catch(() => null);
  await user?.send({ content }).catch(() => null);
}

export async function fetchForumHelpMessage(thread: ThreadChannel): Promise<Message | null> {
  const storedId = await container.redis.get(forumHelpMessageKey(thread.id));
  if (storedId) {
    const stored = await thread.messages.fetch(storedId).catch(() => null);
    if (stored) return stored;
  }

  const oldest = await thread.messages.fetch({ after: '0', limit: 20 }).catch(() => null);
  const fromOldest = oldest?.find(isForumHelpMessage);
  if (fromOldest) {
    await storeForumHelpMessageId(thread.id, fromOldest.id);
    return fromOldest;
  }

  const recent = await thread.messages.fetch({ limit: 20 }).catch(() => null);
  const fromRecent = recent?.find(isForumHelpMessage);
  if (fromRecent) await storeForumHelpMessageId(thread.id, fromRecent.id);
  return fromRecent ?? null;
}

export async function syncForumHelpEmbed(thread: ThreadChannel, kind: ForumPostKind, appliedTags: string[]) {
  const message = await fetchForumHelpMessage(thread);
  if (!message) return;

  const { embed, row } = generateHelpPayload(kind, appliedTags);
  await message.edit({ embeds: [embed], components: [row] }).catch(() => null);
}

export async function applyForumCloseFlow(
  thread: ThreadChannel,
  kind: ForumPostKind,
  closeKind: ForumCloseKind,
  localeTags: string[]
) {
  const acquired = await container.redis.set(forumClosedKey(thread.id), '1', 'EX', 300, 'NX');
  if (acquired !== 'OK') return;

  try {
    const guildName = thread.guild?.name ?? 'the server';
    const {
      embed: closeEmbed,
      dmContent,
      cleanupAi
    } = buildCloseContent(kind, closeKind, localeTags, guildName, thread.url);

    await thread.send({ embeds: [closeEmbed] });

    const helpMessage = await fetchForumHelpMessage(thread);
    if (helpMessage) await helpMessage.edit({ components: [] }).catch(() => null);

    await dmThreadOwner(thread, dmContent);

    try {
      await thread.edit({ locked: true, archived: true });
    } catch (error) {
      if (error instanceof DiscordAPIError && (error.code === 50001 || error.code === 50013)) {
        await thread
          .send({
            content:
              closeKind === 'not_a_bug'
                ? 'The post was marked as not a bug, but I could not lock/archive it due to missing access.'
                : 'The post was marked as resolved, but I could not lock/archive it due to missing access.'
          })
          .catch(() => null);
      } else {
        throw error;
      }
    }

    if (cleanupAi) await cleanupClosedSupportChannel(thread.id, { deleteTranscript: true });
    await storeForumTags(thread.id, thread.appliedTags ?? []);
  } catch (error) {
    await container.redis.del(forumClosedKey(thread.id)).catch(() => null);
    throw error;
  }
}

function buildCloseContent(
  kind: ForumPostKind,
  closeKind: ForumCloseKind,
  localeTags: string[],
  guildName: string,
  url: string
): { embed: EmbedBuilder; dmContent: string; cleanupAi: boolean } {
  if (kind === 'international_support') {
    const strings = getInternationalSupportStrings(detectInternationalSupportLanguage(localeTags));
    return {
      embed: internationalResolvedEmbed(strings),
      dmContent: formatInternationalResolvedDm(strings.resolvedDm, guildName, url),
      cleanupAi: true
    };
  }

  if (kind === 'bug_reports' && closeKind === 'not_a_bug') {
    return {
      embed: bugReportNotABugEmbed(),
      dmContent: bugReportNotABugDm(guildName, url),
      cleanupAi: false
    };
  }

  if (kind === 'bug_reports') {
    return {
      embed: bugReportResolvedEmbed(),
      dmContent: bugReportResolvedDm(guildName, url),
      cleanupAi: false
    };
  }

  return {
    embed: supportResolvedEmbed(),
    dmContent: supportResolvedDm(guildName, url),
    cleanupAi: true
  };
}
