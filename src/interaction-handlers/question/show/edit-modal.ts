import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ModalSubmitInteraction } from "discord.js";
import { QuestionCustomIDs } from "../../../constants/custom-ids";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class EditModalHandler extends InteractionHandler {
    public async run(interaction: ModalSubmitInteraction) {
        return interaction;
    }

    public parse(interaction: ModalSubmitInteraction) {
        return interaction.customId.startsWith(QuestionCustomIDs.modals.edit) ? this.some() : this.none()
    }
}