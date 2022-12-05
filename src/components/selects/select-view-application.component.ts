import { Inject, Injectable, UseFilters } from '@nestjs/common';
import { DBApplicationApplicationsService } from '../../services';
import { Context, SelectMenuContext, StringSelect } from 'necord';
import { ApplicationManagerNotFoundExceptionFilter } from '../../guards';
import {
  generateApplicationResponseComponents,
  generateApplicationResponseEmbed,
} from '../../utils';
import { ApplicationNotFoundException } from '../../exceptions';
import { COLOR_PROVIDER_TOKEN, Colors } from '../../providers';
import { ConfigService } from '@nestjs/config';
import { ApplicationState } from '../../constants';

@UseFilters(ApplicationManagerNotFoundExceptionFilter)
@Injectable()
export class SelectViewApplicationComponent {
  constructor(
    private appService: DBApplicationApplicationsService,
    private configService: ConfigService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
  ) {}
  @StringSelect('app-list-:id')
  async viewApplication(@Context() [interaction]: SelectMenuContext) {
    const userid = interaction.values[0];

    const app = await this.appService.getApp(BigInt(userid));
    if (!app) throw new ApplicationNotFoundException();

    return interaction
      .reply({
        embeds: await generateApplicationResponseEmbed(
          app,
          interaction.client,
          this.colors,
          this.configService.get<number>('applications.max_questions_per_page'),
        ),
        components: generateApplicationResponseComponents(
          userid,
          this.configService.get<number>('applications.max_questions_per_page'),
          this.configService.get<number>('applications.max_questions'),
          0,
          app.state === ApplicationState.Pending,
        ),
      })
      .catch(() => null);
  }
}
