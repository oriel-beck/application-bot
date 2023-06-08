import { Precondition } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

export class BlacklistedPrecondition extends Precondition {
    #message = 'You are blacklisted from applying.';

    public chatInputRun(interaction: CommandInteraction) {
        return this.getBlacklist(interaction.user.id);
    }

    private async getBlacklist(user: string) {
        const result = await this.container.blacklists.get(user).catch(() => null);
        return result?.first() ? this.error({ message: this.#message }) : this.ok();
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        Blacklisted: never;
    }
}