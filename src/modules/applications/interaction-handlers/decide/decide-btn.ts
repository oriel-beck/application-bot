import { generateModal } from "@lib/command-utils/application/modals/application-modals.utils.js";
import { ApplicationState } from "@lib/constants/application.js";
import { ApplicationCustomIDs } from "@lib/constants/custom-ids.js";
import { hasRole } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerOptions, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";

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

        const split = interaction.customId.split('-');
        const decisionType = split.at(1) as ApplicationState;

        const app = await this.container.applications.get(split.at(2)!).then((res) => res.first()).catch(() => null);

        if (!app) {
            return interaction.reply({
                content: 'This application does not exist in the database.',
                ephemeral: true
            });
        }

        return interaction.showModal(generateModal(decisionType, app!.user.toString()));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(ApplicationCustomIDs.buttons.decide) ? this.some() : this.none()
    }
}