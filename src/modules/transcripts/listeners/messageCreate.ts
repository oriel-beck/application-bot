import { resolveChannelAuthorId } from '@lib/bdfd-ai/channel-utils.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { ChannelType, type Collection, Message } from 'discord.js';
import { deliveredMessageText, UNAVAILABLE_TRANSCRIPT_TEXT } from '../managers/transcriptManager.js';

@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate,
  name: 'transcriptsMessageCreate'
})
export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
  async run(message: Message) {
    if (message.channel.type !== ChannelType.GuildText) return;
    if (message.channel.parentId !== this.container.config.categories.tickets) return;
    if (!(await this.container.transcripts.recordingEnabled())) return;

    const channel = message.channel;
    const text = deliveredMessageText(message.content) ?? UNAVAILABLE_TRANSCRIPT_TEXT;
    const currentTranscript = await this.container.transcripts.get(channel.id).catch(() => null);
    if (!currentTranscript) {
      let authorId = await resolveChannelAuthorId(channel, 'ticket');
      if (!authorId && !message.author.bot) authorId = message.author.id;
      if (!authorId) return;

      try {
        await this.container.transcripts.create({
          channel: BigInt(channel.id),
          author: BigInt(authorId)
        });

        let lastMessageId: string | undefined = message.id;
        const earlier: Message[] = [];
        do {
          const msgs: Collection<string, Message> = await channel.messages.fetch({
            limit: 100,
            before: lastMessageId
          });
          earlier.push(...msgs.values());
          lastMessageId = msgs.last()?.id;
        } while (lastMessageId);

        const toStore = [...earlier, message];
        const BATCH_SIZE = 20;
        for (let i = 0; i < toStore.length; i += BATCH_SIZE) {
          const chunk = toStore.slice(i, i + BATCH_SIZE);
          await Promise.all(
            chunk.map((msg) =>
              this.container.transcripts.addMessage({
                channel: BigInt(channel.id),
                user: BigInt(msg.author.id),
                message: deliveredMessageText(msg.content) ?? UNAVAILABLE_TRANSCRIPT_TEXT,
                id: msg.id
              })
            )
          );
        }
      } catch (error) {
        console.error('Transcript backfill failed:', error);
      }
    } else {
      await this.container.transcripts.addMessage({
        user: BigInt(message.author.id),
        channel: BigInt(channel.id),
        message: text,
        id: message.id
      });
    }
  }
}
