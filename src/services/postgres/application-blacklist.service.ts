import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, InsertResult, Repository, UpdateResult } from 'typeorm';

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
  ): Promise<InsertResult | null> {
    return this.blacklists
      .insert(
        this.blacklists.create({
          userid,
          reason,
          mod,
        }),
      )
      .catch(() => null);
  }

  reasonBlacklist(
    userid: bigint,
    reason: string,
    mod: bigint,
  ): Promise<UpdateResult | null> {
    return this.blacklists
      .update(
        {
          userid,
        },
        {
          userid,
          reason,
          mod,
        },
      )
      .catch(() => null);
  }

  removeBlacklist(userid: bigint): Promise<DeleteResult | null> {
    return this.blacklists
      .delete({
        userid,
      })
      .catch(() => null);
  }

  getBlacklist(userid: bigint): Promise<BDFDBlacklist | null> {
    return this.blacklists
      .findOneOrFail({
        where: {
          userid,
        },
      })
      .catch(() => null);
  }
}
