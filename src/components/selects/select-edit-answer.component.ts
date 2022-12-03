import { Injectable, UseFilters } from '@nestjs/common';
import { SelectMenuContext, StringSelect } from 'necord';
import { DBApplicationApplicationsService } from '../../services';
import {
  generateApplicationDashboardComponents,
  generateApplicationDashboardEmbed,
} from '../../utils';
import { ApplicationNotFoundExceptionFilter } from '../../guards';
import { ApplicationNotFoundException } from '../../exceptions';

@UseFilters(ApplicationNotFoundExceptionFilter)
@Injectable()
export class SelectEditAnswerComponent {
  constructor(private appService: DBApplicationApplicationsService) {}

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
