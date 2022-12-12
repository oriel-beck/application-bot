import { Inject, Injectable, UseFilters } from '@nestjs/common';
import { Context, StringSelectContext, StringSelect } from 'necord';
import { ConfigService } from '@nestjs/config';
import type { APIMessageComponentEmoji } from 'discord.js';

// db services
import { DBApplicationApplicationsService } from '../../services/postgres';

// guards
import { ApplicationManagerNotFoundExceptionFilter } from '../../guards';

// utils
import {
  generateApplicationResponseComponents,
  generateApplicationResponseEmbed,
} from '../../utils';

// exceptions
import { ApplicationNotFoundException } from '../../exceptions';

// providers
import { COLOR_PROVIDER_TOKEN, Colors } from '../../providers';

// constants
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
  async viewApplication(@Context() [interaction]: StringSelectContext) {
    const userid = interaction.values[0];

    const app = await this.appService.getApp(
      BigInt(userid),
      BigInt(interaction.guildId),
    );
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
          this.configService.get<APIMessageComponentEmoji>('emojis.next'),
          this.configService.get<APIMessageComponentEmoji>('emojis.prev'),
          0,
          app.state === ApplicationState.Pending,
        ),
      })
      .catch(() => null);
  }
}
