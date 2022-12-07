import { Inject, Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { Button, ButtonContext, Context } from 'necord';
import { ConfigService } from '@nestjs/config';
import { APIMessageComponentEmoji, ButtonInteraction } from 'discord.js';

// db services
import { DBApplicationApplicationsService } from '../../services/postgres';

// utils
import {
  generateApplicationResponseComponents,
  generateApplicationResponseEmbed,
} from '../../utils';

// guards
import {
  ApplicationManagerGuard,
  ApplicationManagerNotFoundExceptionFilter,
  ApplicationNotFoundExceptionFilter,
} from '../../guards';

// providers
import { COLOR_PROVIDER_TOKEN } from '../../providers';
import type { Colors } from '../../providers';

@Injectable()
export class ButtonPaginationComponent {
  constructor(
    private appsService: DBApplicationApplicationsService,
    private configService: ConfigService,
    @Inject(COLOR_PROVIDER_TOKEN) private colors: Colors,
  ) {}

  @UseGuards(ApplicationManagerGuard)
  @UseFilters(
    ApplicationManagerNotFoundExceptionFilter,
    ApplicationNotFoundExceptionFilter,
  )
  @Button('prev-:userid-:id')
  applicationPrev(@Context() [interaction]: ButtonContext) {
    return this.handlePagination(interaction);
  }

  @UseGuards(ApplicationManagerGuard)
  @UseFilters(
    ApplicationManagerNotFoundExceptionFilter,
    ApplicationNotFoundExceptionFilter,
  )
  @Button('next-:userid-:num')
  applicationNext(@Context() [interaction]: ButtonContext) {
    return this.handlePagination(interaction);
  }

  async handlePagination(interaction: ButtonInteraction) {
    const split = interaction.customId.split('-');

    const userid = BigInt(split.at(1));
    const app = await this.appsService.getAppOrThrow(userid);

    const num = Number(split.at(-1));

    return interaction.update({
      embeds: await generateApplicationResponseEmbed(
        app,
        interaction.client,
        this.colors,
        this.configService.get<number>('applications.max_questions_per_page'),
        num,
      ),
      components: generateApplicationResponseComponents(
        userid,
        this.configService.get<number>('applications.max_questions_per_page'),
        this.configService.get<number>('applications.max_questions'),
        this.configService.get<APIMessageComponentEmoji>('emojis.next'),
        this.configService.get<APIMessageComponentEmoji>('emojis.prev'),
        num,
      ),
    });
  }
}
