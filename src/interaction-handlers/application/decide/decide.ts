import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { generateModal } from "../../../util/command-utils/application/modals/utils";
import type { DecisionType } from "../../../util/command-utils/application/modals/types";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DecisionButtonsHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        const split = interaction.customId.split('-')
        const decisionType = split.at(1) as DecisionType;

        const get = await this.container.applications.get(split.at(2)!).catch(() => null);

        if (!get || !get.rowLength || get.first().get('message') != interaction.message.id) {
            return interaction.reply({
                content: 'This application does not exist in the database.',
                ephemeral: true
            })
        }

        return interaction.showModal(generateModal(decisionType, get.first().get('user')))
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith('decide') ? this.some() : this.none()
    }
}