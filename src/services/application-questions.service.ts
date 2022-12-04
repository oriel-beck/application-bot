import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, InsertResult, Repository, UpdateResult } from 'typeorm';
import { readFileSync, existsSync } from 'fs';
import { ConfigService } from '@nestjs/config';

// typeorm entities
import { BDFDQuestion } from '../entities';

// utils
import { utilGenerateQuestions } from '../utils';

@Injectable()
export class DBApplicationQuestionsService {
  logger = new Logger(DBApplicationQuestionsService.name);
  baseQuestions: string[] = [];
  constructor(
    @InjectRepository(BDFDQuestion) private questions: Repository<BDFDQuestion>,
    private configService: ConfigService,
  ) {
    if (existsSync('/app/base-questions.json')) {
      this.baseQuestions = JSON.parse(
        readFileSync('/app/base-questions.json').toString(),
      );
      this.logger.log('Updated base questions');
    } else
      this.logger.warn(
        'Cannot file base-questions.json, loading 0 base questions',
      );
  }

  editQuestions(id: string, question: string): Promise<UpdateResult | null> {
    return this.questions
      .update(
        {
          id,
        },
        {
          question,
        },
      )
      .catch(() => null);
  }

  addQuestion(question: string): Promise<InsertResult | null> {
    return this.questions
      .insert({
        question,
      })
      .catch(() => null);
  }

  deleteQuestion(id: string): Promise<DeleteResult | null> {
    return this.questions
      .delete({
        id,
      })
      .catch(() => null);
  }

  getQuestion(id: string): Promise<BDFDQuestion | null> {
    return this.questions
      .findOneOrFail({
        where: {
          id,
        },
      })
      .catch(() => null);
  }

  getAllQuestions(): Promise<BDFDQuestion[] | null> {
    return this.questions.find().catch(() => null);
  }

  generateQuestions(): Promise<string[]> {
    return this.questions
      .createQueryBuilder()
      .select()
      .orderBy('RANDOM()')
      .limit(
        Number(this.configService.get<string>('applications.max_questions')),
      )
      .execute()
      .then(utilGenerateQuestions(this.baseQuestions))
      .catch(() => []);
  }
}
