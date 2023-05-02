import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";

export function generateEmbed(question: string, answer = 'N/A', questionNum = 1) {
    return [
        new EmbedBuilder()
            .setTitle(`Question ${questionNum}`)
            .setFields([
                {
                    name: `Q) ${question}`,
                    value: `A) ${answer}`
                }
            ])
            .setColor(Colors.Blurple)
            .setFooter({
                text: 'Remember, this application expires after 40m.'
            })
    ]
}

export function generateComponents(answers: string[], currentAnswer = 0): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('application-cancel'),
            new ButtonBuilder()
                .setLabel('Answer')
                .setStyle(ButtonStyle.Success)
                .setCustomId(`application-answer-${currentAnswer}`),
            new ButtonBuilder()
                .setLabel('Done')
                .setStyle(answers && answers.length === 25 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setCustomId('application-done')
                .setDisabled((!answers || answers.length < 25)));

    if (!answers) return [row1];

    const row2 = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('application-question-select')
                .setPlaceholder('Select a question to answer')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(Array.from({ length: answers.length === 25 ? 25 : answers.length + 1 }, (_, i) => ({
                    label: `Question ${i + 1}`,
                    description: `Jump to question ${i + 1}`,
                    value: `${i}`
                }))));

    return [row1, row2]
}