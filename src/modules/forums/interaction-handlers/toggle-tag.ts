import { hasRole } from '@lib/precondition-util.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { ForumCustomIDs } from '@lib/constants/custom-ids.js';

const PREFIX = `${ForumCustomIDs.toggleTag}:`;

@ApplyOptions<InteractionHandlerOptions>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ToggleTagHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    if (interaction.channel?.isThread() && interaction.channel.parent?.isThreadOnly()) {
      if (
        !hasRole(interaction.member!, this.container.config.roles.staff) &&
        !hasRole(interaction.member!, this.container.config.roles.trial_support) &&
        interaction.channel.ownerId !== interaction.user.id
      )
        return interaction.reply({
          content: 'You are missing permissions to use this.',
          flags: MessageFlags.Ephemeral
        });

      const tag = interaction.customId.slice(PREFIX.length);
      const appliedTags = [...interaction.channel.appliedTags];

      if (appliedTags.length === 1 && appliedTags[0] === tag)
        return interaction.reply({
          content: 'You cannot have less than 1 tag applied at a time.',
          flags: MessageFlags.Ephemeral
        });

      await interaction.deferUpdate();

      const nextTags = appliedTags.includes(tag) ? appliedTags.filter((t) => t !== tag) : [...appliedTags, tag];
      await interaction.channel.setAppliedTags(nextTags);
      return;
    } else {
      return interaction.reply({
        content: 'This cannot be used outside of a forum post.',
        flags: MessageFlags.Ephemeral
      });
    }
  }

  public parse(interaction: ButtonInteraction) {
    return interaction.customId.startsWith(PREFIX) ? this.some() : this.none();
  }
}
