import { EmbedBuilder, type APIEmbedField, Colors } from "discord.js";
import type { Application, ApplicationState } from "../../../../types";
import { container } from "@sapphire/framework";

export async function generateApplicationEmbed(application: Application, page = 0) {
    const user = await container.client.users.fetch(application.user).catch(() => null);
    const questions = application.questions.splice(page * 7, page * 7 + 7);
    const answers = application.answers.splice(page * 7, page * 7 + 7);
    return [
        new EmbedBuilder()
            .setTitle(`Application from ${user ? user.tag : application.user}`)
            .addFields(mapQuestionsAndAnswersToFields(questions, answers))
            .setColor(applicaionEmbedColorFromState(application.state))
    ]
}

const mapQuestionsAndAnswersToFields = (questions: string[], answers: string[]): APIEmbedField[] => questions.map((q, i) => ({ name: `Q) ${q}`, value: `A) ${answers[i]}` }));

function applicaionEmbedColorFromState(state: ApplicationState) {
    switch (state) {
        case "active":
        case "pending":
            return Colors.Aqua

        case "denied":
            return Colors.Red
        case "accepted":
            return Colors.Green
    }
}