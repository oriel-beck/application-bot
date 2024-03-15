import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { ActionRowBuilder, AnyThreadChannel, ButtonBuilder, EmbedBuilder, TextBasedChannel } from "discord.js";
import { generatePostHelpEmbed } from "../util.js";

@ApplyOptions<Listener.Options>({
    event: Events.ThreadCreate,
})
export class CommandDeniedListener extends Listener<typeof Events.ThreadCreate> {
    async run(thread: AnyThreadChannel<true>, newlyCreated: boolean) {
        if (thread.parent?.id === this.container.config.channels.support && newlyCreated) {
            const { row, embed } = generatePostHelpEmbed(thread.appliedTags);
            // If the author of the thread sends an attachment the bot cannot reply until the attachment is fully sent by still gets the event, so it will retry in 5 seconds (5 attempts)
            await retryMessage(thread, embed, row);
        }
    }
}

async function retryMessage(channel: TextBasedChannel, embed: EmbedBuilder, row: ActionRowBuilder<ButtonBuilder>) {
    let attempts = 0;
    await retry();
    async function retry() {
        await channel.send({
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