import { ActionRowBuilder, TextInputBuilder } from "@discordjs/builders";
import { ModalBuilder, TextInputStyle } from "discord.js";
import type { DecisionType } from "./types";

export function generateModal(type: DecisionType, user: string) {
    return new ModalBuilder()
        .setCustomId(`decision-${type}-${user}`)
        .setTitle(typeToTitle(type))
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

function typeToTitle(type: DecisionType) {
    switch(type) {
        case "deny":
            return 'Denying Application'
        case "accept":
            return 'Accepting Application'
        case "delete":
            return 'Deleting Application'
    }
}