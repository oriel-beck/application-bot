import { Precondition } from "@sapphire/framework";
import type { APIInteractionGuildMember, CommandInteraction, GuildMember } from "discord.js";

export class ModOnlyPrecondition extends Precondition {
    #message = 'You are missing permissions to use this command.';

    public override async chatInputRun(interaction: CommandInteraction) {
        return this.checkMod(interaction.member!)
    }

    private checkMod(member: GuildMember | APIInteractionGuildMember) {
        if (Array.isArray(member.roles)) {
            return member.roles.includes(this.container.config.roles.mod) ? this.ok() : this.error({
                message: this.#message
            });
        } else {
            return member.roles.cache.has(this.container.config.roles.mod) ? this.ok() : this.error({
                message: this.#message
            });
        }
    }
}

declare module '@sapphire/framework' {
	interface Preconditions {
		ModOnly: never;
	}
}