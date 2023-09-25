import { generateApplicationComponents, generateApplicationEmbed } from "@lib/command-utils/application/embeds/application-embed.utils.js";
import { isMod } from "@lib/precondition-util.js";
import { applicationExists } from "@lib/util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { ApplicationState } from "@lib/constants/application.js";
import { ApplicationCustomIDs } from "@lib/constants/custom-ids.js";
import { StringSelectMenuInteraction } from "discord.js";

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

        const app = await this.container.applications.get(user).then((res) => res.first()).catch(() => null);

        if (!applicationExists(app)) {
            return interaction.reply({
                content: 'This user does not have an application.',
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: await generateApplicationEmbed(app!),
            components: generateApplicationComponents(app!, 0, app?.get('state') === ApplicationState.pending)
        });
    }

    public parse(interaction: StringSelectMenuInteraction) {
        return interaction.customId.startsWith(ApplicationCustomIDs.selects.list) ? this.some() : this.none()
    }
}