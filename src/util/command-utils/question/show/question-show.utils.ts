import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { QuestionCustomIDs } from "../../../../constants/custom-ids";
import type { Question } from "../../../../types";

export function generateEmbed(question: Question) {
    return [
        new EmbedBuilder()
            .setTitle(`Question ${question.id}`)
            .setDescription(question.question)
            .setColor(Colors.Blurple)
    ]
}

export function generateComponents(question: Question) {
    return [
        new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(`${QuestionCustomIDs.buttons!.delete}-${question.id}`),
                new ButtonBuilder()
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(`${QuestionCustomIDs.buttons!.edit}-${question.id}`)
            )
    ]
}

export function generateModal(id: string, question: string) {
    return new ModalBuilder()
    .setCustomId(`${QuestionCustomIDs.modals!.edit}-${id}`)
    .setTitle('Editing question')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('question')
                        .setLabel('Edit question')
                        .setValue(question)
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                )
        )
}