import { generateApplyAnswerModal } from "@lib/command-utils/apply/apply.utils.js";
import { isCurrentApplicationMessage } from "@lib/util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { ApplyCustomIDs } from "@lib/constants/custom-ids.js";
import type { ButtonInteraction } from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class AnswerButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        const questionNum = Number(interaction.customId.split('-').at(2))!;

        const application = await this.container.applications.get(interaction.user.id).then((res) => res.first()).catch(() => null);

        if (!isCurrentApplicationMessage(application, interaction.message.id)) {
            return interaction.reply({
                content: 'This application no longer exist.',
                ephemeral: true
            });
        }
        
        return interaction.showModal(generateApplyAnswerModal(application!.questions, application!.answers || [], questionNum));
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(ApplyCustomIDs.buttons.answer) ? this.some() : this.none()
    }
}