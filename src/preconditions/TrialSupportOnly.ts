import { hasRole } from "@lib/precondition-util.js";
import { Precondition } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

export class ForumOnlyPrecondition extends Precondition {
    #message = 'You are missing permissions to use this.';

    public chatInputRun(interaction: CommandInteraction) {
        return hasRole(interaction.member!, this.container.config.roles.trial_support) ? this.ok() : this.error({ message: this.#message });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        TrialSupportOnly: never;
    }
}