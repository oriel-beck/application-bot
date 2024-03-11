import { hasRole } from "@lib/precondition-util.js";
import { Precondition } from "@sapphire/framework";
import type { APIInteractionGuildMember, CommandInteraction, GuildMember } from "discord.js";

export class RequiredRoleOnlyPrecondition extends Precondition {
    #message = `You are missing the role <@&${this.container.config.roles.required_role}> which is required to use this.`;

    public chatInputRun(interaction: CommandInteraction) {
        return this.checkRequiredRole(interaction.member!)
    }

    private checkRequiredRole(member: GuildMember | APIInteractionGuildMember) {
        return hasRole(member, this.container.config.roles.required_role) ? this.ok() : this.error({
            message: this.#message
        });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        RequiredRole: never;
    }
}