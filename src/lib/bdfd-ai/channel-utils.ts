import { container } from '@sapphire/framework';
import type { Message, TextChannel, ThreadChannel } from 'discord.js';
import { ChannelType } from 'discord.js';

export type BdfdAiChannelKind = 'support_thread' | 'intl_thread' | 'ticket';

export function getBdfdAiChannelKind(channel: TextChannel | ThreadChannel): BdfdAiChannelKind | null {
  const { channels, categories } = container.config;

  if (channel.isThread()) {
    const parentId = channel.parentId;
    if (parentId === channels.support) return 'support_thread';
    if (parentId === channels.international_support) return 'intl_thread';
    return null;
  }

  if (channel.type === ChannelType.GuildText && channel.parentId === categories.tickets) {
    return 'ticket';
  }

  return null;
}

export async function resolveChannelAuthorId(
  channel: TextChannel | ThreadChannel,
  kind: BdfdAiChannelKind
): Promise<string | null> {
  if (kind === 'support_thread' || kind === 'intl_thread') {
    if (!channel.isThread()) return null;
    return channel.ownerId;
  }

  const transcript = await container.transcripts.get(channel.id).catch(() => null);
  if (transcript?.transcript.author) {
    return transcript.transcript.author.toString();
  }

  const top = await channel.messages.fetch({ after: '0', limit: 1 }).catch(() => null);
  const first = top?.first();
  if (!first?.author.bot) return null;

  const description = first.embeds.at(0)?.description;
  if (!description) return null;

  const match = description.match(/<@!?(\d{17,20})>/);
  return match?.[1] ?? null;
}

export function resolveChannelFromInteraction(
  channel: TextChannel | ThreadChannel
): TextChannel | ThreadChannel | null {
  return getBdfdAiChannelKind(channel) ? channel : null;
}

export async function isReplyToBot(message: Message<true>): Promise<boolean> {
  const ref = message.reference;
  if (!ref?.messageId) return false;

  const botId = message.client.user?.id;
  if (!botId) return false;

  const cached = message.channel.messages.cache.get(ref.messageId);
  if (cached) return cached.author.id === botId;

  const fetched = await message.channel.messages.fetch(ref.messageId).catch(() => null);
  return fetched?.author.id === botId;
}
