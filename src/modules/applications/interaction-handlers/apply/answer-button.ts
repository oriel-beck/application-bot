import { generateApplyAnswerModal } from "@lib/command-utils/apply/apply.utils.js";
import { isCurrentApplicationMessage } from "@lib/util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { ApplyCustomIDs } from "@lib/constants/custom-ids.js";
import { MessageFlags, type ButtonInteraction } from "discord.js";
import type { Application } from "@lib/types.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class AnswerButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        const parts = interaction.customId.split(':');
        const questionNum = Number(parts.at(-1));

        const application = await this.container.applications.get(interaction.user.id).then((res) => res.at(0)).catch(() => null) as Application;

        if (!application || !isCurrentApplicationMessage(application, interaction.message.id)) {
            return interaction.reply({
                content: 'This application no longer exist.',
                flags: MessageFlags.Ephemeral
            });
        }

        return interaction.showModal(generateApplyAnswerModal(application.questions, application.answers || [], questionNum));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(`${ApplyCustomIDs.buttons.answer}:`) ? this.some() : this.none()
    }
}
