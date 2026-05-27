import { generateModal } from "@lib/command-utils/application/modals/application-modals.utils.js";
import { ApplicationState } from "@lib/constants/application.js";
import { hasRole } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import type { Application } from "@lib/types.js";

const DEC_BTN_PREFIX = 'app:dec:btn:';

@ApplyOptions<InteractionHandlerOptions>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DecisionButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }

        const parts = interaction.customId.split(':');
        const decisionType = parts[3] as ApplicationState;
        const userId = parts[4];

        const app = await this.container.applications.get(userId!).then((res) => res.at(0)).catch(() => null) as Application;

        if (!app) {
            return interaction.reply({
                content: 'This application does not exist in the database.',
                ephemeral: true
            });
        }

        return interaction.showModal(generateModal(decisionType, app!.user.toString()));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(DEC_BTN_PREFIX) ? this.some() : this.none()
    }
}
