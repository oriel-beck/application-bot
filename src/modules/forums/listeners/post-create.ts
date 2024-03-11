import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { AnyThreadChannel } from "discord.js";
import { generatePostHelpEmbed } from "../util.js";

@ApplyOptions<Listener.Options>({
    event: Events.ThreadCreate,
})
export class CommandDeniedListener extends Listener<typeof Events.ThreadCreate> {
    async run(thread: AnyThreadChannel<true>, newlyCreated: boolean) {
        if (!thread.parent?.isThreadOnly() && thread.parent?.id === this.container.config.channels.support || !newlyCreated) return;
        const { row, embed } = generatePostHelpEmbed(thread.appliedTags);
        await thread.send({
            embeds: [embed],
            components: [row]
        }).catch(() => null);
    }
}