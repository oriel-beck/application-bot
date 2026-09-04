import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { Message, MessageMentions } from 'discord.js';

@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate,
  name: 'transcriptsMessageCreate'
})
export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
  async run(message: Message<true>) {
    if (message.channel.parentId !== this.container.config.categories.tickets) return;

    const currentTranscript = await this.container.transcripts.get(message.channel.id).catch(() => null);
    if (!currentTranscript) {
      const topMessage = await message.channel.messages.fetch({ after: '0', limit: 1 });
      // If the first message is not from a bot, abort
      if (!topMessage.at(0)?.author.bot) return;

      const description = topMessage.at(0)?.embeds.at(0)?.description;
      if (!description) return;

      const authorMention = MessageMentions.UsersPattern.exec(description);
      const author = authorMention?.at(1);
      if (!author) return;

      try {
        // Create the transcript if it's missing
        await this.container.transcripts.create({
          channel: BigInt(message.channel.id),
          author: BigInt(author)
        });

        // Fetch all messages in the channel
        let lastMessageId: string | undefined = message.id;
        const allMessages: Message[] = [];
        do {
          // @ts-expect-error not sure why but the TS compiler thinks this is any, it's not
          const msgs = await message.channel.messages.fetch({ limit: 100, before: lastMessageId });
          allMessages.push(...msgs.values());
          lastMessageId = msgs.last()?.id;
        } while (lastMessageId);

        const BATCH_SIZE = 20;
        for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
          const chunk = allMessages.slice(i, i + BATCH_SIZE);
          await Promise.all(
            chunk.map((msg) =>
              this.container.transcripts.addMessage({
                channel: BigInt(message.channel.id),
                user: BigInt(msg.author.id),
                message: msg.content,
                id: msg.id
              })
            )
          );
        }
      } catch (error) {
        console.error('Transcript backfill failed:', error);
      }
    } else {
      // Add the current message to the transcript
      await this.container.transcripts.addMessage({
        user: BigInt(message.author.id),
        channel: BigInt(message.channel.id),
        message: message.content,
        id: message.id
      });
    }
  }
}
