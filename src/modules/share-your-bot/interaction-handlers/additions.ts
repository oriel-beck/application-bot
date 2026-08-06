import { generateStickyMessageAdditionsEmbeds } from "@lib/command-utils/sticky-message/resend.js";
import { ShareCustomIDs } from "@lib/constants/custom-ids.js";
import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction } from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.Button
})
export class StickyMessageAdditionsHandler extends InteractionHandler {
    public async run(interaction: ButtonInteraction) {
        interaction.reply({
            embeds: generateStickyMessageAdditionsEmbeds(),
            flags: MessageFlags.Ephemeral
        });
    }

    public parse(interaction: ButtonInteraction) {
        return interaction.customId === ShareCustomIDs.stickyAdditions ? this.some() : this.none();
    }
}