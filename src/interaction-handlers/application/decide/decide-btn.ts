import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { generateModal } from "../../../util/command-utils/application/modals/application-modals.utils";
import { isMod } from "../../../util/precondition-util";
import { ApplicationCustomIDs } from "../../../constants/custom-ids";
import type { ButtonInteraction } from "discord.js";
import type { ApplicationState } from "../../../constants/application";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DecisionButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!isMod(interaction.member!)) {
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