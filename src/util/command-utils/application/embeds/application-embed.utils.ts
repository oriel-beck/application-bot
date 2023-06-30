import { EmbedBuilder, type APIEmbedField, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { container } from "@sapphire/framework";
import { ApplicationCustomIDs } from "../../../../constants/custom-ids";
import { ApplicationState, type ApplicationStateKeys } from "../../../../constants/application";
import type { types } from "cassandra-driver";

export async function generateApplicationEmbed(application: types.Row, page = 0, state?: ApplicationState) {
    const user = await container.client.users.fetch(application.user.toString()).catch(() => null);
    const questions = [...application.questions].splice(page * 7, 7);
    const answers = [...(application.answers || [])].splice(page * 7, 7);
    return [
        new EmbedBuilder()
            .setTitle(`Application from ${user ? user.tag : application.user}`)
            .addFields(mapQuestionsAndAnswersToFields(questions, answers, page))
            .setColor(applicaionEmbedColorFromState(state || application.state))
    ];
}

export function generateApplicationComponents(application: types.Row, page = 0, showDecision = true) {
    const buttons = new ActionRowBuilder<ButtonBuilder>();
    buttons.addComponents(new ButtonBuilder()
        .setLabel('Prev')
        .setDisabled(page === 0)
        .setCustomId(`${ApplicationCustomIDs.buttons!.paginate}-${page - 1}-${application.user}`)
        .setStyle(ButtonStyle.Primary));

    if (showDecision) {
        buttons.addComponents(new ButtonBuilder()
            .setLabel('Deny')
            .setCustomId(`${ApplicationCustomIDs.buttons!.denied}-${application.user}`)
            .setStyle(ButtonStyle.Danger));
    }

    buttons.addComponents(new ButtonBuilder()
        .setLabel(`${page + 1}`)
        .setDisabled(true)
        .setCustomId(ApplicationCustomIDs.buttons!.page)
        .setStyle(ButtonStyle.Secondary));

    if (showDecision) {
        buttons.addComponents(new ButtonBuilder()
            .setLabel('Accept')
            .setCustomId(`${ApplicationCustomIDs.buttons!.accepted}-${application.user}`)
            .setStyle(ButtonStyle.Success));
    }

    buttons.addComponents(new ButtonBuilder()
        .setLabel('Next')
        .setDisabled(Math.ceil(application.answers.length / 7) === page + 1)
        .setCustomId(`${ApplicationCustomIDs.buttons!.paginate}-${page + 1}-${application.user}`)
        .setStyle(ButtonStyle.Primary));

    return [buttons];
}

const mapQuestionsAndAnswersToFields = (questions: string[], answers: string[], page: number): APIEmbedField[] => questions.map((q, i) => ({ name: `Q${questionNumber(i, page)}) ${q}`, value: `A${questionNumber(i, page)}) ${answers[i] || 'N/A'}` }));
const questionNumber = (question: number, page: number) => (question + 1) + (7 * page);
function applicaionEmbedColorFromState(state: ApplicationStateKeys) {
    switch (state) {
        case "active":
        case "pending":
            return Colors.Aqua;
        case "denied":
            return Colors.Red;
        case "accepted":
            return Colors.Green;
    }
}