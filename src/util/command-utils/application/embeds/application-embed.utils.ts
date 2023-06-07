import { EmbedBuilder, type APIEmbedField, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { container } from "@sapphire/framework";
import { ApplicationCustomIDs } from "../../../../constants/custom-ids";
import { ApplicationState, type ApplicationStateKeys } from "../../../../constants/application";
import type { Application } from "../../../../types";
import type { types } from "cassandra-driver";

export async function generateApplicationEmbed(application: Application | types.Row, page = 0, state?: ApplicationState) {
    const user = await container.client.users.fetch(application.user.toString()).catch(() => null);
    const questions = [...application.questions].splice(page * 7, 7);
    const answers = [...(application.answers || [])].splice(page * 7, 7);
    return [
        new EmbedBuilder()
            .setTitle(`Application from ${user ? user.tag : application.user}`)
            .addFields(mapQuestionsAndAnswersToFields(questions, answers))
            .setColor(applicaionEmbedColorFromState(state || application.state))
    ];
}

export function generateApplicationComponents(application: Application | types.Row, page = 0, decided = false) {
    const buttons = new ActionRowBuilder<ButtonBuilder>();
    buttons.addComponents(new ButtonBuilder()
        .setLabel('Prev')
        .setDisabled(page === 0)
        .setCustomId(`${ApplicationCustomIDs.buttons!.paginate}-${page - 1}-${application.user}`)
        .setStyle(ButtonStyle.Primary));

    if (!decided) {
        buttons.addComponents(new ButtonBuilder()
            .setLabel('Deny')
            .setCustomId(`${ApplicationCustomIDs.buttons!.deny}-${application.user}`)
            .setStyle(ButtonStyle.Danger));
    }

    buttons.addComponents(new ButtonBuilder()
        .setLabel(`${page + 1}`)
        .setDisabled(true)
        .setCustomId(ApplicationCustomIDs.buttons!.page)
        .setStyle(ButtonStyle.Secondary));

    if (!decided) {
        buttons.addComponents(new ButtonBuilder()
            .setLabel('Accept')
            .setCustomId(`${ApplicationCustomIDs.buttons!.accept}-${application.user}`)
            .setStyle(ButtonStyle.Success));
    }

    buttons.addComponents(new ButtonBuilder()
        .setLabel('Next')
        .setDisabled(Math.ceil(application.answers.length / 7) === page + 1)
        .setCustomId(`${ApplicationCustomIDs.buttons!.paginate}-${page + 1}-${application.user}`)
        .setStyle(ButtonStyle.Primary));

    return [buttons];
}

const mapQuestionsAndAnswersToFields = (questions: string[], answers: string[]): APIEmbedField[] => questions.map((q, i) => ({ name: `Q) ${q}`, value: `A) ${answers[i] || 'N/A'}` }));

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