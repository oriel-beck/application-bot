import { cleanupClosedSupportChannel } from "@lib/bdfd-ai/cleanup-channel.js";
import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { Colors, EmbedBuilder, MessageFlags } from "discord.js";
import { detectInternationalSupportLanguage,
    formatInternationalResolvedDm,
    getInternationalSupportStrings,
    isInternationalSupportForum,
} from "../international-support.i18n.js";

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
        {
            name: "solve",
            chatInputRun: "solve"
        }
    ]
})
export class SlashCommand extends Subcommand {
    public async remove(interaction: Subcommand.ChatInputCommandInteraction) {
        if (interaction.channel?.isTextBased() && interaction.channel.isThread()) {
            const success = await interaction.channel.members.remove(interaction.options.getUser("member", true).id, `Removed by ${interaction.user.globalName || interaction.user.username}`).catch(() => null);
            if (success) return interaction.reply({
                content: `Removed ${interaction.options.getUser("member", true)} from the current post.`,
                flags: MessageFlags.Ephemeral
            });
        }

        return interaction.reply({
            content: `Failed to remove ${interaction.options.getUser("member", true)} from the current post.`,
            flags: MessageFlags.Ephemeral
        });
    }

    public async solve(interaction: Subcommand.ChatInputCommandInteraction) {
        if (interaction.channel?.isTextBased() && interaction.channel.isThread()) {
            const isInternational = isInternationalSupportForum(interaction.channel.parentId ?? undefined);
            const resolvedTag = isInternational
                ? this.container.config.international_support_tags.resolved
                : this.container.config.support_tags.resolved;
            const strings = isInternational
                ? getInternationalSupportStrings(detectInternationalSupportLanguage(interaction.channel.appliedTags))
                : null;

            const success = interaction.channel.setAppliedTags([resolvedTag]).catch(() => null);
            if (!success) return interaction.reply({
                content: "Failed to resolve post.",
                flags: MessageFlags.Ephemeral
            });

            const reply = await interaction.reply({
                content: "Resolving post...",
                flags: MessageFlags.Ephemeral
            });

            await interaction.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(strings?.resolvedTitle ?? "Resolved")
                        .setDescription(strings?.resolvedDescription ?? "Your post has been resolved, locked, and archived, if there are additional issues please open a new post.")
                        .setFooter({ text: strings?.resolvedFooter ?? "Thank you for using BDFD! ❤️" })
                        .setColor(Colors.Green)
                ]
            });

            const originalMessage = await this.container.redis.get(interaction.channel.id);
            if (originalMessage) {
                await interaction.channel.messages.delete(originalMessage).catch(() => null);
            }

            const owner = await interaction.channel.fetchOwner().catch(() => null);

            await interaction.channel.edit({ locked: true, archived: true });
            reply.edit({
                content: "Solved post!"
            });

            const guildName = interaction.guild?.name ?? "the server";
            const dmContent = strings
                ? formatInternationalResolvedDm(strings.resolvedDm, guildName, interaction.channel.url)
                : `Your post in ${guildName} was resolved, you can return to read your post at any time in ${interaction.channel.url}.`;

            owner?.user?.send({ content: dmContent }).catch(() => null);

            await cleanupClosedSupportChannel(interaction.channel.id, { deleteTranscript: true });
            return;
        }

        return await interaction.reply({
            content: "Resolved the post.",
            flags: MessageFlags.Ephemeral
        });
    }

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
                .addSubcommand((subcommand) => subcommand
                    .setName("solve")
                    .setDescription("Solve and lock the current post"))
        );
    }
}