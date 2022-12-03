// eslint-disable-next-line
// @ts-ignore
// Set up a toJSON function so typeorm can deal with bigints
BigInt.prototype.toJSON = function () {
  return this.toString();
};

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap().catch(console.error);
