import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Colors } from 'discord.js';
import { SlashCommandContext } from 'necord';
import { ApplicationInterceptorsResponses } from '../../constants';
import { ApplicationNotFoundException } from '../../exceptions';
import { EmbedBuilder } from '@discordjs/builders';

@Catch(ApplicationNotFoundException)
export class ApplicationNotFoundExceptionFilter implements ExceptionFilter {
  async catch(exception: Error, host: ArgumentsHost) {
    const [interaction] = host.getArgByIndex<SlashCommandContext>(0) ?? [
      undefined,
    ];
    const message = {
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Red)
          .setDescription(ApplicationInterceptorsResponses.ApplicationNotFound),
      ],
    };
    if (interaction.deferred) {
      await interaction.editReply(message).catch(() => null);
    } else if (interaction.replied) {
      await interaction
        .followUp({ ...message, ephemeral: true })
        .catch(() => null);
    } else {
      await interaction
        .reply({ ...message, ephemeral: true })
        .catch(() => null);
    }
  }
}
