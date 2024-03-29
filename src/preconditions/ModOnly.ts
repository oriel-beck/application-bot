import { hasRole } from "@lib/precondition-util.js";
import { Precondition } from "@sapphire/framework";
import type { APIInteractionGuildMember, CommandInteraction, GuildMember } from "discord.js";

export class ModOnlyPrecondition extends Precondition {
    #message = 'You are missing permissions to use this.';

    public chatInputRun(interaction: CommandInteraction) {
        return this.checkMod(interaction.member!)
    }

    private checkMod(member: GuildMember | APIInteractionGuildMember) {
        return hasRole(member, this.container.config.roles.mod) ? this.ok() : this.error({
            message: this.#message
        });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        ModOnly: never;
    }
}