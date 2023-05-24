import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { generateApplyAnswerModal } from "../../util/command-utils/apply/apply.utils";
import { isCurrentApplicationMessage } from "../../util/util";
import { ApplyCustomIDs } from "../../constants/custom-ids";
import type { ButtonInteraction } from "discord.js";
import type { Application } from "../../types";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class AnswerButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        const questionNum = Number(interaction.customId.split('-').at(2))!;

        const application = await this.container.applications.get(interaction.user.id).then((res) => res.first() as unknown as Application).catch(() => null);

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