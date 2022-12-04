import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SlashCommandContext } from 'necord';
import { ApplicationManagerNotFoundException } from '../../exceptions';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApplicationManagerGuard implements CanActivate {
  constructor(private configService: ConfigService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const [interaction] = context.getArgByIndex<SlashCommandContext>(0) ?? [
      undefined,
    ];

    // check if the user has the APPLICATION_MANAGER_ROLE
    let isMod;

    if (Array.isArray(interaction.member.roles)) {
      isMod = interaction.member.roles.includes(
        this.configService.get<string>('roles.application_manager'),
      );
    } else {
      isMod = interaction.member.roles.cache.has(
        this.configService.get<string>('roles.application_manager'),
      );
    }

    if (!isMod) throw new ApplicationManagerNotFoundException();
    return true;
  }
}
