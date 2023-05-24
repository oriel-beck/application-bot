import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { generateApplicationDecisionModal } from "../../../util/command-utils/application/modals/application-modals.utils";
import { isCurrentApplicationMessage } from "../../../util/util";
import { isMod } from "../../../util/precondition-util";
import { ApplicationCustomIDs } from "../../../constants/custom-ids";
import type { DecisionType } from "../../../util/command-utils/application/modals/application-modals.types";
import type { Application } from "../../../types";
import type { ButtonInteraction } from "discord.js";

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
        const decisionType = split.at(1) as DecisionType;

        const app = await this.container.applications.get(split.at(2)!).then((res) => res.first() as unknown as Application).catch(() => null);

        if (!isCurrentApplicationMessage(app, interaction.message.id)) {
            return interaction.reply({
                content: 'This application does not exist in the database.',
                ephemeral: true
            });
        }

        return interaction.showModal(generateApplicationDecisionModal(decisionType, app!.user.toString()));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(ApplicationCustomIDs.buttons.decide) ? this.some() : this.none()
    }
}