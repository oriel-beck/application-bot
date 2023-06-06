import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { ApplyCustomIDs } from "../../../constants/custom-ids";

export function generateApplyEmbed(question: string, answer = 'N/A', questionNum = 0) {
    return [
        new EmbedBuilder()
            .setTitle(`Question ${questionNum + 1}`)
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

export function generateApplyComponents(answers: string[], currentAnswer = 0): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
                .setCustomId(ApplyCustomIDs.buttons!.cancel),
            new ButtonBuilder()
                .setLabel('Answer')
                .setStyle(ButtonStyle.Success)
                .setCustomId(`${ApplyCustomIDs.buttons!.answer}-${currentAnswer}`),
            new ButtonBuilder()
                .setLabel('Done')
                .setStyle(answers && answers.length === 25 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setCustomId(ApplyCustomIDs.buttons!.done)
                .setDisabled((!answers || answers.length < 25)));

    const row2 = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(ApplyCustomIDs.selects!.edit)
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

export function generateApplyAnswerModal(questions: string[], answers: string[], questionNum: number) {
    const textInput = new TextInputBuilder()
        .setCustomId('answer')
        .setLabel(questions[questionNum].length > 45 ? questions[questionNum].substring(0, 42) + '...' : questions[questionNum])
        .setMaxLength(400)
        .setRequired(true)
        .setStyle(TextInputStyle.Paragraph);

    if (answers[questionNum]) {
        textInput.setValue(answers[questionNum]);
    }

    return new ModalBuilder()
        .setTitle(`Question ${questionNum + 1}`)
        .setCustomId(`${ApplyCustomIDs.modals!.answer}-${questionNum}`)
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .addComponents(textInput)
        );
}