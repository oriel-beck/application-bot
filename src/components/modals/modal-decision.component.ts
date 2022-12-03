import { Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Context, Modal, ModalContext } from 'necord';
import { TextInputModalData } from 'discord.js';
import { ConfigService } from '@nestjs/config';

// services
import { DBApplicationApplicationsService } from '../../services';

// utils
import { ApplicationState, decideApplication } from '../../utils';

// guards
import {
  ApplicationManagerGuard,
  ApplicationManagerNotFoundExceptionFilter,
  ApplicationNotFoundExceptionFilter,
} from '../../guards';

@Injectable()
export class ModalDecisionComponent {
  constructor(
    private appService: DBApplicationApplicationsService,
    private configService: ConfigService,
  ) {}

  @UseGuards(ApplicationManagerGuard)
  @UseFilters(
    ApplicationNotFoundExceptionFilter,
    ApplicationManagerNotFoundExceptionFilter,
  )
  @Modal('deny-:userid')
  async applicationDeny(@Context() [interaction]: ModalContext) {
    const data = interaction.components[0].components[0] as TextInputModalData;
    const userid = interaction.customId.split('-').at(-1);

    return interaction.reply(
      await decideApplication(
        this.appService,
        BigInt(userid),
        interaction.client,
        ApplicationState.Denied,
        data.value,
      ),
    );
  }

  @UseGuards(ApplicationManagerGuard)
  @UseFilters(
    ApplicationNotFoundExceptionFilter,
    ApplicationManagerNotFoundExceptionFilter,
  )
  @Modal('accept-:userid')
  async applicationAccept(@Context() [interaction]: ModalContext) {
    const data = interaction.components[0].components[0] as TextInputModalData;
    const userid = interaction.customId.split('-').at(-1);

    return interaction.reply(
      await decideApplication(
        this.appService,
        BigInt(userid),
        interaction.client,
        ApplicationState.Accepted,
        data.value,
        interaction.guild,
      ),
    );
  }
}
