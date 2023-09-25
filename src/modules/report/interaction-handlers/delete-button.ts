import { ReportCustomIDs } from "@lib/constants/custom-ids.js";
import { isMod } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";

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