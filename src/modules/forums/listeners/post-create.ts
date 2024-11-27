import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { ActionRowBuilder, AnyThreadChannel, ButtonBuilder, EmbedBuilder } from "discord.js";
import { generatePostHelpEmbed } from "../util.js";

@ApplyOptions<Listener.Options>({
    event: Events.ThreadCreate,
    name: 'supportPostCreate'
})
export class PostCreateListener extends Listener<typeof Events.ThreadCreate> {
    async run(thread: AnyThreadChannel, newlyCreated: boolean) {
        if (thread.parent?.id === this.container.config.channels.support && newlyCreated) {
            const { row, embed } = generatePostHelpEmbed(thread.appliedTags);
            // If the author of the thread sends an attachment the bot cannot reply until the attachment is fully sent by still gets the event, so it will retry in 5 seconds (5 attempts)
            const message = await retryMessage(thread, embed, row);
            if (message) {
                // sets the message for the channel for 7d
                await this.container.redis.setex(message.channel.id, message.id, 604800);
            }
        }
    }
}

async function retryMessage(channel: AnyThreadChannel, embed: EmbedBuilder, row: ActionRowBuilder<ButtonBuilder>) {
    let attempts = 0;
    return await retry();
    async function retry() {
        return await channel.send({
            embeds: [embed],
            components: [row]
        }).catch(() => {
            if (attempts === 5) return;
            attempts++;
            setTimeout(() => {
                retry()
            }, 5000);
        })
    }

}