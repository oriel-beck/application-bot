import { Precondition } from "@sapphire/framework";
import type { CommandInteraction } from "discord.js";

export class ModOnlyPrecondition extends Precondition {
    #message = 'You are missing permissions to use this command.';

    public override async chatInputRun(interaction: CommandInteraction) {
        return this.checkOwner(interaction.user.id)
    }

    private checkOwner(user: string) {
        return user === process.env.OWNER ? this.ok() : this.error({
            message: this.#message
        });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        OwnerOnly: never;
    }
}