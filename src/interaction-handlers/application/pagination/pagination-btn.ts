import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { isMod } from "../../../util/precondition-util";
import { ApplicationCustomIDs } from "../../../constants/custom-ids";
import type { ButtonInteraction } from "discord.js";
import { generateApplicationComponents, generateApplicationEmbed } from "../../../util/command-utils/application/embeds/application-embed.utils";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class PaginationButtonHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        if (!isMod(interaction.member!)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }

        const split = interaction.customId.split('-');
        const page = Number(split.at(1));
        const user = split.at(2);

        const app = await this.container.applications.get(user!).then((res) => res.first()).catch(() => null);

        if (!app) {
            return interaction.reply({
                content: 'This application does not exist in the database.',
                ephemeral: true
            });
        }

        return interaction.update({
            embeds: await generateApplicationEmbed(app!, page),
            components: generateApplicationComponents(app!, page)
        });
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId.startsWith(ApplicationCustomIDs.buttons.paginate) ? this.some() : this.none()
    }
}