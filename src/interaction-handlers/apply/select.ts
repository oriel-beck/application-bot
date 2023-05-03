import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { StringSelectMenuInteraction } from "discord.js";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class DecisionButtonsHandler extends InteractionHandler {
    public run(interaction: StringSelectMenuInteraction) {
        // TODO
        return interaction;
    }

    public parse(interaction: StringSelectMenuInteraction) {
        return interaction.customId.startsWith('application-list') ? this.some() : this.none()
    }
}