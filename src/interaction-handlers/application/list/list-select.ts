import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { generateApplicationComponents, generateApplicationEmbed } from "../../../util/command-utils/application/embeds/application-embed.utils";
import { isApplicationExist } from "../../../util/util";
import { isMod } from "../../../util/precondition-util";
import { ApplicationCustomIDs } from "../../../constants/custom-ids";
import type { StringSelectMenuInteraction } from "discord.js";
import type { Application } from "../../../types";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class ListSelectHandler extends InteractionHandler {
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
            embeds: await generateApplicationEmbed(app!),
            components: generateApplicationComponents(app!)
        });
    }

    public parse(interaction: StringSelectMenuInteraction) {
        return interaction.customId.startsWith(ApplicationCustomIDs.selects.list) ? this.some() : this.none()
    }
}