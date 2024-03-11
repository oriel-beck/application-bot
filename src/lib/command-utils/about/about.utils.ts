import { Colors, EmbedBuilder } from "discord.js";

export function generateAboutEmbed() {
    return [
        new EmbedBuilder()
            .setTitle('About the bot')
            .setDescription('**Framework**: [Sapphire](https://www.sapphirejs.dev/)\n**Created By**: <@311808747141857292>\n**Description**: This bot is a Support Bot created for BDFD, you can find the bot\'s source code on [GitHub](https://github.com/oriel-beck/application-bot).\n\nThis bot is distributed under the MPL license.')
            .setColor(Colors.Blurple)
            .setFooter({ text: 'All rights reserved (C) - Oriel Beck' })
    ]
}