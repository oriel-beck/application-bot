import {
  generateApplicationComponents,
  generateApplicationEmbed
} from '@lib/command-utils/application/embeds/application-embed.utils.js';
import { isCurrentApplicationMessage } from '@lib/util.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyCustomIDs } from '@lib/constants/custom-ids.js';
import { ChannelType, Colors, type ButtonInteraction, MessageFlags } from 'discord.js';
import type { Application } from '@lib/types.js';
import { ApplicationState } from '@lib/constants/application.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class DoneButtonHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const getApp = (await this.container.applications
      .get(interaction.user.id)
      .then((res) => res.at(0))
      .catch(() => null)) as Application;

    if (!isCurrentApplicationMessage(getApp, interaction.message.id)) {
      return interaction.editReply({
        content: 'This application does not exist.'
      });
    }

    const pendingChannel = this.container.client.channels.cache.get(this.container.config.channels.pending);
    if (pendingChannel?.type !== ChannelType.GuildText) {
      return interaction.editReply({
        content: 'Failed to find pending application channel.'
      });
    }

    const pendingApp = await pendingChannel.send({
      content: `Application from ${interaction.user}`,
      embeds: await generateApplicationEmbed(getApp!),
      components: generateApplicationComponents(getApp!)
    });

    if (!pendingApp) {
      return interaction.editReply({
        content: 'Failed to send pending application for review.'
      });
    }

    await this.container.applications.update(interaction.user.id, 'message', pendingApp.id).catch(() => null);
    await this.container.applications.update(interaction.user.id, 'state', ApplicationState.pending).catch(() => null);

    interaction.editReply({
      content: 'Successfully sent application for review.'
    });

    return interaction.message.edit({
      content: '',
      embeds: [
        {
          title: 'Application has been sent.',
          color: Colors.Green
        }
      ],
      components: []
    });
  }

  public parse(interaction: ButtonInteraction) {
    return interaction.customId === ApplyCustomIDs.buttons.done ? this.some() : this.none();
  }
}
