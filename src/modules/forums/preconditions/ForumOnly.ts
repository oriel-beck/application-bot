import { Precondition } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

export class ForumOnlyPrecondition extends Precondition {
    #message = 'You can not use this command outside a forum post.';

    public chatInputRun(interaction: CommandInteraction) {
        return interaction.channel?.isThreadOnly() ? this.ok() : this.error({ message: this.#message });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        ForumOnly: never;
    }
}