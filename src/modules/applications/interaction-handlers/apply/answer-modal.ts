import { generateApplyComponents, generateApplyEmbed } from "@lib/command-utils/apply/apply.utils.js";
import { applicationExists } from "@lib/util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { ApplyCustomIDs } from "@lib/constants/custom-ids.js";
import type { ModalSubmitInteraction } from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class AnswerModalHandler extends InteractionHandler {
    public async run(interaction: ModalSubmitInteraction) {
        await interaction.deferUpdate();

        const questionNum = Number(interaction.customId.split('-').at(2));
        const answer = interaction.fields.getTextInputValue('answer');

        const app = await this.container.applications.get(interaction.user.id).then((res) => res.first()).catch(() => null);

        if (!applicationExists(app)) {
            return interaction.followUp({
                content: 'The application no longer exist.',
                ephemeral: true
            });
        }

        let update;
        if (!app?.answers || !app.answers[questionNum]) {
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


        const answers = [...(app?.answers || [])];
        answers[questionNum] = answer;

        if ((!app?.answers || !app.answers[questionNum]) && questionNum + 1 !== app?.get('questions').length) {
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