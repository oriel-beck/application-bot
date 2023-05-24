import { Colors, EmbedBuilder } from "discord.js";
import type { Blacklist } from "../../../../types";

export function generateBlacklistShowEmbed(blacklist: Blacklist) {
    return [
        new EmbedBuilder()
        .setTitle('Blacklist info')
        .setDescription(`**User**: <@${blacklist.user}> (${blacklist.user})\n**Reason**: ${blacklist.reason}\n**Blacklised by**: <@${blacklist.mod}> (${blacklist.mod})`)
        .setColor(Colors.DarkBlue)
    ]
}