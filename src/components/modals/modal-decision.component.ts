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

    return interaction
      .reply(
        await decideApplication(
          this.appService,
          BigInt(userid),
          interaction.client,
          ApplicationState.Denied,
          data.value,
          this.configService.get<string>('channels.pending'),
          this.configService.get<string>('channels.denied'),
          this.configService.get<string>('roles.staff'),
          this.configService.get<string>('channels.staff'),
          this.configService.get<number>('applications.max_questions_per_page'),
        ),
      )
      .catch(() => null);
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

    return interaction
      .reply(
        await decideApplication(
          this.appService,
          BigInt(userid),
          interaction.client,
          ApplicationState.Accepted,
          data.value,
          this.configService.get<string>('channels.pending'),
          this.configService.get<string>('channels.accepted'),
          this.configService.get<string>('roles.staff'),
          this.configService.get<string>('channels.staff'),
          this.configService.get<number>('applications.max_questions_per_page'),
          interaction.guild,
        ),
      )
      .catch(() => null);
  }
}
