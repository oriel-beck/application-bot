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

  // TODO: implement this
  setPendingApplicationChannel(pendingchannel: bigint, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          pendingchannel,
        },
      )
      .catch(() => null);
  }
  setAcceptedApplicationChannel(acceptedchannel: bigint, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          acceptedchannel,
        },
      )
      .catch(() => null);
  }
  setDeniedApplicationChannel(deniedchannel: bigint, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          deniedchannel,
        },
      )
      .catch(() => null);
  }
  setAcceptedMessageChannel(acceptedchannel: bigint, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          acceptedchannel,
        },
      )
      .catch(() => null);
  }
  setReportMessageChannel(reportschannel: bigint, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          reportschannel,
        },
      )
      .catch(() => null);
  }

  setManagerRole(managerrole: bigint, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          managerrole,
        },
      )
      .catch(() => null);
  }
  addAcceptedRole(roleid: bigint, guildid: bigint) {
    return this.settings
      .createQueryBuilder()
      .update()
      .set({
        acceptedrole: () => 'array_append(acceptedrole, :roleid)',
      })
      .setParameter('roleid', roleid)
      .where('guildid = :guildid', { guildid })
      .execute()
      .catch(() => null);
  }
  removeAcceptedRole(roleid: bigint, guildid: bigint) {
    return this.settings
      .createQueryBuilder()
      .update()
      .set({
        acceptedrole: () => 'array_remove(acceptedrole, :roleid)',
      })
      .setParameter('roleid', roleid)
      .where('guildid = :guildid', { guildid })
      .execute()
      .catch(() => null);
  }

  setPendingApplicationColor(pendingcolor: number, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          pendingcolor,
        },
      )
      .catch(() => null);
  }
  setDeniedApplicationColor(deniedcolor: number, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          deniedcolor,
        },
      )
      .catch(() => null);
  }
  setAcceptedApplicationColor(acceptedcolor: number, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          acceptedcolor,
        },
      )
      .catch(() => null);
  }
  setPrimaryColor(primarycolor: number, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          primarycolor,
        },
      )
      .catch(() => null);
  }

  setPrevNavigationEmoji(prevemoji: APIMessageComponentEmoji, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          prevemoji,
        },
      )
      .catch(() => null);
  }
  setNextNavigationEmoji(nextemoji: APIMessageComponentEmoji, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          nextemoji,
        },
      )
      .catch(() => null);
  }

  setWelcomeMessage(welcomemsg: string, guildid: bigint) {
    return this.settings
      .update(
        {
          guildid,
        },
        {
          welcomemsg,
        },
      )
      .catch(() => null);
  }
}
