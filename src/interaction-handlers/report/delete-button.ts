import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { ReportCustomIDs } from "../../constants/custom-ids";
import { isMod } from "../../util/precondition-util";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class ReportModalHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!isMod(interaction.member!)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }

        interaction.deferUpdate();
        return interaction.message.delete().catch(() => null);
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId == ReportCustomIDs.buttons.delete ? this.some() : this.none()
    }
}