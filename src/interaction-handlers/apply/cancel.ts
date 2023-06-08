
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { Colors, type ButtonInteraction } from "discord.js";
import { ApplyCustomIDs } from "../../constants/custom-ids";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class CancelButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const deleted = await this.container.applications.delete(interaction.user.id).catch(() => null);

        if (!deleted) {
            return interaction.editReply('Failed to cancel application.');
        }

        interaction.editReply('Cancelled application process.');
        return interaction.message.edit({
            content: '',
            embeds: [
                {
                    title: 'Application cancelled.',
                    color: Colors.Red
                }
            ],
            components: []
        });
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId === ApplyCustomIDs.buttons.cancel ? this.some() : this.none()
    }
}