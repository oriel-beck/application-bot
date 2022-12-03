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
} from '../entities';

@Module({
  providers: [
    DBApplicationApplicationsService,
    DBApplicationQuestionsService,
    DBApplicationSettingsService,
    DBApplicationBlacklistService,
  ],
  imports: [
    TypeOrmModule.forFeature([
      BDFDApplication,
      BDFDSetting,
      BDFDQuestion,
      BDFDBlacklist,
    ]),
  ],
  exports: [
    DBApplicationApplicationsService,
    DBApplicationQuestionsService,
    DBApplicationSettingsService,
    DBApplicationBlacklistService,
  ],
})
export class ServicesModule {}
