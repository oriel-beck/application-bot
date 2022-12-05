import { EmbedBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, Colors } from 'discord.js';

export async function returnErrorEmbed(
  error: string,
  interaction: ChatInputCommandInteraction,
) {
  const message = {
    embeds: [new EmbedBuilder().setColor(Colors.Red).setDescription(error)],
  };
  if (interaction.deferred) {
    await interaction.editReply(message).catch(() => null);
  } else if (interaction.replied) {
    await interaction
      .followUp({ ...message, ephemeral: true })
      .catch(() => null);
  } else {
    await interaction.reply({ ...message, ephemeral: true }).catch(() => null);
  }
}
