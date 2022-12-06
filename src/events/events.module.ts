import { Module } from '@nestjs/common';

// events services
import { AppUpdate } from './app-update.service';

@Module({
  providers: [AppUpdate],
})
export class EventsModule {}
