import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { hasRole } from "@lib/precondition-util.js";
import { generateQuestionShowEditModal } from "@lib/command-utils/question/show/question-show.utils.js";
import { QuestionCustomIDs } from "@lib/constants/custom-ids.js";
import type { ButtonInteraction } from "discord.js";
import type { Question } from "@lib/types.js";

const PREFIX = `${QuestionCustomIDs.buttons.edit}:`;

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class EditButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }

        if (!interaction.customId.startsWith(PREFIX)) {
            return;
        }
        const id = interaction.customId.slice(PREFIX.length);

        const question = await this.container.questions.get(id).then((res) => res.at(0)).catch(() => null) as Question;

        if (!question) {
            return interaction.reply({
                content: 'Failed to edit question, this question no longer exist.',
                ephemeral: true
            });
        }

        return interaction.showModal(generateQuestionShowEditModal(question.id, question.question));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(PREFIX) ? this.some() : this.none();
    }
}
