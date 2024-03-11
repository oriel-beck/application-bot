import { hasRole } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from "@sapphire/framework";
import { ButtonInteraction } from "discord.js";
import { generatePostHelpEmbed } from "../util.js";

@ApplyOptions<InteractionHandlerOptions>({
    interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ToggleTagHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (interaction.channel?.isThread() && interaction.channel.parent?.isThreadOnly()) {
            if (!hasRole(interaction.member!, this.container.config.roles.staff) && !hasRole(interaction.member!, this.container.config.roles.trial_support) && interaction.channel.ownerId !== interaction.user.id) return interaction.reply({
                content: "You are missing permissions to use this.",
                ephemeral: true
            });

            const tag = interaction.customId.split("-").at(1)!;
            let appliedTags = interaction.channel.appliedTags;

            if (appliedTags.length === 1 && appliedTags[0] === tag) return interaction.reply({
                content: "You cannot have less than 1 tag applied at a time.",
                ephemeral: true
            });

            if (appliedTags.includes(tag)) {
                appliedTags = appliedTags.filter(t => t !== tag);
                await interaction.channel.setAppliedTags(appliedTags);
            } else {
                appliedTags.push(tag)
                await interaction.channel.setAppliedTags(appliedTags);
            }

            const { row, embed } = generatePostHelpEmbed(appliedTags);
            return await interaction.update({
                embeds: [embed],
                components: [row]
            });
        } else {
            return interaction.reply({
                content: "This cannot be used outside of a forum post.",
                ephemeral: true
            })
        }
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith('toggletag') ? this.some() : this.none();
    }
}