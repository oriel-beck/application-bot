import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ModalSubmitInteraction } from "discord.js";
import { ComponentType } from "discord.js";
import type { Application } from "../../types";
import { generateEmbed } from "../../util/command-utils/apply/utils";
import { isApplicationExist } from "../../util/util";
import { ApplyCustomIDs } from "../../constants/custom-ids";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class AnswerModalHandler extends InteractionHandler {
    public async run(interaction: ModalSubmitInteraction) {
        await interaction.deferUpdate();

        const questionNum = Number(interaction.customId.split('-').at(2));
        const field = interaction.fields.getField('answer')
        const answer = field.type === ComponentType.TextInput ? field.value : '';

        const app = await this.container.applications.get(interaction.user.id).then((res) => res.first() as unknown as Application).catch(() => null);

        if (!isApplicationExist(app)) {
            return interaction.followUp({
                content: 'The application no longer exist.',
                ephemeral: true
            });
        }

        const update = await this.container.applications.addAnswer(interaction.user.id, questionNum, answer).catch(() => null);

        if (!update) {
            return interaction.followUp({
                content: 'Failed to update the application.',
                ephemeral: true
            });
        }


        if (questionNum === app!.answers.length) {
            // edit to the next question and answer
            return interaction.message?.edit({
                embeds: generateEmbed(app!.questions[questionNum + 1], app!.answers[questionNum + 1], questionNum + 1),
            });
        } else {
            // edit to the current question and answer
            return interaction.message?.edit({
                embeds: generateEmbed(app!.questions[questionNum], answer, questionNum),
            });
        }
    }

    public parse(interaction: ModalSubmitInteraction) {
        return interaction.customId.startsWith(ApplyCustomIDs.modals.answer) ? this.some() : this.none()
    }
}