import { Module } from '@nestjs/common';
import { ApplicationExpireService } from './application-expire.service';
import { RedisService } from './redis.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BDFDApplication } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([BDFDApplication])],
  providers: [ApplicationExpireService, RedisService],
  exports: [ApplicationExpireService, RedisService],
})
export class RedisModule {}
