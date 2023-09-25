import { Colors, EmbedBuilder } from "discord.js";
import type { Blacklist } from "../../../types.js";

export function generateBlacklistShowEmbed(blacklist: Blacklist) {
    return [
        new EmbedBuilder()
            .setTitle('Blacklist info')
            .setDescription(`**User**: <@${blacklist.user}> (${blacklist.user})\n**Reason**: ${blacklist.reason}\n**Blacklisted by**: <@${blacklist.mod}> (${blacklist.mod})`)
            .setColor(Colors.DarkBlue)
    ]
}