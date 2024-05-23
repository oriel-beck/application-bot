import { generateStickyMessageComponents, generateStickyMessageEmbed } from "@lib/command-utils/sticky-message/resend.js";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { Message } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.MessageCreate,
})
export class CommandDeniedListener extends Listener<typeof Events.MessageCreate> {
    async run(message: Message<boolean>) {
        if (message.channel.id !== this.container.config.channels.share_your_bot) return;
        const oldMessage = await this.container.redis.get("share-your-bot-sticky-message");
        if (oldMessage) {
            await message.channel.messages.delete(oldMessage).catch(() => null);
        }
        await message.channel.send({
            embeds: generateStickyMessageEmbed(),
            components: generateStickyMessageComponents()
        })
    }

}