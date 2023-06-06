import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { generateApplyComponents, generateApplyEmbed } from "../../util/command-utils/apply/apply.utils";
import { isApplicationExist } from "../../util/util";
import { ApplyCustomIDs } from "../../constants/custom-ids";
import type { ModalSubmitInteraction } from "discord.js";
import type { Application } from "../../types";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class AnswerModalHandler extends InteractionHandler {
    public async run(interaction: ModalSubmitInteraction) {
        await interaction.deferUpdate();

        const questionNum = Number(interaction.customId.split('-').at(2));
        const answer = interaction.fields.getTextInputValue('answer');

        const app = await this.container.applications.get(interaction.user.id).then((res) => res.first() as unknown as Application).catch(() => null);

        if (!isApplicationExist(app)) {
            return interaction.followUp({
                content: 'The application no longer exist.',
                ephemeral: true
            });
        }

        const answers = [...(app?.answers || [])];
        answers[questionNum] = answer;

        let update;
        if (questionNum + 1 === answers.length) {
            update = await this.container.applications.addAnswer(interaction.user.id, answer).catch(console.log);
        } else {
            update = await this.container.applications.editAnswer(interaction.user.id, questionNum, answer).catch(console.log);
        }

        if (!update) {
            return interaction.followUp({
                content: 'Failed to update the application.',
                ephemeral: true
            });
        }

        if (questionNum + 1 === answers.length) {
            // edit to the next question and answer
            return interaction.message?.edit({
                embeds: generateApplyEmbed(app!.questions[questionNum + 1], answers[questionNum + 1], questionNum + 1),
                components: generateApplyComponents(answers, questionNum + 1)
            });
        } else {
            // edit to the current question and answer
            return interaction.message?.edit({
                embeds: generateApplyEmbed(app!.questions[questionNum], answer, questionNum),
                components: generateApplyComponents(answers, questionNum)
            });
        }
    }

    public parse(interaction: ModalSubmitInteraction) {
        return interaction.customId.startsWith(ApplyCustomIDs.modals.answer) ? this.some() : this.none();
    }
}