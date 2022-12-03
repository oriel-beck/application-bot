import { Module } from '@nestjs/common';

// events services
import { AppUpdate } from './app-update.service';

// db services
import { ServicesModule } from '../services/services.module';

@Module({
  providers: [AppUpdate],
  imports: [ServicesModule],
})
export class EventsModule {}
