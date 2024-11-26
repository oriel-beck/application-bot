import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { Message, MessageMentions } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.MessageCreate,
})
export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
    async run(message: Message<true>) {
        if (message.channel.parentId !== this.container.config.categories.tickets) return;
        const currentTranscript = await this.container.transcripts.get(message.channel.id).catch(() => null);
        if (!currentTranscript) {
            const topMessage = await message.channel.messages.fetch({ after: '0', limit: 1 });
            // if somehow master bot failed to send the embed, don't do anything
            if (!topMessage.at(0)?.author.bot) return;

            const description = topMessage.at(0)?.embeds.at(0)?.description;
            if (!description) return;

            const authorMention = MessageMentions.UsersPattern.exec(description);
            const author = authorMention?.at(0);
            if (!author) return;

            // if transcript is missing, create one
            await this.container.transcripts.create({
                channel: BigInt(message.channel.id),
                author: BigInt(author)
            });

            // add the new message to the new transcript
            await this.container.transcripts.addMessage({
                channel: BigInt(message.channel.id),
                user: BigInt(message.author.id),
                message: message.content,
                id: message.id
            });
        }

        await this.container.transcripts.addMessage({
            user: BigInt(message.author.id),
            channel: BigInt(message.channel.id),
            message: message.content,
            id: message.id
        });
    }
}