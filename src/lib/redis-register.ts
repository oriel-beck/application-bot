import { container } from '@sapphire/framework';
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost'
});

container.redis = redis;

console.log('registered redis');

declare module '@sapphire/pieces' {
  interface Container {
    redis: Redis;
  }
}
