import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SlashCommandContext } from 'necord';
import { ApplicationManagerNotFoundException } from '../../exceptions';

@Injectable()
export class ApplicationManagerGuard implements CanActivate {
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
        process.env.APPLICATION_MANAGER_ROLE,
      );
    } else {
      isMod = interaction.member.roles.cache.has(
        process.env.APPLICATION_MANAGER_ROLE,
      );
    }

    if (!isMod) throw new ApplicationManagerNotFoundException();
    return true;
  }
}
