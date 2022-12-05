import { Inject, Injectable, UseFilters } from '@nestjs/common';
import { SelectMenuContext, StringSelect } from 'necord';
import { DBApplicationApplicationsService } from '../../services';
import {
  generateApplicationDashboardComponents,
  generateApplicationDashboardEmbed,
} from '../../utils';
import { ApplicationNotFoundExceptionFilter } from '../../guards';
import { ApplicationNotFoundException } from '../../exceptions';
import { COLOR_PROVIDER_TOKEN, Colors } from '../../providers';

@UseFilters(ApplicationNotFoundExceptionFilter)
@Injectable()
export class SelectEditAnswerComponent {
  constructor(
    private appService: DBApplicationApplicationsService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
  ) {}

  @StringSelect('view-:id')
  async viewQuestion([interaction]: SelectMenuContext) {
    const userid = BigInt(interaction.user.id);
    const qnum = Number(interaction.values[0]);

    const app = await this.appService.getApp(userid);

    if (!app) throw new ApplicationNotFoundException();

    return interaction.update({
      embeds: generateApplicationDashboardEmbed(
        qnum,
        app.questions[qnum],
        app.answers[qnum],
        this.colors['primary'],
      ),
      components: generateApplicationDashboardComponents(
        qnum,
        interaction.user.id,
        app.questions,
        app.answers,
      ),
    });
  }
}
