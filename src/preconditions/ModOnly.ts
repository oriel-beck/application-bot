import { Precondition } from "@sapphire/framework";
import { isMod } from "../util/precondition-util";
import type { APIInteractionGuildMember, CommandInteraction, GuildMember } from "discord.js";

export class ModOnlyPrecondition extends Precondition {
    #message = 'You are missing permissions to use this command.';

    public chatInputRun(interaction: CommandInteraction) {
        return this.checkMod(interaction.member!)
    }

    private checkMod(member: GuildMember | APIInteractionGuildMember) {
        return isMod(member) ? this.ok() : this.error({
            message: this.#message
        });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        ModOnly: never;
    }
}