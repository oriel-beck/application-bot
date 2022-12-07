import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppUpdateEvents {
  constructor(private configService: ConfigService) {}
  private readonly logger = new Logger(AppUpdateEvents.name);

  @Once('ready')
  onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('debug')
  onDebug(@Context() [message]: ContextOf<'debug'>) {
    if (this.configService.get<string>('DEBUG_MODE') === 'true') {
      this.logger.debug(message);
    }
  }
}
