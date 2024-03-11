import { Precondition } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

export class ForumOnlyPrecondition extends Precondition {
    #message = 'You do not own this post.';

    public chatInputRun(interaction: CommandInteraction) {
        if (interaction.channel?.isThread()) {
            return interaction.channel.ownerId === interaction.user.id ? this.ok() : this.error({ message: this.#message })
        }
        return this.error({ message: this.#message })
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        ForumOwnerOnly: never;
    }
}