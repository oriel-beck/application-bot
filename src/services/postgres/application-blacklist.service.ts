import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  DeleteResult,
  InsertResult,
  Repository,
  UpdateResult,
} from 'typeorm';

// typeorm entities
import { BDFDBlacklist } from '../../entities';

@Injectable()
export class DBApplicationBlacklistService {
  constructor(
    @InjectRepository(BDFDBlacklist)
    private blacklists: Repository<BDFDBlacklist>,
  ) {}

  addBlacklist(
    userid: bigint,
    reason: string,
    mod: bigint,
    guildid: bigint,
  ): Promise<InsertResult | null> {
    return this.blacklists
      .insert(
        this.blacklists.create({
          userid,
          reason,
          mod,
          guildid,
        }),
      )
      .catch(() => null);
  }

  reasonBlacklist(
    userid: bigint,
    reason: string,
    mod: bigint,
    guildid: bigint,
  ): Promise<UpdateResult | null> {
    return this.blacklists
      .update(
        {
          userid,
          guildid,
        },
        {
          userid,
          reason,
          mod,
        },
      )
      .catch(() => null);
  }

  removeBlacklist(
    userid: bigint,
    guildid: bigint,
  ): Promise<DeleteResult | null> {
    return this.blacklists
      .delete({
        userid,
        guildid,
      })
      .catch(() => null);
  }

  getBlacklist(userid: bigint, guildid: bigint): Promise<BDFDBlacklist | null> {
    return this.blacklists
      .findOneOrFail({
        where: {
          userid,
          guildid,
        },
      })
      .catch(() => null);
  }
}
