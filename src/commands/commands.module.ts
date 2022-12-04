import { Module } from '@nestjs/common';

// commands
import { ApplicationBlacklistService, ApplicationService } from './manager';
import { MembersCommandsService } from './members';

// db services
import { ServicesModule } from '../services/services.module';
import { ApplicationManagerGuard } from '../guards';
import { ReportService } from './members/report.service';

@Module({
  providers: [
    // commands
    ApplicationService,
    ApplicationBlacklistService,
    MembersCommandsService,

    // guards
    ApplicationManagerGuard,

    ReportService,
  ],
  imports: [ServicesModule],
})
export class CommandsModule {}
