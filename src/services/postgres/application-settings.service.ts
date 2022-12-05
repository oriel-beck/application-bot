import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// typeorm entities
import { BDFDSetting } from '../../entities';

@Injectable()
export class DBApplicationSettingsService {
  constructor(
    @InjectRepository(BDFDSetting) private settings: Repository<BDFDSetting>,
  ) {
    this.settings
      .insert({
        guildid: BigInt('813707403056119808'),
      })
      .catch(() => null);
  }

  toggle(guildid: bigint) {
    return this.settings
      .createQueryBuilder()
      .update(BDFDSetting)
      .set({
        enabled: () => `NOT enabled`,
      })
      .where(`guildid = :guildid`, { guildid })
      .execute()
      .catch(() => null);
  }

  disable(guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          enabled: false,
        },
      )
      .catch(() => null);
  }

  getCurrentState(guildid: bigint) {
    return this.settings
      .findOneOrFail({
        where: {
          guildid,
        },
      })
      .catch(() => null);
  }
}
