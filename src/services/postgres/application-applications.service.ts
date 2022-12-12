import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { from, mergeMap, Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import type {
  DeleteResult,
  InsertResult,
  Repository,
  UpdateResult,
} from 'typeorm';

// typeorm entities
import { BDFDApplication } from '../../entities';

// db services
import { DBApplicationQuestionsService } from './application-questions.service';

// constants
import { ApplicationState } from '../../constants';

// exceptions
import { ApplicationNotFoundException } from '../../exceptions';

@Injectable()
export class DBApplicationApplicationsService {
  redis = new Redis({
    host: 'redis',
    password: this.configService.get<string>('REDIS_PASSWORD'),
  });
  constructor(
    @InjectRepository(BDFDApplication)
    private apps: Repository<BDFDApplication>,
    private questionService: DBApplicationQuestionsService,
    private configService: ConfigService,
  ) {}

  async createApp(userid: bigint, guildid: bigint): Promise<InsertResult> {
    return this.apps.insert(
      this.apps.create({
        userid,
        guildid,
        questions:
          (await this.questionService.generateQuestions(guildid)) || [],
      }),
    );
  }

  updateAppMessageID(
    userid: bigint,
    messageid: bigint,
    guildid: bigint,
  ): Promise<UpdateResult> {
    return this.apps.update(
      {
        userid,
        guildid,
      },
      {
        messageid,
      },
    );
  }

  getApp(userid: bigint, guildid: bigint): Promise<BDFDApplication | null> {
    return this.apps
      .findOneOrFail({ where: { userid, guildid } })
      .catch(() => null);
  }

  async getAppOrThrow(userid: bigint, guildid: bigint) {
    const app = await this.getApp(userid, guildid);
    if (!app) throw new ApplicationNotFoundException();
    return app;
  }

  updateAppAnswer(
    userid: bigint,
    loc: number,
    answer: string,
    guildid: bigint,
  ): Promise<unknown> {
    return this.apps.query(
      `UPDATE bdfd_application SET answers[${
        loc + 1
      }] = $1 WHERE userid = ${userid} AND guildid = ${guildid};`,
      [answer],
    );
  }

  addAnswer(
    userid: bigint,
    answer: string,
    guildid: bigint,
  ): Promise<UpdateResult> {
    return this.apps
      .createQueryBuilder()
      .update()
      .set({
        answers: () => `array_append(answers, :answer)`,
      })
      .setParameter('answer', answer)
      .where('userid = :userid AND guildid = :guildid', { userid, guildid })
      .returning('*')
      .execute();
  }

  async deleteApplication(
    userid: bigint,
    guildid: bigint,
  ): Promise<DeleteResult | null> {
    const app = await this.getApp(userid, guildid);
    this.redis.del(`application-${app.userid}-${app.messageid}`);
    return this.apps
      .delete({ userid })
      .then((res) => !!res.affected)
      .catch(() => null);
  }

  // TODO: put a config that toggles redis completely, since it's meant only for small bots, it will be a problem to reset on production as it can block the whole database
  resetApplications(guildid: bigint): Promise<DeleteResult | null> {
    const stream = this.redis.scanStream({
      match: `*-${guildid}`,
    });

    const obs = new Observable<string[]>((observer) => {
      stream.on('end', () => observer.complete());
      stream.on('data', (keys = []) => observer.next(keys));
    });

    obs.pipe(mergeMap((keys) => from(keys))).subscribe({
      next: async (key) => await this.redis.del(key),
    });

    return this.apps
      .delete({
        guildid,
      })
      .catch(() => null);
  }

  getAllApplicationsByState(
    state: ApplicationState,
  ): Promise<[BDFDApplication[], number]> {
    state ||= ApplicationState.Pending;
    return this.apps.findAndCount({
      where: {
        state,
      },
    });
  }

  updateApplicationState(
    userid: bigint,
    state: ApplicationState,
  ): Promise<UpdateResult> {
    return this.apps.update(
      {
        userid,
      },
      {
        state,
      },
    );
  }
}
