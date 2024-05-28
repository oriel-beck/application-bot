import { generateStickyMessageComponents, generateStickyMessageEmbed } from "@lib/command-utils/sticky-message/resend.js";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import type { Message } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.MessageCreate,
})
export class CommandDeniedListener extends Listener<typeof Events.MessageCreate> {
    async run(message: Message<boolean>) {
        if (message.channel.id !== this.container.config.channels.share_your_bot || message.author.bot) return;

        const cooldownSeconds = await this.container.redis.ttl(`share-your-bot-cooldown-${message.author.id}`);
        if (cooldownSeconds > 0) {
            setTimeout(async () => {
                const msg = await message.fetch(true);
                if (msg) {
                    await msg.delete().catch(() => null);
                    const content = `You are under cooldown, your ad was deleted. You can send a new ad <t:${Date.now() + cooldownSeconds}:R>`;
                    const dm = await message.author.send({ content: `${message.author}\n${content}` }).catch(() => null);
                    if (!dm) {
                        const res = await message.channel.send({ content }).catch(() => null);
                        setTimeout(() => {
                            res?.delete().catch(() => null);
                        }, 5000);
                    }
                }
            }, 3000);
            return;
        }

        const oldMessage = await this.container.redis.get("share-your-bot-sticky-message");
        if (oldMessage) {
            await message.channel.messages.delete(oldMessage).catch(() => null);
        }

        await message.channel.send({
            embeds: generateStickyMessageEmbed(),
            components: generateStickyMessageComponents()
        });

        // since the message may be deleted by carl-bot/maste-bot automod, check if it exists in 10s, and if it does set the cooldown
        setTimeout(async () => {
            const msg = await message.fetch(true);
            // 86400 - 1d
            if (msg) await this.container.redis.setex(`share-your-bot-cooldown-${message.author.id}`, 86400, 1);
        }, 3000);
    }

}