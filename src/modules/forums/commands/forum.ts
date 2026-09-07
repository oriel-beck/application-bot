import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { MessageFlags, type ThreadChannel } from 'discord.js';
import { applyForumCloseFlow, getForumPostKind } from '../post-util.js';

@ApplyOptions<Subcommand.Options>({
  name: 'forum',
  description: 'Manage the forum channels',
  // forumonly && (forumowneronly || staffonly || trailsupportonly)
  preconditions: ['ForumOnly', ['ForumOwnerOnly', 'StaffOnly', 'TrialSupportOnly']],
  subcommands: [
    {
      name: 'remove',
      chatInputRun: 'remove'
    },
    {
      name: 'solve',
      chatInputRun: 'solve'
    }
  ]
})
export class SlashCommand extends Subcommand {
  public async remove(interaction: Subcommand.ChatInputCommandInteraction) {
    if (interaction.channel?.isTextBased() && interaction.channel.isThread()) {
      const success = await interaction.channel.members
        .remove(
          interaction.options.getUser('member', true).id,
          `Removed by ${interaction.user.globalName || interaction.user.username}`
        )
        .catch(() => null);
      if (success)
        return interaction.reply({
          content: `Removed ${interaction.options.getUser('member', true)} from the current post.`,
          flags: MessageFlags.Ephemeral
        });
    }

    return interaction.reply({
      content: `Failed to remove ${interaction.options.getUser('member', true)} from the current post.`,
      flags: MessageFlags.Ephemeral
    });
  }

  public async solve(interaction: Subcommand.ChatInputCommandInteraction) {
    if (!interaction.channel?.isTextBased() || !interaction.channel.isThread()) {
      return interaction.reply({
        content: 'This command can only be used in a forum post.',
        flags: MessageFlags.Ephemeral
      });
    }

    const channel = interaction.channel;
    const parentId = await resolveForumParentId(channel);
    const kind = getForumPostKind(parentId);

    if (!kind) {
      return interaction.reply({
        content: 'This command can only be used in support, international support, or bug report posts.',
        flags: MessageFlags.Ephemeral
      });
    }

    const resolvedTag =
      kind === 'support'
        ? this.container.config.support_tags.resolved
        : kind === 'international_support'
          ? this.container.config.international_support_tags.resolved
          : this.container.config.bug_report_tags.resolved;

    const localeTags = [...channel.appliedTags];
    const tagged = await channel.setAppliedTags([resolvedTag]).catch(() => null);
    if (!tagged) {
      return interaction.reply({
        content: 'Failed to resolve post.',
        flags: MessageFlags.Ephemeral
      });
    }

    await applyForumCloseFlow(channel, kind, 'resolved', localeTags);

    return interaction.reply({
      content: 'Solved post!',
      flags: MessageFlags.Ephemeral
    });
  }

  public registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
          subcommand
            .setName('remove')
            .setDescription('Remove a member from the current post')
            .addUserOption((option) =>
              option.setName('member').setDescription('The member to remove').setRequired(true)
            )
        )
        .addSubcommand((subcommand) => subcommand.setName('solve').setDescription('Solve and lock the current post'))
    );
  }
}

async function resolveForumParentId(channel: ThreadChannel): Promise<string | null> {
  const cached = channel.parentId ?? channel.parent?.id;
  if (cached) return cached;

  const fetched = await channel.fetch().catch(() => null);
  return fetched?.parentId ?? fetched?.parent?.id ?? null;
}
