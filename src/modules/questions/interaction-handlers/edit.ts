import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { isMod } from "@lib/precondition-util.js";
import { generateQuestionShowEditModal } from "@lib/command-utils/question/show/question-show.utils.js";
import { QuestionCustomIDs } from "@lib/constants/custom-ids.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class EditButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!isMod(interaction.member!)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }

        const question = await this.container.questions.get(interaction.customId.split('-').at(2)!).then((res) => res.first()).catch(() => null);

        if (!question) {
            return interaction.reply({
                content: 'Failed to edit question, this question no longer exist.',
                ephemeral: true
            });
        }

        return interaction.showModal(generateQuestionShowEditModal(question.id, question.question));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(QuestionCustomIDs.buttons.edit) ? this.some() : this.none()
    }
}