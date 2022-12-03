import { Module } from '@nestjs/common';

// commands
import { ApplicationBlacklistService, ApplicationService } from './mods';
import { MembersCommandsService } from './members';

// db services
import { ServicesModule } from '../services/services.module';
import { ApplicationManagerGuard } from '../guards';

@Module({
  providers: [
    // commands
    ApplicationService,
    ApplicationBlacklistService,
    MembersCommandsService,

    // guards
    ApplicationManagerGuard,
  ],
  imports: [ServicesModule],
})
export class CommandsModule {}
