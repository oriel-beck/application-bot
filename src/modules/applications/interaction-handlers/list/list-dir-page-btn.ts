import {
  generateApplicationListComponents,
  generateApplicationListEmbed
} from '@lib/command-utils/application/list/application-list.utils.js';
import { ApplicationCustomIDs } from '@lib/constants/custom-ids.js';
import { ApplicationState, type ApplicationStateKeys } from '@lib/constants/application.js';
import { hasRole } from '@lib/precondition-util.js';
import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, type ButtonInteraction } from 'discord.js';

function isApplicationListState(s: string): s is ApplicationStateKeys {
  return Object.prototype.hasOwnProperty.call(ApplicationState, s);
}

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button
})
export class ApplicationListDirPageHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
      return interaction.reply({
        content: 'You are missing permissions to use this.',
        flags: MessageFlags.Ephemeral
      });
    }

    const raw = interaction.customId;
    const prefix = `${ApplicationCustomIDs.buttons.listDir}:`;
    if (!raw.startsWith(prefix)) {
      return;
    }
    const rest = raw.slice(prefix.length);
    const lastColon = rest.lastIndexOf(':');
    if (lastColon <= 0) {
      return;
    }
    const state = rest.slice(0, lastColon) as ApplicationStateKeys;
    const pageToken = rest.slice(lastColon + 1);
    if (pageToken === 'noop') {
      return;
    }

    const pageIndex = Number(pageToken);
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || !isApplicationListState(state)) {
      return interaction.reply({
        content: 'Invalid list navigation.',
        flags: MessageFlags.Ephemeral
      });
    }

    const allApps = await this.container.applications.getAll(state).catch(() => null);
    if (!allApps?.length) {
      return interaction.update({
        content: 'No applications in this state (or failed to load).',
        embeds: [],
        components: []
      });
    }

    const totalCount = allApps.length;
    const perPage = 100;
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
    const safePage = Math.min(pageIndex, totalPages - 1);

    return interaction.update({
      embeds: generateApplicationListEmbed(totalCount, state, {
        pageIndex: safePage,
        perPage,
        totalPages
      }),
      components: generateApplicationListComponents(allApps, state, safePage, totalCount)
    });
  }

  public parse(interaction: ButtonInteraction) {
    const id = interaction.customId;
    if (!id.startsWith(`${ApplicationCustomIDs.buttons.listDir}:`)) {
      return this.none();
    }
    if (id.endsWith(':noop')) {
      return this.none();
    }
    return this.some();
  }
}
