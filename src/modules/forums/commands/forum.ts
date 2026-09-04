import { cleanupClosedSupportChannel } from '@lib/bdfd-ai/cleanup-channel.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { Colors, EmbedBuilder, MessageFlags, type ThreadChannel } from 'discord.js';
import { bugReportResolvedDm, bugReportResolvedEmbed } from '../bug-report-util.js';
import {
  detectInternationalSupportLanguage,
  formatInternationalResolvedDm,
  getInternationalSupportStrings
} from '../international-support.i18n.js';

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
    const { channels } = this.container.config;

    let resolvedTag: string;
    let closeEmbed: EmbedBuilder;
    let dmContent: (guildName: string) => string;
    let cleanupAi = false;

    if (parentId === channels.support) {
      resolvedTag = this.container.config.support_tags.resolved;
      closeEmbed = new EmbedBuilder()
        .setTitle('Resolved')
        .setDescription(
          'Your post has been resolved, locked, and archived, if there are additional issues please open a new post.'
        )
        .setFooter({ text: 'Thank you for using BDFD! ❤️' })
        .setColor(Colors.Green);
      dmContent = (guildName) =>
        `Your post in ${guildName} was resolved, you can return to read your post at any time in ${channel.url}.`;
      cleanupAi = true;
    } else if (parentId === channels.international_support) {
      resolvedTag = this.container.config.international_support_tags.resolved;
      const strings = getInternationalSupportStrings(detectInternationalSupportLanguage(channel.appliedTags));
      closeEmbed = new EmbedBuilder()
        .setTitle(strings.resolvedTitle)
        .setDescription(strings.resolvedDescription)
        .setFooter({ text: strings.resolvedFooter })
        .setColor(Colors.Green);
      dmContent = (guildName) => formatInternationalResolvedDm(strings.resolvedDm, guildName, channel.url);
      cleanupAi = true;
    } else if (parentId === channels.bug_reports) {
      resolvedTag = this.container.config.bug_report_tags.resolved;
      closeEmbed = bugReportResolvedEmbed();
      dmContent = (guildName) => bugReportResolvedDm(guildName, channel.url);
    } else {
      return interaction.reply({
        content: 'This command can only be used in support, international support, or bug report posts.',
        flags: MessageFlags.Ephemeral
      });
    }

    const tagged = await channel.setAppliedTags([resolvedTag]).catch(() => null);
    if (!tagged) {
      return interaction.reply({
        content: 'Failed to resolve post.',
        flags: MessageFlags.Ephemeral
      });
    }

    const reply = await interaction.reply({
      content: 'Resolving post...',
      flags: MessageFlags.Ephemeral
    });

    await channel.send({ embeds: [closeEmbed] });

    const originalMessage = await this.container.redis.get(channel.id);
    if (originalMessage) {
      await channel.messages.delete(originalMessage).catch(() => null);
    }

    const owner = await channel.fetchOwner().catch(() => null);

    await channel.edit({ locked: true, archived: true });
    await reply.edit({
      content: 'Solved post!'
    });

    const guildName = interaction.guild?.name ?? 'the server';
    owner?.user?.send({ content: dmContent(guildName) }).catch(() => null);

    if (cleanupAi) {
      await cleanupClosedSupportChannel(channel.id, { deleteTranscript: true });
    }
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
