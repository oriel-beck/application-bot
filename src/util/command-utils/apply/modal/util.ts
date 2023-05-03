import { ActionRowBuilder, TextInputBuilder } from "@discordjs/builders";
import { ModalBuilder, TextInputStyle } from "discord.js";

export function generateModal(question: string, questionNum: number, answer = '') {
    return new ModalBuilder()
    .setTitle(`Question ${questionNum + 1}`)
    .setCustomId(`application-answer-${questionNum}`)
    .addComponents(
        new ActionRowBuilder<TextInputBuilder>()
        .addComponents(
            new TextInputBuilder()
            .setCustomId('answer')
            .setLabel(question.length > 45 ? question.substring(0,42) + '...' : question)
            .setMaxLength(400)
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph)
            .setValue(answer)
        )
    )
}