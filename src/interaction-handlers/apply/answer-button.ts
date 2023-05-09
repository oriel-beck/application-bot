import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";
import { generateModal } from "../../util/command-utils/apply/utils";
import { isCurrentApplicationMessage } from "../../util/util";
import type { Application } from "../../types";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class DecisionButtonsHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        const questionNum = Number(interaction.customId.split('-').at(2))!;

        const application = await this.container.applications.get(interaction.user.id).then((res) => res.first() as unknown as Application).catch(() => null);

        if (!isCurrentApplicationMessage(application, interaction.message.id)) {
            return interaction.reply({
                content: 'This application no longer exist.',
                ephemeral: true
            });
        }
        
        return interaction.showModal(generateModal(application!.questions[questionNum]!, questionNum, application!.questions[questionNum]!));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith('application-answer') ? this.some() : this.none()
    }
}