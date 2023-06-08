import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { EmbedBuilder, type ButtonInteraction, Colors } from "discord.js";
import { ReportCustomIDs } from "../../constants/custom-ids";
import { isMod } from "../../util/precondition-util";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class ReportModalHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!isMod(interaction.member!)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }

        const originEmbed = new EmbedBuilder(interaction.message.embeds[0].data);
        originEmbed.setColor(Colors.Green)

        return interaction.update({
            embeds: [originEmbed],
            components: [],
            content: `Resolved by ${interaction.user}.`
        });
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId == ReportCustomIDs.buttons.resolve ? this.some() : this.none()
    }
}