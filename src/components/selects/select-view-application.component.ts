import { Injectable, UseFilters } from '@nestjs/common';
import { DBApplicationApplicationsService } from '../../services';
import { Context, SelectMenuContext, StringSelect } from 'necord';
import { ApplicationManagerNotFoundExceptionFilter } from '../../guards';
import {
  ApplicationState,
  generateApplicationResponseComponents,
  generateApplicationResponseEmbed,
} from '../../utils';
import { ApplicationNotFoundException } from '../../exceptions';

@UseFilters(ApplicationManagerNotFoundExceptionFilter)
@Injectable()
export class SelectViewApplicationComponent {
  constructor(private appService: DBApplicationApplicationsService) {}
  @StringSelect('app-list-:id')
  async viewApplication(@Context() [interaction]: SelectMenuContext) {
    const userid = interaction.values[0];

    const app = await this.appService.getApp(BigInt(userid));
    if (!app) throw new ApplicationNotFoundException();

    return interaction.reply({
      embeds: await generateApplicationResponseEmbed(app, interaction.client),
      components: generateApplicationResponseComponents(
        userid,
        0,
        app.state === ApplicationState.Pending,
      ),
    });
  }
}
