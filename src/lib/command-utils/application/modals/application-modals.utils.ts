import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { ApplicationCustomIDs } from "../../../constants/custom-ids.js";
import type { ApplicationState } from "../../../constants/application.js";

export function generateModal(type: ApplicationState, user: string) {
    return new ModalBuilder()
        .setCustomId(`${ApplicationCustomIDs.modals!.decide}-${type}-${user}`)
        .setTitle(Titles[type]!)
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('reason')
                        .setLabel(`Provide a reason to ${type}`)
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                )
        )
}

export const Titles: Readonly<Partial<Record<ApplicationState, string>>> = Object.freeze({
    "denied": "Denying Application",
    "accepted": "Accepting Application",
    "deleted": "Deleting Application"
})