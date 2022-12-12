import { Module } from '@nestjs/common';

// commands
import {
  ApplicationCommandsBlacklistService,
  ApplicationCommandsService,
} from './manager';
import {
  AboutCommandsService,
  ApplyCommandsService,
  ReportCommandsService,
} from './members';
import { OwnerCommandsService } from './owner/owner';

// db services
import { PostgresModule } from '../services/postgres/postgres.module';
import { RedisModule } from '../services/redis/redis.module';

// guards
import { ApplicationManagerGuard } from '../guards';

// colors
import { ColorProvider } from '../providers';

@Module({
  imports: [PostgresModule, RedisModule],
  providers: [
    // commands
    ApplicationCommandsService,
    ApplicationCommandsBlacklistService,
    ApplyCommandsService,
    ReportCommandsService,
    OwnerCommandsService,
    AboutCommandsService,

    // guards
    ApplicationManagerGuard,

    // providers
    ColorProvider,
  ],
})
export class CommandsModule {}
