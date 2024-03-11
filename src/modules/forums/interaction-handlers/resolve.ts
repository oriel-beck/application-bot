import { hasRole } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from "@sapphire/framework";
import { ButtonInteraction, Colors, EmbedBuilder } from "discord.js";

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
            if (tag !== this.container.config.support_tags.resolved) return interaction.reply({
                content: "Internal error, this is not a valid tag for this interaction handler",
                ephemeral: true
            });

            await interaction.deferUpdate();
            await interaction.message.delete();
            await interaction.channel.send({
                embeds: [
                    new EmbedBuilder()
                    .setTitle("Resolved")
                    .setDescription("Your post has been resolved and locked, if there are additional issues please open a new post.")
                    .setFooter({
                        text: "Thank you for using BDFD! ❤️"
                    })
                    .setColor(Colors.Green)
                ]
            });
            await interaction.channel.setLocked(true);
            return await interaction.channel.setAppliedTags([this.container.config.support_tags.resolved]);
        } else {
            return interaction.reply({
                content: "This cannot be used outside of a forum post.",
                ephemeral: true
            })
        }
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith('supportpost') ? this.some() : this.none();
    }
}