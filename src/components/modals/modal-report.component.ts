import { Inject, Injectable } from '@nestjs/common';
import { Context, Modal, ModalContext } from 'necord';
import { ConfigService } from '@nestjs/config';
import { TextBasedChannel, TextInputModalData } from 'discord.js';
import { generateReportEmbed } from '../../utils';
import { COLOR_PROVIDER_TOKEN, Colors } from '../../providers';
import { ReportModalResponses } from '../../constants';

@Injectable()
export class ModalReportComponent {
  constructor(
    private configService: ConfigService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
  ) {}

  @Modal('report-modal-:userid-:messageid')
  async reportModal(@Context() [interaction]: ModalContext) {
    const data = interaction.components[0].components[0] as TextInputModalData;
    const split = interaction.customId.split('-');
    const targetUser = await interaction.client.users
      .fetch(split.at(2))
      .catch(() => null);
    const targetMessage = split.at(-1)
      ? await interaction.channel.messages.fetch(split.at(-1)).catch(() => null)
      : null;

    const reportChannel: TextBasedChannel | null =
      await interaction.client.channels
        .fetch(this.configService.get<string>('channels.report'))
        .catch(() => null);

    if (!reportChannel)
      return interaction
        .reply({
          content: ReportModalResponses.ChannelNotFound,
          ephemeral: true,
        })
        .catch(() => null);

    reportChannel
      .send({
        embeds: generateReportEmbed(
          interaction.user,
          data.value,
          targetUser,
          this.colors,
          targetMessage,
        ),
      })
      .catch(() => null);

    return interaction
      .reply({
        content: ReportModalResponses.SentToReview,
        ephemeral: true,
      })
      .catch(() => null);
  }
}
