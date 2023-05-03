import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { StringSelectMenuInteraction } from "discord.js";
import { generateComponents, generateEmbed } from "../../../util/command-utils/application/embeds/utils";
import type { Application } from "../../../types";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class DecisionButtonsHandler extends InteractionHandler {
    public async run(interaction: StringSelectMenuInteraction) {
        const user = interaction.values[0]!;

        const get = await this.container.applications.get(user).catch(() => null);

        if (!get || !get.rowLength) {
            return interaction.reply({
                content: 'This user does not have an application.',
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: await generateEmbed(get.first() as unknown as Application),
            components: generateComponents(get.first() as unknown as Application)
        });
    }

    public parse(interaction: StringSelectMenuInteraction) {
        return interaction.customId.startsWith('application-list') ? this.some() : this.none()
    }
}