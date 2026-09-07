import { hasRole } from '@lib/precondition-util.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, DiscordAPIError, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { ForumCustomIDs } from '@lib/constants/custom-ids.js';
import {
  detectInternationalSupportLanguage,
  getInternationalSupportStrings,
  isInternationalSupportForum
} from '../international-support.i18n.js';
import { applyForumCloseFlow } from '../post-util.js';

const PREFIX = `${ForumCustomIDs.supportResolve}:`;

@ApplyOptions<InteractionHandlerOptions>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ResolveSupportPostHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    if (interaction.channel?.isThread() && interaction.channel.parent?.isThreadOnly()) {
      const isInternational = isInternationalSupportForum(interaction.channel.parent.id);
      const strings = isInternational
        ? getInternationalSupportStrings(detectInternationalSupportLanguage(interaction.channel.appliedTags))
        : null;

      if (
        !hasRole(interaction.member!, this.container.config.roles.staff) &&
        !hasRole(interaction.member!, this.container.config.roles.trial_support) &&
        interaction.channel.ownerId !== interaction.user.id
      ) {
        return interaction.reply({
          content: strings?.noPermission ?? 'You are missing permissions to use this.',
          flags: MessageFlags.Ephemeral
        });
      }

      const tag = interaction.customId.slice(PREFIX.length);
      const expectedResolved = isInternational
        ? this.container.config.international_support_tags.resolved
        : this.container.config.support_tags.resolved;

      if (tag !== expectedResolved) {
        return interaction.reply({
          content: strings?.internalError ?? 'Internal error, this is not a valid tag for this interaction handler',
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
        await interaction.channel.setAppliedTags([expectedResolved]);
      } catch (error) {
        if (error instanceof DiscordAPIError && (error.code === 50001 || error.code === 50013)) {
          return interaction.followUp({
            content:
              'I cannot access this thread to mark it as resolved. Please check my forum/thread permissions and try again.',
            flags: MessageFlags.Ephemeral
          });
        }

        throw error;
      }

      await applyForumCloseFlow(
        interaction.channel,
        isInternational ? 'international_support' : 'support',
        'resolved',
        localeTags
      );
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
