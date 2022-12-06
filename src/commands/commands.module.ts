import { Module } from '@nestjs/common';

// commands
import { ApplicationBlacklistService, ApplicationService } from './manager';
import { ApplyCommandsService, ReportService } from './members';
import { OwnerService } from './owner/owner';

// db services

// guards
import { ApplicationManagerGuard } from '../guards';

// colors
import { ColorProvider } from '../providers';
import { PostgresModule } from '../services/postgres/postgres.module';
import { RedisModule } from '../services/redis/redis.module';

@Module({
  imports: [PostgresModule, RedisModule],
  providers: [
    // commands
    ApplicationService,
    ApplicationBlacklistService,
    ApplyCommandsService,
    ReportService,
    OwnerService,

    // guards
    ApplicationManagerGuard,

    // providers
    ColorProvider,
  ],
})
export class CommandsModule {}
