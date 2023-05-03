import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { generateModal } from "../../util/command-utils/apply/modal/util";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DecisionButtonsHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        const questionNum = Number(interaction.customId.split('-').at(2))!;

        const application = await this.container.applications.get(interaction.user.id).catch(() => null);

        if (!application || !application.rowLength || application.first().get('message') != interaction.message.id) {
            return interaction.reply({
                content: 'This application no longer exist.',
                ephemeral: true
            });
        }
        
        return interaction.showModal(generateModal(application.first().get('questions')[questionNum]!, questionNum, application.first().get('questions')[questionNum]!));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith('application-answer') ? this.some() : this.none()
    }
}