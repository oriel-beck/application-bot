import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DBApplicationApplicationsService } from '../../services';
import { SlashCommandContext } from 'necord';
import { ApplicationNotFoundException } from '../../exceptions';

@Injectable()
export class ApplicationExistsGuard implements CanActivate {
  constructor(private appService: DBApplicationApplicationsService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const [interaction] = context.getArgByIndex<SlashCommandContext>(0) ?? [
      undefined,
    ];

    const appExist = await this.appService
      .getApp(BigInt(interaction.user.id))
      .then((app) => !!app);

    if (!appExist) {
      throw new ApplicationNotFoundException();
    }

    return true;
  }
}
