import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ModalSubmitInteraction } from "discord.js";
import { ComponentType } from "discord.js";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class DecisionButtonsHandler extends InteractionHandler {
    public async run(interaction: ModalSubmitInteraction) {
        const questionNum = Number(interaction.customId.split('-').at(2));
        const field = interaction.fields.getField('answer')
        const answer = field.type === ComponentType.TextInput ? field.value : '';

        const get = await this.container.applications.get(interaction.user.id).catch(() => null);

        if(!get || !get.rowLength) {
            return interaction.reply({
                content: 'The application no longer exist.',
                ephemeral: true
            });
        }

        const update = await this.container.applications.addAnswer(interaction.user.id, questionNum, answer).catch(() => null);

        if (!update || !update.rowLength) {
            return interaction.reply({
                content: 'Failed to update the application.',
                ephemeral: true
            });
        }

        await interaction.deferUpdate();

        if (questionNum === get.first().get('answers').length) {
            // TODO: edit to the next question and answer
        } else {
            // TODO: edit to the current question and answer
        }
        return
    }

    public parse(interaction: ModalSubmitInteraction) {
        return interaction.customId.startsWith('application-list') ? this.some() : this.none()
    }
}