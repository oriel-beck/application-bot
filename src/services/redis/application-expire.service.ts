import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { delay, from, interval, mergeMap } from 'rxjs';
import { Client, DMChannel } from 'discord.js';

// db services
import { RedisService } from '.';
// import { expiredInit, expireInit } from './redis.module';
import { InjectRepository } from '@nestjs/typeorm';
import { BDFDApplication } from '../../entities';
import { Repository } from 'typeorm';

@Injectable()
export class ApplicationExpireService {
  editLoop = this.configService.get<boolean>('edit_loop');
  timeout = this.configService.get<number>('applications.timeout');
  // loop every 5 minutes, shorter can cause ratelimites sometimes
  loop$ = interval(10000).pipe(
    mergeMap(() => from(this.redisService.keys('application-*'))),
    mergeMap((apps: string[]) => from(apps).pipe(delay(3000))),
  );
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    @InjectRepository(BDFDApplication)
    private apps: Repository<BDFDApplication>,
    private discordClient: Client,
  ) {}

  /**
   * You CANNOT initiate this class more than once, otherwise the loop will overload
   */
  public init() {
    // if (expiredInit) return false;
    // expireInit();
    if (this.timeout) {
      const subRedisClient = this.redisService.duplicate();
      subRedisClient.subscribe('__keyevent@0__:expired');
      subRedisClient.on('message', (_, i) => this.handleApplicationTimeout(i));
    }
    if (this.editLoop) this.startApplicationLoop();
    return true;
  }

  private startApplicationLoop() {
    this.loop$.subscribe({
      next: async (appString) => {
        const TTL = await this.redisService.ttl(appString).catch(() => null);
        this.editApplicationTimeoutTime(appString, TTL);
      },
    });
  }

  private async editApplicationTimeoutTime(appString: string, seconds: number) {
    if (seconds <= 0) return;

    const msg = await this.getApplicationMessage(appString);
    if (!msg) return;

    msg
      .edit({
        content: `Reminder: The application will time out in **${(
          seconds / 60
        ).toFixed(1)} minutes**`,
      })
      .catch(() => null);
  }

  private async handleApplicationTimeout(appString: string) {
    this.apps
      .delete({
        userid: BigInt(appString.split('-').at(1)),
      })
      .catch(() => null);
    const msg = await this.getApplicationMessage(appString);
    if (!msg) return;

    return msg
      .edit({
        content: 'Application timed out, components will no longer respond.',
      })
      .catch(() => null);
  }

  private async getApplicationMessage(appString: string) {
    const split = appString.split('-');
    const user = await this.discordClient.users
      .fetch(split.at(1))
      .catch(() => null);
    if (!user) return;

    const dmChannel: DMChannel = await user.createDM().catch(() => null);
    if (!dmChannel) return;

    const msg = await dmChannel.messages.fetch(split.at(2)).catch(() => null);
    if (!msg) return;
    return msg;
  }
}
