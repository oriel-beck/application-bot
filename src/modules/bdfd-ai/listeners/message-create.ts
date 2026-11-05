import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import type { Message, TextChannel, ThreadChannel } from 'discord.js';
import { getBdfdAiChannelKind, isReplyToBot, resolveChannelAuthorId } from '@lib/bdfd-ai/channel-utils.js';
import { processAiRequest } from '@lib/bdfd-ai/process-request.js';

@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate,
  name: 'bdfdAiMessageCreate'
})
export class BdfdAiMessageCreateListener extends Listener<typeof Events.MessageCreate> {
  async run(message: Message) {
    if (!message.inGuild() || message.author.bot) return;

    const channel = message.channel;
    if (!channel.isTextBased() || channel.isDMBased()) return;

    const textChannel = channel as TextChannel | ThreadChannel;
    const kind = getBdfdAiChannelKind(textChannel);
    if (!kind) return;

    const botId = message.client.user?.id;
    if (!botId) return;

    const mentioned = message.mentions.users.has(botId);
    if (!mentioned && !(message.reference?.messageId && (await isReplyToBot(message)))) return;

    const authorId = await resolveChannelAuthorId(textChannel, kind);
    if (!authorId || message.author.id !== authorId) return;

    const userText = message.content?.trim();
    if (!userText) {
      await message
        .reply({
          content: 'Send the question as text, or a pastebin / `.txt` link, or use `/ai`.',
          allowedMentions: { parse: [], repliedUser: false }
        })
        .catch(() => null);
      return;
    }

    await processAiRequest({
      container: this.container,
      channelId: channel.id,
      userText,
      source: { type: 'message', message }
    });
  }
}
