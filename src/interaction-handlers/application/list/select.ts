import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { StringSelectMenuInteraction } from "discord.js";
import { generateComponents, generateEmbed } from "../../../util/command-utils/application/embeds/utils";
import type { Application } from "../../../types";
import { isApplicationExist } from "../../../util/util";
import { isMod } from "../../../preconditions/util";


@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class DecisionButtonsHandler extends InteractionHandler {
    public async run(interaction: StringSelectMenuInteraction) {
        if (!isMod(interaction.member!)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }
        
        const user = interaction.values[0]!;

        const app = await this.container.applications.get(user).then((res) => res.first() as unknown as Application).catch(() => null);

        if (!isApplicationExist(app)) {
            return interaction.reply({
                content: 'This user does not have an application.',
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: await generateEmbed(app!),
            components: generateComponents(app!)
        });
    }

    public parse(interaction: StringSelectMenuInteraction) {
        return interaction.customId.startsWith('application-list') ? this.some() : this.none()
    }
}