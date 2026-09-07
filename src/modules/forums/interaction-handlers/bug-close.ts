import { hasRole } from '@lib/precondition-util.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, DiscordAPIError, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { ForumCustomIDs } from '@lib/constants/custom-ids.js';
import { isBugReportsForum } from '../bug-report-util.js';
import { applyForumCloseFlow } from '../post-util.js';

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

      const localeTags = [...interaction.channel.appliedTags];

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

      await applyForumCloseFlow(interaction.channel, 'bug_reports', isResolved ? 'resolved' : 'not_a_bug', localeTags);
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
