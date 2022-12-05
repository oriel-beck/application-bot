import { Injectable, Logger } from '@nestjs/common';
import { default as Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService extends Redis {
  logger = new Logger(RedisService.name);
  constructor(configService: ConfigService) {
    super({
      host: 'redis',
      password: configService.get<string>('REDIS_PASSWORD'),
    });
    this.connect(() => this.logger.log('Connected to redis'));
  }
}
