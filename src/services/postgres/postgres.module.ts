import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// db services
import {
  DBApplicationApplicationsService,
  DBApplicationQuestionsService,
  DBApplicationSettingsService,
  DBApplicationBlacklistService,
} from '.';

// typeorm entities
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
