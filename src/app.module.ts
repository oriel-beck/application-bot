import { Module } from '@nestjs/common';
import { NecordModule } from 'necord';
import { GatewayIntentBits, Partials } from 'discord.js';
import { TypeOrmModule } from '@nestjs/typeorm';

// config env
import { ConfigModule, ConfigService } from '@nestjs/config';
import { default as config } from './config';

// main modules
import { EventsModule } from './events';
import { CommandsModule } from './commands';
import { ComponentsModule } from './components';

// typeorm entities
import {
  BDFDApplication,
  BDFDBlacklist,
  BDFDQuestion,
  BDFDSetting,
} from './entities';

@Module({
  imports: [
    // enable env
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    // enabled postgres
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_USERNAME'),
        host: configService.get('DB_HOST'),
        entities: [BDFDApplication, BDFDQuestion, BDFDSetting, BDFDBlacklist],
        synchronize: true,
      }),
    }),
    // enable bot
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get('BOT_TOKEN'),
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent,
        ],
        partials: [Partials.Channel, Partials.Message, Partials.User],
      }),
    }),
    // enable events
    EventsModule,
    // enable commands
    CommandsModule,
    // enable components
    ComponentsModule,
  ],
})
export class AppModule {}
