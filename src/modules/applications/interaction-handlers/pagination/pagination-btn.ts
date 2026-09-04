import {
  generateApplicationComponents,
  generateApplicationEmbed
} from '@lib/command-utils/application/embeds/application-embed.utils.js';
import { ApplicationState } from '@lib/constants/application.js';
import { ApplicationCustomIDs } from '@lib/constants/custom-ids.js';
import { hasRole } from '@lib/precondition-util.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class PaginationButtonHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
      return interaction.reply({
        content: 'You are missing permissions to use this.',
        flags: MessageFlags.Ephemeral
      });
    }

    const parts = interaction.customId.split(':');
    const page = Number(parts[3]);
    const user = parts[4];

    const app = await this.container.applications
      .get(user!)
      .then((res) => res.at(0))
      .catch(() => null);

    if (!app) {
      return interaction.reply({
        content: 'This application does not exist in the database.',
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.update({
      embeds: await generateApplicationEmbed(app, page),
      components: generateApplicationComponents(app, page, app.state === ApplicationState.pending)
    });
  }

  public parse(interaction: ButtonInteraction) {
    return interaction.customId.startsWith(`${ApplicationCustomIDs.buttons.paginate}:`) ? this.some() : this.none();
  }
}
