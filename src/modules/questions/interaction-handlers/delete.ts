import { QuestionCustomIDs } from "@lib/constants/custom-ids.js";
import { hasRole } from "@lib/precondition-util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DeleteButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }
        
        const question = interaction.customId.split('-').at(2);

        const deleted = await this.container.questions.delete(question!).catch(() => null);

        if (!deleted || !deleted.rowLength) {
            return interaction.reply({
                content: 'Failed to delete the question.',
                ephemeral: true
            });
        }

        await interaction.deferUpdate();

        return interaction.update({
            embeds: [{
                description: `Deleted question \`${question}\`.`,
            }],
            components: []
        });
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(QuestionCustomIDs.buttons.delete) ? this.some() : this.none()
    }
}