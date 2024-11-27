import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { Message, MessageMentions } from "discord.js";

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
            const author = authorMention?.at(0);
            if (!author) return;

            // Create the transcript if it's missing
            await this.container.transcripts.create({
                channel: BigInt(message.channel.id),
                author: BigInt(author)
            });

            // Fetch all messages in the channel
            let lastMessageId: string | undefined;
            const allMessages: Message[] = [];
            do {
                const messages = await message.channel.messages.fetch({ limit: 100, before: lastMessageId });
                allMessages.push(...messages.values());
                lastMessageId = messages.size > 0 ? messages.last()?.id : undefined;
            } while (lastMessageId);

            // Add all fetched messages to the transcript
            const addMessagesPromises = allMessages.map((msg) =>
                this.container.transcripts.addMessage({
                    channel: BigInt(message.channel.id),
                    user: BigInt(msg.author.id),
                    message: msg.content,
                    id: msg.id,
                })
            );
            await Promise.all(addMessagesPromises);
        }

        // Add the current message to the transcript
        await this.container.transcripts.addMessage({
            user: BigInt(message.author.id),
            channel: BigInt(message.channel.id),
            message: message.content,
            id: message.id,
        });
    }
}