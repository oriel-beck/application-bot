import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";

@ApplyOptions<Subcommand.Options>({
    name: "forum",
    description: "Manage the forum channels",
    // forumonly && (forumowneronly || staffonly || trailsupportonly)
    preconditions: ['ForumOnly', ['ForumOwnerOnly', 'StaffOnly', 'TrialSupportOnly']],
    subcommands: [
        {
            name: "remove",
            chatInputRun: "remove"
        },
        // {
        //     name: "solve",
        //     chatInputRun: "solve"
        // }
    ]
})
export class SlashCommand extends Subcommand {
    public async remove(interaction: Subcommand.ChatInputCommandInteraction) {
        if (interaction.channel?.isTextBased() && interaction.channel.isThread()) {
            const success = await interaction.channel.members.remove(interaction.options.getUser("member", true).id, `Removed by ${interaction.user.globalName || interaction.user.username}`).catch(() => null);
            if (success) return interaction.reply({
                content: `Removed ${interaction.options.getUser("member", true)} from the current post.`,
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `Failed to remove ${interaction.options.getUser("member", true)} from the current post.`,
            ephemeral: true
        });
    }

    // For now button only as it will take space in the DB to save messages per channel.
    // public async solve(interaction: Subcommand.ChatInputCommandInteraction) {
    //     if (interaction.channel?.isTextBased() && interaction.channel.isThread()) {
    //         const success = interaction.channel.setAppliedTags([this.container.config.support_tags.resolved]).catch(() => null);
    //         if (!success) return interaction.reply({
    //             content: "Failed to resolve post.",
    //             ephemeral: true
    //         });
    //         await interaction.channel.setLocked(true);
    //     }

    //     return await interaction.reply({
    //         content: "Resolved the post.",
    //         ephemeral: true
    //     });
    //     // TODO: edit/send something that marks the post as resolved.
    // }

    public registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDMPermission(false)
                .addSubcommand((subcommand) => subcommand
                    .setName("remove")
                    .setDescription("Remove a member from the current post")
                    .addUserOption((option) => option
                        .setName("member")
                        .setDescription("The member to remove")
                        .setRequired(true)))
                // .addSubcommand((subcommand) => subcommand
                //     .setName("solve")
                //     .setDescription("Solve and lock the current post"))
        );
    }
}