import { ActionRowBuilder, TextInputBuilder } from "@discordjs/builders";
import { ModalBuilder, TextInputStyle } from "discord.js";
import type { DecisionType } from "./types";
import { ApplicationCustomIDs } from "../../../../constants/custom-ids";

export function generateModal(type: DecisionType, user: string) {
    return new ModalBuilder()
        .setCustomId(`${ApplicationCustomIDs.modals!.decide}-${type}-${user}`)
        .setTitle(Titles[type])
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('reason')
                        .setLabel(`Provide a reason to ${type}`)
                        .setStyle(TextInputStyle.Paragraph)
                )
        )
}

export const Titles: Readonly<Record<DecisionType, string>> = Object.freeze({
    "deny": "Denying Application",
    "accept": "Accepting Application",
    "delete": "Deleting Application"
})