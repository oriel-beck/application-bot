import { EmbedBuilder, type APIEmbedField, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Application } from "../../../../types";
import { container } from "@sapphire/framework";
import { ApplicationCustomIDs } from "../../../../constants/custom-ids";
import type { ApplicationStateKeys } from "../../../../constants/application";

export async function generateEmbed(application: Application, page = 0) {
    const user = await container.client.users.fetch(application.user.toString()).catch(() => null);
    const questions = application.questions.splice(page * 7, page * 7 + 7);
    const answers = application.answers.splice(page * 7, page * 7 + 7);
    return [
        new EmbedBuilder()
            .setTitle(`Application from ${user ? user.tag : application.user}`)
            .addFields(mapQuestionsAndAnswersToFields(questions, answers))
            .setColor(applicaionEmbedColorFromState(application.state))
    ];
}

export function generateComponents(application: Application, page = 0) {
    return [
        new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
            .setLabel('Prev')
            .setDisabled(page === 0)
            .setCustomId(`${ApplicationCustomIDs.buttons!.paginate}-${page - 1}`)
            .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
            .setLabel('Deny')
            .setCustomId(`${ApplicationCustomIDs.buttons!.deny}-${application.user}`)
            .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
            .setLabel(`${page + 1}`)
            .setDisabled(true)
            .setCustomId(ApplicationCustomIDs.buttons!.page)
            .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
            .setLabel('Accept')
            .setCustomId(`${ApplicationCustomIDs.buttons!.accept}-${application.user}`)
            .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
            .setLabel('Next')
            .setDisabled(Math.ceil(application.answers.length / 7) === page + 1)
            .setCustomId(`${ApplicationCustomIDs.buttons!.paginate}-${page + 1}`)
            .setStyle(ButtonStyle.Primary)
        )
    ];
}

const mapQuestionsAndAnswersToFields = (questions: string[], answers: string[]): APIEmbedField[] => questions.map((q, i) => ({ name: `Q) ${q}`, value: `A) ${answers[i]}` }));

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