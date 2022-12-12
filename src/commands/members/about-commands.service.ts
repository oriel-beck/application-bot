import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { Colors } from 'discord.js';

@Injectable()
export class AboutCommandsService {
  @SlashCommand({
    name: 'about',
    description: 'Information about the bot',
  })
  aboutCommand(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({
      embeds: [
        {
          title: 'About the bot',
          description:
            "**Framework:** **[NeCord](https://necord.org/)**\n**Created By:** <@311808747141857292> (oriel beck#0001)\n**Description:** This bot is an Application Bot created for **[BDFD](https://botdesignerdiscord.com/)**, you can find the bot's source code on **[GitHub](https://github.com/oriel-beck/application-bot)**.\n\nThis bot is distributed under the MIT license.",
          footer: {
            text: 'All rights reserved (C) - Oriel Beck',
          },
          color: Colors.DarkPurple,
        },
      ],
    });
  }
}
