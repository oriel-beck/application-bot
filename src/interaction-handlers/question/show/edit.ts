import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { generateModal } from "../../../util/command-utils/question/show/question-show.utils";
import { isMod } from "../../../util/precondition-util";
import { QuestionCustomIDs } from "../../../constants/custom-ids";
import type { ButtonInteraction } from "discord.js";
import type { Question } from "../../../types";

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

        const question = await this.container.questions.get(interaction.customId.split('-').at(2)!).then((res) => res.first() as unknown as Question).catch(() => null);

        if (!question) {
            return interaction.reply({
                content: 'Failed to edit question, this question no longer exist.',
                ephemeral: true
            });
        }

        return interaction.showModal(generateModal(question.id, question.question));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(QuestionCustomIDs.buttons.edit) ? this.some() : this.none()
    }
}