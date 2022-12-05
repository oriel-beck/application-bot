import { Inject, Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { DBApplicationApplicationsService } from '../../services';
import { Button, ButtonContext, Context } from 'necord';
import {
  generateApplicationResponseComponents,
  generateApplicationResponseEmbed,
} from '../../utils';
import {
  ApplicationManagerGuard,
  ApplicationManagerNotFoundExceptionFilter,
  ApplicationNotFoundExceptionFilter,
} from '../../guards';
import { COLOR_PROVIDER_TOKEN, Colors } from '../../providers';
import { ConfigService } from '@nestjs/config';

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
  async applicationPrev(@Context() [interaction]: ButtonContext) {
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
      ),
    });
  }

  @UseGuards(ApplicationManagerGuard)
  @UseFilters(
    ApplicationManagerNotFoundExceptionFilter,
    ApplicationNotFoundExceptionFilter,
  )
  @Button('next-:userid-:num')
  async applicationNext(@Context() [interaction]: ButtonContext) {
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
        1,
      ),
    });
  }
}
