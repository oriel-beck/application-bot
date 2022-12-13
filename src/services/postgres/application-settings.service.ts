import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UpdateResult } from 'typeorm';

// typeorm entities
import { BDFDSetting } from '../../entities';
import { APIMessageComponentEmoji } from 'discord.js';

@Injectable()
export class DBApplicationSettingsService {
  logger = new Logger(DBApplicationSettingsService.name);
  constructor(
    @InjectRepository(BDFDSetting) private settings: Repository<BDFDSetting>,
  ) {}

  async getConfig(guildid: bigint) {
    const settings = await this.settings
      .findOneOrFail({ where: { guildid } })
      .catch(() => null);

    if (!settings) this.addIfNotExist(guildid, false);
    return this.settings.create({
      guildid,
    });
  }

  async toggle(guildid: bigint) {
    const data: UpdateResult | void = await this.settings
      .createQueryBuilder()
      .update(BDFDSetting)
      .set({
        enabled: () => `NOT enabled`,
      })
      .where(`guildid = :guildid`, { guildid })
      .execute()
      .catch((err) => this.logger.error(err));
    if (!data || !data.affected) {
      this.addIfNotExist(guildid, true);
    }
  }

  async getCurrentState(guildid: bigint) {
    const currentConfig = await this.getConfig(guildid);
    // return current state or default state
    return currentConfig.enabled;
  }

  addIfNotExist(guildid: bigint, enabled: boolean) {
    this.settings
      .insert(
        this.settings.create({
          enabled,
        }),
      )
      .catch((err) => this.logger.error(err));
  }
}
