import { Module } from '@nestjs/common';

// events services
import { AppUpdateEvents } from './app-update.service';

@Module({
  providers: [AppUpdateEvents],
})
export class EventsModule {}
