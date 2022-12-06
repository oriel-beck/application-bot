import { Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Button, ButtonContext, Context } from 'necord';
import { generateAcceptModal, generateDenyModal } from '../../utils';
import {
  ApplicationManagerGuard,
  ApplicationManagerNotFoundExceptionFilter,
  ApplicationNotFoundExceptionFilter,
} from '../../guards';
import { DBApplicationApplicationsService } from '../../services/postgres';
import { ApplicationNotFoundException } from '../../exceptions';
import { ApplicationErrors, ApplicationState } from '../../constants';

@Injectable()
export class ButtonDecisionComponent {
  constructor(private appService: DBApplicationApplicationsService) {}

  @UseGuards(ApplicationManagerGuard)
  @UseFilters(
    ApplicationManagerNotFoundExceptionFilter,
    ApplicationNotFoundExceptionFilter,
  )
  @Button('deny-:userid')
  async applicationDeny(@Context() [interaction]: ButtonContext) {
    const userid = BigInt(interaction.customId.split('-').at(-1));

    const appState = await this.appService.getApp(userid);

    if (!appState) throw new ApplicationNotFoundException();

    if (appState.state !== ApplicationState.Pending)
      return interaction
        .reply({
          content: ApplicationErrors.NotPending,
          ephemeral: true,
        })
        .catch(() => null);

    return interaction.showModal(generateDenyModal(userid)).catch(() => null);
  }

  @UseGuards(ApplicationManagerGuard)
  @UseFilters(
    ApplicationManagerNotFoundExceptionFilter,
    ApplicationNotFoundExceptionFilter,
  )
  @Button('accept-:userid')
  async applicationAccept(@Context() [interaction]: ButtonContext) {
    const userid = BigInt(interaction.customId.split('-').at(-1));

    const appState = await this.appService.getApp(userid);

    if (!appState) throw new ApplicationNotFoundException();

    if (appState.state !== ApplicationState.Pending)
      return interaction
        .reply({
          content: ApplicationErrors.NotPending,
          ephemeral: true,
        })
        .catch(() => null);

    return interaction.showModal(generateAcceptModal(userid)).catch(() => null);
  }
}
