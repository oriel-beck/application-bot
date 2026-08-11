import { Colors, EmbedBuilder } from "discord.js";

export const PRIVACY_POLICY_URL = 'https://oriel-beck.github.io/application-bot/legal/privacy-policy.html';
export const TERMS_OF_SERVICE_URL = 'https://oriel-beck.github.io/application-bot/legal/terms-of-service.html';

export function generateAboutEmbed() {
    return [
        new EmbedBuilder()
            .setTitle('About the bot')
            .setDescription(
                [
                    '**Framework**: [Sapphire](https://www.sapphirejs.dev/)',
                    '**Created By**: <@311808747141857292>',
                    "**Description**: This bot is a Support Bot created for BDFD, you can find the bot's source code on [GitHub](https://github.com/oriel-beck/application-bot).",
                    '',
                    `**Privacy Policy**: [View](${PRIVACY_POLICY_URL})`,
                    `**Terms of Service**: [View](${TERMS_OF_SERVICE_URL})`,
                    '',
                    'This bot is distributed under the MPL license.'
                ].join('\n')
            )
            .setColor(Colors.Blurple)
            .setFooter({ text: 'All rights reserved (C) - Oriel Beck' })
    ]
}