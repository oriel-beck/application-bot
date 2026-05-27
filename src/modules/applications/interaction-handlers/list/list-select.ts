import { generateApplicationComponents, generateApplicationEmbed } from "@lib/command-utils/application/embeds/application-embed.utils.js";
import { hasRole } from "@lib/precondition-util.js";
import { applicationExists } from "@lib/util.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { ApplicationState } from "@lib/constants/application.js";
import { StringSelectMenuInteraction } from "discord.js";
import type { Application } from "@lib/types.js";

const LIST_SEL_RE = /^app:list:sel:\d+$/;

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class ListSelectHandler extends InteractionHandler {
    public async run(interaction: StringSelectMenuInteraction) {
        if (!hasRole(interaction.member!, this.container.config.roles.mod)) {
            return interaction.reply({
                content: 'You are missing permissions to use this.',
                ephemeral: true
            });
        }
        
        const user = interaction.values[0]!;

        const app = await this.container.applications.get(user).then((res) => res.at(0)).catch(() => null) as Application;

        if (!app || !applicationExists(app)) {
            return interaction.reply({
                content: 'This user does not have an application.',
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: await generateApplicationEmbed(app!),
            components: generateApplicationComponents(app!, 0, app.state === ApplicationState.pending)
        });
    }

    public parse(interaction: StringSelectMenuInteraction) {
        return LIST_SEL_RE.test(interaction.customId) ? this.some() : this.none();
    }
}
