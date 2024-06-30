import { generateStickyMessageAdditionsEmbeds } from "@lib/command-utils/sticky-message/resend.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import type { ButtonInteraction } from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class StickyMessageAdditionsHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        interaction.reply({
            embeds: generateStickyMessageAdditionsEmbeds(),
            ephemeral: true
        });
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId === "sticky-message-additions" ? this.some() : this.none();
    }
}