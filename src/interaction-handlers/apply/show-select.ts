import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { generateComponents, generateEmbed } from "../../util/command-utils/apply/apply.utils";
import { isApplicationExist } from "../../util/util";
import { ApplyCustomIDs } from "../../constants/custom-ids";
import type { StringSelectMenuInteraction } from "discord.js";
import type { Application } from "../../types";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class SelectSelectHandler extends InteractionHandler {
    public async run(interaction: StringSelectMenuInteraction) {
        const questionNum = Number(interaction.values[0]);
        const app = await this.container.applications.get(interaction.user.id).then((res) => res.first() as unknown as Application).catch(() => null);

        if (!isApplicationExist(app)) {
            return interaction.reply({
                content: 'This application is no longer active.',
                ephemeral: true
            });
        }

        return interaction.update({
            embeds: generateEmbed(app!.questions[questionNum], app!.answers[questionNum], questionNum),
            components: generateComponents(app!.answers, questionNum)
        });
    }

    public parse(interaction: StringSelectMenuInteraction) {
        return interaction.customId === ApplyCustomIDs.selects.edit ? this.some() : this.none();
    }
}