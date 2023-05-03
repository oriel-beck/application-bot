import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from "discord.js";
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
            .addComponents([
                new ButtonBuilder()
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId(`question-delete-${question.id}`),
                new ButtonBuilder()
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId(`question-edit-${question.id}`)
            ])
    ]
}