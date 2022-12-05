import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// db services
import {
  DBApplicationApplicationsService,
  DBApplicationQuestionsService,
  DBApplicationSettingsService,
  DBApplicationBlacklistService,
  ApplicationExpireService,
  RedisService,
} from '.';

// typeorm entities
import {
  BDFDApplication,
  BDFDBlacklist,
  BDFDQuestion,
  BDFDSetting,
} from '../entities';

// utils for ApplicationExpireService
export let expireInit = false;
export const expiredInitiated = () => (expireInit = true);

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
    ApplicationExpireService,
    RedisService,
  ],
  exports: [
    DBApplicationApplicationsService,
    DBApplicationQuestionsService,
    DBApplicationSettingsService,
    DBApplicationBlacklistService,
    ApplicationExpireService,
    RedisService,
  ],
})
export class ServicesModule {}
