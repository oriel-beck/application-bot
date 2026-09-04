import { hasRole } from '@lib/precondition-util.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework';
import {
  ButtonInteraction,
  Colors,
  DiscordAPIError,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} from 'discord.js';
import { cleanupClosedSupportChannel } from '@lib/bdfd-ai/cleanup-channel.js';
import { ForumCustomIDs } from '@lib/constants/custom-ids.js';
import {
  detectInternationalSupportLanguage,
  formatInternationalResolvedDm,
  getInternationalSupportStrings,
  isInternationalSupportForum
} from '../international-support.i18n.js';

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

      await interaction.message.edit({ components: [] }).catch(() => null);

      if (isInternational && strings) {
        await interaction.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(strings.resolvedTitle)
              .setDescription(strings.resolvedDescription)
              .setFooter({ text: strings.resolvedFooter })
              .setColor(Colors.Green)
          ]
        });
      } else {
        await interaction.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Resolved')
              .setDescription(
                'Your post has been resolved, locked, and archived, if there are additional issues please open a new post.'
              )
              .setFooter({ text: 'Thank you for using BDFD! ❤️' })
              .setColor(Colors.Green)
          ]
        });
      }

      const owner = await interaction.channel.fetchOwner().catch(() => null);

      try {
        await interaction.channel.edit({ locked: true, archived: true });
      } catch (error) {
        if (error instanceof DiscordAPIError && (error.code === 50001 || error.code === 50013)) {
          await interaction
            .followUp({
              content: 'The post was marked as resolved, but I could not lock/archive it due to missing access.',
              flags: MessageFlags.Ephemeral
            })
            .catch(() => null);
        } else {
          throw error;
        }
      }

      const guildName = interaction.guild?.name ?? 'the server';
      const dmContent =
        isInternational && strings
          ? formatInternationalResolvedDm(strings.resolvedDm, guildName, interaction.channel.url)
          : `Your post in ${guildName} was resolved, you can return to read your post at any time in ${interaction.channel.url}.`;

      owner?.user?.send({ content: dmContent }).catch(() => null);

      await cleanupClosedSupportChannel(interaction.channel.id, { deleteTranscript: true });
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
