import { Module } from '@nestjs/common';
import {
  DBApplicationApplicationsService,
  DBApplicationQuestionsService,
  DBApplicationSettingsService,
  DBApplicationBlacklistService,
} from '.';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BDFDApplication,
  BDFDBlacklist,
  BDFDQuestion,
  BDFDSetting,
} from '../../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BDFDApplication,
      BDFDSetting,
      BDFDQuestion,
      BDFDBlacklist,
    ]),
  ],
  providers: [
    DBApplicationApplicationsService,
    DBApplicationQuestionsService,
    DBApplicationSettingsService,
    DBApplicationBlacklistService,
  ],
  exports: [
    DBApplicationApplicationsService,
    DBApplicationQuestionsService,
    DBApplicationSettingsService,
    DBApplicationBlacklistService,
  ],
})
export class PostgresModule {}
