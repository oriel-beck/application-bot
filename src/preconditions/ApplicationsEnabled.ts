import { Precondition } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

export class ModOnlyPrecondition extends Precondition {
    #message = 'Applications are currently disabled.';

    public override async chatInputRun(interaction: CommandInteraction) {
        return this.checkApplicationsEnabled(interaction.guild!.id)
    }

    private checkApplicationsEnabled(guild: string) {
        return this.container.settings.get(guild).then((result) => result.first().get('enabled') ? this.ok() : this.error({ message: this.#message }))
    }
}

declare module '@sapphire/framework' {
	interface Preconditions {
		ApplicationEnabled: never;
	}
}