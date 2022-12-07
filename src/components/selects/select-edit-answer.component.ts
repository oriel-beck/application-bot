import { Inject, Injectable, UseFilters } from '@nestjs/common';
import { StringSelect, StringSelectContext } from 'necord';

// db services
import { DBApplicationApplicationsService } from '../../services/postgres';

// utils
import {
  generateApplicationDashboardComponents,
  generateApplicationDashboardEmbed,
} from '../../utils';

// guards
import { ApplicationNotFoundExceptionFilter } from '../../guards';

// exceptions
import { ApplicationNotFoundException } from '../../exceptions';

// providers
import { COLOR_PROVIDER_TOKEN } from '../../providers';
import type { Colors } from '../../providers';

@UseFilters(ApplicationNotFoundExceptionFilter)
@Injectable()
export class SelectEditAnswerComponent {
  constructor(
    private appService: DBApplicationApplicationsService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
  ) {}

  @StringSelect('view-:id')
  async viewQuestion([interaction]: StringSelectContext) {
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
