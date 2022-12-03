import { Injectable, UseFilters, UseGuards } from '@nestjs/common';
import { DBApplicationApplicationsService } from '../../services';
import { Button, ButtonContext, Context } from 'necord';
import {
  applicationExistThrower,
  generateApplicationResponseComponents,
  generateApplicationResponseEmbed,
} from '../../utils';
import {
  ApplicationManagerGuard,
  ApplicationManagerNotFoundExceptionFilter,
  ApplicationNotFoundExceptionFilter,
} from '../../guards';

@Injectable()
export class ButtonPaginationComponent {
  constructor(private appsService: DBApplicationApplicationsService) {}

  @UseGuards(ApplicationManagerGuard)
  @UseFilters(
    ApplicationManagerNotFoundExceptionFilter,
    ApplicationNotFoundExceptionFilter,
  )
  @Button('prev-:userid-:id')
  async applicationPrev(@Context() [interaction]: ButtonContext) {
    const split = interaction.customId.split('-');

    const userid = split.at(1);
    await applicationExistThrower(BigInt(userid), this.appsService);

    const num = Number(split.at(-1));

    return interaction.update({
      embeds: await generateApplicationResponseEmbed(
        await this.appsService.getApp(BigInt(userid)),
        interaction.client,
        num,
      ),
      components: generateApplicationResponseComponents(userid),
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

    const userid = split.at(1);
    await applicationExistThrower(BigInt(userid), this.appsService);

    const num = Number(split.at(-1));

    return interaction.update({
      embeds: await generateApplicationResponseEmbed(
        await this.appsService.getApp(BigInt(userid)),
        interaction.client,
        num,
      ),
      components: generateApplicationResponseComponents(userid, 1),
    });
  }
}
