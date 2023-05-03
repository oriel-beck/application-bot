import { EmbedBuilder, type APIEmbedField, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Application, ApplicationState } from "../../../../types";
import { container } from "@sapphire/framework";

export async function generateEmbed(application: Application, page = 0) {
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

export function generateComponents(application: Application, page = 0) {
    return [
        new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
            .setLabel('Prev')
            .setDisabled(page === 0)
            .setCustomId(`paginate-${page - 1}`)
            .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
            .setLabel('Deny')
            .setCustomId(`decide-deny-${application.user}`)
            .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
            .setLabel(`${page + 1}`)
            .setDisabled(true)
            .setCustomId(`page_num`)
            .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
            .setLabel('Accept')
            .setCustomId(`decide-accept-${application.user}`)
            .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
            .setLabel('Next')
            .setDisabled(Math.ceil(application.answers.length / 7) === page + 1)
            .setCustomId(`paginate-${page + 1}`)
            .setStyle(ButtonStyle.Primary)
        )
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