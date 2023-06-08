import { Precondition } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

export class ModOnlyPrecondition extends Precondition {
    #message = 'You already have an application in progress.';

    public chatInputRun(interaction: CommandInteraction) {
        return this.checkApplicationInProgress(interaction.user.id)
    }

    private async checkApplicationInProgress(user: string) {
        const result = await this.container.applications.get(user).catch(() => null);
        return result?.first() ? this.error({ message: this.#message }) : this.ok();
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        ApplicationInProgress: never;
    }
}