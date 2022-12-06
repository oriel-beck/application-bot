import { Module } from '@nestjs/common';
import { ApplicationExpireService } from './application-expire.service';
import { RedisService } from './redis.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BDFDApplication } from '../../entities';

// export let expiredInit = false;
// export const expireInit = () => (expiredInit = true);
@Module({
  imports: [TypeOrmModule.forFeature([BDFDApplication])],
  providers: [ApplicationExpireService, RedisService],
  exports: [ApplicationExpireService, RedisService],
})
export class RedisModule {}
