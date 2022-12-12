import { APIMessageComponentEmoji } from 'discord.js';
import { ButtonBuilder } from '@discordjs/builders';

export function setEmojiToButton(
  button: ButtonBuilder,
  defaultText: string,
  emoji?: APIMessageComponentEmoji,
) {
  if (emoji.id) {
    button.setEmoji(emoji);
  } else {
    button.setLabel(defaultText);
  }
}
