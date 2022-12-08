import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UpdateResult } from 'typeorm';

// typeorm entities
import { BDFDSetting } from '../../entities';

@Injectable()
export class DBApplicationSettingsService {
  logger = new Logger(DBApplicationSettingsService.name);
  constructor(
    @InjectRepository(BDFDSetting) private settings: Repository<BDFDSetting>,
  ) {}

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
    const currentState = await this.settings
      .findOneOrFail({
        where: {
          guildid,
        },
      })
      .catch((err) => this.logger.error(err));
    // init default state if no state is found
    if (!currentState) this.addIfNotExist(guildid, false);
    // return current state or default state
    return currentState ? currentState.enabled : false;
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
