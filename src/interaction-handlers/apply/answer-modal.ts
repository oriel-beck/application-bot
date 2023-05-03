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

        const update = await this.container.applications.addAnswer(interaction.user.id, questionNum, answer).catch(() => null);

        if (!update || !update.rowLength) {
            return interaction.reply({
                content: 'Failed to update the application.',
                ephemeral: true
            });
        }

        return await interaction.deferUpdate();
        // TODO: edit the original embed to add the answer or jump 1 question forward in the case of a new answer
        // interaction.message?.edit({
        //     embeds: generateEmbed()
        // })
    }

    public parse(interaction: ModalSubmitInteraction) {
        return interaction.customId.startsWith('application-list') ? this.some() : this.none()
    }
}