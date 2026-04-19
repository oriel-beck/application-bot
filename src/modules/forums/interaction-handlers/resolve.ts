import { hasRole } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from "@sapphire/framework";
import { ButtonInteraction, Colors, EmbedBuilder } from "discord.js";
import { ForumCustomIDs } from "@lib/constants/custom-ids.js";

const PREFIX = `${ForumCustomIDs.supportResolve}:`;

@ApplyOptions<InteractionHandlerOptions>({
    interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ResolveSupportPostHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (interaction.channel?.isThread() && interaction.channel.parent?.isThreadOnly()) {
            if (!hasRole(interaction.member!, this.container.config.roles.staff) && !hasRole(interaction.member!, this.container.config.roles.trial_support) && interaction.channel.ownerId !== interaction.user.id) return interaction.reply({
                content: "You are missing permissions to use this.",
                ephemeral: true
            });

            const tag = interaction.customId.slice(PREFIX.length);
            if (tag !== this.container.config.support_tags.resolved) return interaction.reply({
                content: "Internal error, this is not a valid tag for this interaction handler",
                ephemeral: true
            });

            await interaction.deferUpdate();
            await interaction.message.delete();
            await interaction.channel.setAppliedTags([this.container.config.support_tags.resolved]);
            await interaction.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Resolved")
                        .setDescription("Your post has been resolved, locked, and archived, if there are additional issues please open a new post.")
                        .setFooter({
                            text: "Thank you for using BDFD! ❤️"
                        })
                        .setColor(Colors.Green)
                ]
            });
            const owner = await interaction.channel.fetchOwner().catch(() => null);
            await interaction.channel.edit({ locked: true, archived: true });
            owner?.user?.send({
                content: `Your post in ${interaction.guild?.name} was resolved, you can return to read your post at any time in ${interaction.channel.url}.`
            }).catch(() => null);
            return;
        } else {
            return interaction.reply({
                content: "This cannot be used outside of a forum post.",
                ephemeral: true
            })
        }
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(PREFIX) ? this.some() : this.none();
    }
}
