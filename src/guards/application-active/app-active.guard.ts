import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DBApplicationApplicationsService } from '../../services';
import { SlashCommandContext } from 'necord';
import { ApplicationNotActiveException } from '../../exceptions';
import { ApplicationState } from '../../utils';

@Injectable()
export class AppActiveGuard implements CanActivate {
  constructor(private appService: DBApplicationApplicationsService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const [interaction] = context.getArgByIndex<SlashCommandContext>(0) ?? [
      undefined,
    ];

    const appActive = await this.appService
      .getApp(BigInt(interaction.user.id))
      .then((app) => app.state === ApplicationState.Active);

    if (!appActive) {
      throw new ApplicationNotActiveException();
    }

    return true;
  }
}
