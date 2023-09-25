import { generateApplyComponents, generateApplyEmbed } from "@lib/command-utils/apply/apply.utils.js";
import { ApplyCustomIDs } from "@lib/constants/custom-ids.js";
import { applicationExists } from "@lib/util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { StringSelectMenuInteraction } from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class SelectSelectHandler extends InteractionHandler {
    public async run(interaction: StringSelectMenuInteraction) {
        const questionNum = Number(interaction.values[0]);
        const app = await this.container.applications.get(interaction.user.id).then((res) => res.first()).catch(() => null);

        if (!applicationExists(app)) {
            return interaction.reply({
                content: 'This application is no longer active.',
                ephemeral: true
            });
        }


        return interaction.update({
            embeds: generateApplyEmbed(app!.questions[questionNum], app!.answers[questionNum], questionNum),
            components: generateApplyComponents(app!.answers, questionNum)
        });
    }

    public parse(interaction: StringSelectMenuInteraction) {
        return interaction.customId === ApplyCustomIDs.selects.edit ? this.some() : this.none();
    }
}