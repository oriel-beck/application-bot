import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { ChannelType, type ModalSubmitInteraction } from "discord.js";
import { generateReportEmbed, generateReportComponents } from "@lib/command-utils/report/report.util.js";
import { ReportCustomIDs } from "@lib/constants/custom-ids.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ReportModalHandler extends InteractionHandler {
    public async run(interaction: ModalSubmitInteraction) {
        const parts = interaction.customId.split(':');
        const userId = parts[2];
        const messagePart = parts[3];
        const message = messagePart === 'none' || messagePart === '' ? undefined : messagePart;
        const reason = interaction.fields.getTextInputValue('reason');

        const reportChannel = this.container.client.channels.cache.get(this.container.config.channels.report);

        if (!reportChannel || reportChannel.type !== ChannelType.GuildText) {
            await interaction.reply({
                content:
                    'The report channel is missing or not a text channel, so your report could not be delivered. Please contact the staff team directly.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        let reportedUser;
        try {
            reportedUser = await this.container.client.users.fetch(userId!);
        } catch {
            await interaction.editReply({
                content: 'Could not load the reported user. Your report was not sent.'
            });
            return;
        }

        try {
            await reportChannel.send({
                embeds: generateReportEmbed(interaction, reportedUser, reason, message),
                components: generateReportComponents()
            });
        } catch {
            await interaction.editReply({
                content:
                    'We could not notify the moderators in the report channel. If this is urgent, please contact a moderator directly.'
            });
            return;
        }

        await interaction.editReply({
            content: 'Sent the report to the mod team.'
        });
    }

    public parse(interaction: ModalSubmitInteraction) {
        return interaction.customId.startsWith(`${ReportCustomIDs.modals.report}:`) ? this.some() : this.none()
    }
}
