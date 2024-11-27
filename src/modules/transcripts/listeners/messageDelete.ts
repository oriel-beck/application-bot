import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { ChannelType, Message, PartialMessage } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.MessageDelete,
    name: 'transceriptsMessageDelete'
})
export class MessageDeleteListener extends Listener<typeof Events.MessageDelete> {
    async run(message: Message<boolean> | PartialMessage) {
        if (message.channel.type !== ChannelType.GuildText || message.channel.parentId !== this.container.config.categories.tickets) return;
        await this.container.transcripts.deleteMessage(message.channel.id, message.id);
    }
}