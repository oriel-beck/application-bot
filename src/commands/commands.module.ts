import { Module } from '@nestjs/common';

// commands
import { ApplicationBlacklistService, ApplicationService } from './manager';
import { MembersCommandsService, ReportService } from './members';

// db services
import { ServicesModule } from '../services/services.module';

// guards
import { ApplicationManagerGuard } from '../guards';

// colors
import { ColorProvider } from '../providers';

@Module({
  imports: [ServicesModule],
  providers: [
    // commands
    ApplicationService,
    ApplicationBlacklistService,
    MembersCommandsService,
    ReportService,

    // guards
    ApplicationManagerGuard,

    // providers
    ColorProvider,
  ],
})
export class CommandsModule {}
