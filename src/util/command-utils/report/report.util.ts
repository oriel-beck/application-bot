import { EmbedBuilder, type CommandInteraction, type User, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction, Colors } from "discord.js";
import { ReportCustomIDs } from "../../../constants/custom-ids";

export function generateReportEmbed(interaction: CommandInteraction | ModalSubmitInteraction, user: User, reason: string, message?: string) {
    return [
        new EmbedBuilder()
            .setTitle(`New report from ${interaction.user.tag}`)
            .setDescription(`${message ? `[Jump to message]${`https://discord.com/channels/${interaction.guild?.id}/${interaction.channel?.id}/${message}`}` : `[Jump to channel](${interaction.channel?.url})`}`)
            .setColor(Colors.Red)
            .addFields([
                {
                    name: 'User',
                    value: user.toString()
                },
                {
                    name: 'Reason',
                    value: reason
                }
            ])
    ];
}

export function generateReportComponents() {
    return [
        new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(ReportCustomIDs.buttons.resolve)
                    .setLabel('Resolve')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(ReportCustomIDs.buttons.delete)
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
            )
    ];
}

export function generateReportModal(user: string, message = '') {
    return new ModalBuilder()
        .setCustomId(`${ReportCustomIDs.modals.report}-${user}-${message}`)
        .setTitle('New Report')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('reason')
                        .setLabel('Provide a reason to report')
                        .setRequired(true)
                        .setStyle(TextInputStyle.Paragraph)
                )
        );
}