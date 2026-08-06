import { cleanupClosedSupportChannel } from "@lib/bdfd-ai/cleanup-channel.js";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { AttachmentBuilder, ChannelType, DMChannel, NonThreadGuildBasedChannel } from "discord.js";

@ApplyOptions<Listener.Options>({
    event: Events.ChannelDelete,
    name: 'transcriptsChannelDelete'
})
export class ChannelDeleteListener extends Listener<typeof Events.ChannelDelete> {
    async run(channel: DMChannel | NonThreadGuildBasedChannel) {
        if (channel.type !== ChannelType.GuildText || channel.parentId != this.container.config.categories.tickets) return;

        const transcript = await this.container.transcripts.get(channel.id, true);
        let sent = false;

        if (transcript) {
            const users = new Map<string, string>();
            const author = await this.container.client.users.fetch(transcript.transcript.author.toString()).then((u) => {
                users.set(u.id, u.displayName);
                return u;
            }).catch(() => null);

            if (author) {
                let text = `Transcript of ${channel.name}\nTicket author: ${author.displayName || "UNKNOWN"}`;
                for (const message of transcript.messages) {
                    const user = users.get(message.user.toString()) || await this.container.client.users.fetch(message.user.toString()).then((u) => {
                        users.set(u.id, u.displayName);
                        return u.displayName;
                    }).catch(() => "UNKNOWN");
                    text += `\n\n${user}: ${message.message}`;
                }

                const attachment = new AttachmentBuilder(Buffer.from(text), { name: `${channel.name}.txt` });
                sent = !!(await author.send({
                    content: "Here is your ticket transcript, thank you for choosing BDFD ❤️",
                    files: [attachment]
                }).catch((err) => console.error("Failed to DM transcript", err)));
            }
        }

        // AI always cleared; keep transcript rows if DM failed so they can be recovered
        await cleanupClosedSupportChannel(channel.id, { deleteTranscript: sent });
    }
}
