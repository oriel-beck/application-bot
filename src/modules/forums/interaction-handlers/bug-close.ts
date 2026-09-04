import { hasRole } from '@lib/precondition-util.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, DiscordAPIError, PermissionFlagsBits, MessageFlags, type EmbedBuilder } from 'discord.js';
import { ForumCustomIDs } from '@lib/constants/custom-ids.js';
import {
  bugReportNotABugDm,
  bugReportNotABugEmbed,
  bugReportResolvedDm,
  bugReportResolvedEmbed,
  isBugReportsForum
} from '../bug-report-util.js';

const PREFIX = `${ForumCustomIDs.bugClose}:`;

@ApplyOptions<InteractionHandlerOptions>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class BugReportCloseHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    if (interaction.channel?.isThread() && interaction.channel.parent?.isThreadOnly()) {
      if (!isBugReportsForum(interaction.channel.parent.id)) {
        return interaction.reply({
          content: 'This cannot be used outside of a bug report post.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (
        !hasRole(interaction.member!, this.container.config.roles.staff) &&
        !hasRole(interaction.member!, this.container.config.roles.trial_support) &&
        interaction.channel.ownerId !== interaction.user.id
      ) {
        return interaction.reply({
          content: 'You are missing permissions to use this.',
          flags: MessageFlags.Ephemeral
        });
      }

      const tag = interaction.customId.slice(PREFIX.length);
      const { resolved, not_a_bug } = this.container.config.bug_report_tags;
      const isResolved = tag === resolved;
      const isNotABug = tag === not_a_bug;

      if (!isResolved && !isNotABug) {
        return interaction.reply({
          content: 'Internal error, this is not a valid tag for this interaction handler',
          flags: MessageFlags.Ephemeral
        });
      }

      const botMember = interaction.guild?.members.me;
      const channelPermissions = botMember ? interaction.channel.permissionsFor(botMember) : null;

      if (!channelPermissions?.has(PermissionFlagsBits.ManageThreads)) {
        return interaction.reply({
          content: 'I do not have permission to manage this thread. Please grant me `Manage Threads` and try again.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferUpdate();

      try {
        await interaction.channel.setAppliedTags([tag]);
      } catch (error) {
        if (error instanceof DiscordAPIError && (error.code === 50001 || error.code === 50013)) {
          return interaction.followUp({
            content: 'I cannot access this thread to close it. Please check my forum/thread permissions and try again.',
            flags: MessageFlags.Ephemeral
          });
        }

        throw error;
      }

      await interaction.message.edit({ components: [] }).catch(() => null);

      const closeEmbed: EmbedBuilder = isResolved ? bugReportResolvedEmbed() : bugReportNotABugEmbed();
      await interaction.channel.send({ embeds: [closeEmbed] });

      const owner = await interaction.channel.fetchOwner().catch(() => null);

      try {
        await interaction.channel.edit({ locked: true, archived: true });
      } catch (error) {
        if (error instanceof DiscordAPIError && (error.code === 50001 || error.code === 50013)) {
          await interaction
            .followUp({
              content: 'The post was closed, but I could not lock/archive it due to missing access.',
              flags: MessageFlags.Ephemeral
            })
            .catch(() => null);
        } else {
          throw error;
        }
      }

      const guildName = interaction.guild?.name ?? 'the server';
      const dmContent = isResolved
        ? bugReportResolvedDm(guildName, interaction.channel.url)
        : bugReportNotABugDm(guildName, interaction.channel.url);

      owner?.user?.send({ content: dmContent }).catch(() => null);
      return;
    }

    return interaction.reply({
      content: 'This cannot be used outside of a forum post.',
      flags: MessageFlags.Ephemeral
    });
  }

  public parse(interaction: ButtonInteraction) {
    return interaction.customId.startsWith(PREFIX) ? this.some() : this.none();
  }
}
