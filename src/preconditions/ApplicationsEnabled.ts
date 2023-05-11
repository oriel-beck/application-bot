import { Precondition } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

export class ModOnlyPrecondition extends Precondition {
    #message = 'Applications are currently disabled.';

    public chatInputRun(interaction: CommandInteraction) {
        return this.checkApplicationsEnabled(interaction.guild!.id);
    }

    private async checkApplicationsEnabled(guild: string) {
        const result = await this.container.settings.get(guild);
        return result.first()?.get('enabled') ? this.ok() : this.error({ message: this.#message });
    }
}

declare module '@sapphire/framework' {
	interface Preconditions {
		ApplicationsEnabled: never;
	}
}