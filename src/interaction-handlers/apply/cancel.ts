
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { Colors, type ButtonInteraction } from "discord.js";
import { isApplicationExist } from "../../util/util";
import type { Application } from "../../types";
import { ApplyCustomIDs } from "../../constants/custom-ids";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class CancelButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        await interaction.deferReply({ ephemeral: true });
        
        const deleted = await this.container.applications.delete(interaction.user.id).then((res) => res.first() as unknown as Application).catch(() => null);

        if (!isApplicationExist(deleted)) {
            return interaction.editReply('Failed to delete application.');
        }

        interaction.editReply('Cancelled application process.');
        return interaction.message.edit({
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