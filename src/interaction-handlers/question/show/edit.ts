import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DecisionButtonsHandler extends InteractionHandler {
    public run(interaction: ButtonInteraction) {
        // TODO
        return interaction;
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith('application-list') ? this.some() : this.none()
    }
}