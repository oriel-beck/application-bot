import { Precondition } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

export class ModOnlyPrecondition extends Precondition {
    #message = 'You already have an application in progress.';

    public override async chatInputRun(interaction: CommandInteraction) {
        return this.checkApplicationInProgress(interaction.user.id)
    }

    private checkApplicationInProgress(user: string) {
        return this.container.applications.get(user).then((result) => result.rowLength ? this.ok() : this.error({ message: this.#message }))
    }
}

declare module '@sapphire/framework' {
	interface Preconditions {
		ApplicationInProgress: never;
	}
}