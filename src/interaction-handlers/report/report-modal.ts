import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ModalSubmitInteraction } from "discord.js";
import { ReportCustomIDs } from "../../constants/custom-ids";
import { generateReportComponents, generateReportEmbed } from "../../util/command-utils/report/report.util";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ReportModalHandler extends InteractionHandler {
    public async run(interaction: ModalSubmitInteraction) {
        const split = interaction.customId.split('-')
        const reason = interaction.fields.getTextInputValue('reason');

        interaction.reply({
            content: 'Sent the report to the mod team.',
            ephemeral: true
        });

        const reportChannel = this.container.client.channels.cache.get(this.container.config.channels.report);

        if (reportChannel?.isTextBased()) {
            reportChannel.send({
                embeds: generateReportEmbed(interaction, await this.container.client.users.fetch(split.at(2)!), reason, split.at(3)),
                components: generateReportComponents()
            });
        }
    }

    public parse(interaction: ModalSubmitInteraction) {
        return interaction.customId.startsWith(ReportCustomIDs.modals.report) ? this.some() : this.none()
    }
}