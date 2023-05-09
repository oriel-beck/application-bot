import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { generateModal } from "../../../util/command-utils/question/show/util";
import type { Question } from "../../../types";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DecisionButtonsHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {

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
        return interaction.customId.startsWith('application-list') ? this.some() : this.none()
    }
}