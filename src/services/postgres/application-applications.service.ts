import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, InsertResult, Repository, UpdateResult } from 'typeorm';

// typeorm entities
import { BDFDApplication } from '../../entities';

// db services
import { DBApplicationQuestionsService } from './application-questions.service';
import { ApplicationState } from '../../constants';
import { ApplicationNotFoundException } from '../../exceptions';
import { RedisService } from '../redis';

@Injectable()
export class DBApplicationApplicationsService {
  constructor(
    @InjectRepository(BDFDApplication)
    private apps: Repository<BDFDApplication>,
    private questionService: DBApplicationQuestionsService,
    private redis: RedisService,
  ) {}

  async createApp(userid: bigint): Promise<InsertResult> {
    return this.apps.insert(
      this.apps.create({
        userid,
        questions: (await this.questionService.generateQuestions()) || [],
      }),
    );
  }

  updateAppMessageID(userid: bigint, messageid: bigint): Promise<UpdateResult> {
    return this.apps.update(
      {
        userid,
      },
      {
        messageid,
      },
    );
  }

  getApp(userid: bigint): Promise<BDFDApplication | null> {
    return this.apps.findOneOrFail({ where: { userid } }).catch(() => null);
  }

  async getAppOrThrow(userid: bigint) {
    const app = await this.getApp(userid);
    if (!app) throw new ApplicationNotFoundException();
    return app;
  }

  updateAppAnswer(
    userid: bigint,
    loc: number,
    answer: string,
  ): Promise<unknown> {
    return this.apps.query(
      `UPDATE bdfd_application SET answers[${loc}] = $1 WHERE userid = ${userid};`,
      [answer],
    );
  }

  addAnswer(userid: bigint, answer: string): Promise<UpdateResult> {
    return this.apps
      .createQueryBuilder()
      .update()
      .set({
        answers: () => `array_append(answers, :answer)`,
      })
      .setParameter('answer', answer)
      .where('userid = :userid', { userid })
      .returning('*')
      .execute();
  }

  async deleteApplication(userid: bigint): Promise<DeleteResult | null> {
    const app = await this.getApp(userid);
    this.redis.del(`application-${app.userid}-${app.messageid}`);
    return this.apps
      .delete({ userid })
      .then((res) => !!res.affected)
      .catch(() => null);
  }

  resetApplications(): Promise<DeleteResult> {
    this.redis.reset().catch(() => null);
    return this.apps.createQueryBuilder().delete().execute();
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
