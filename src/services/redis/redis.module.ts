import { Module } from '@nestjs/common';
import { ApplicationExpireService } from './application-expire.service';
import { TypeOrmModule } from '@nestjs/typeorm';

// db services
import { RedisService } from './redis.service';

// typeorm entities
import { BDFDApplication } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([BDFDApplication])],
  providers: [ApplicationExpireService, RedisService],
  exports: [ApplicationExpireService, RedisService],
})
export class RedisModule {}
