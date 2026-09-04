import { BaseManager } from '@lib/managers/base.manager.js';
import { Blacklist } from '@lib/types.js';
import { blacklistTable } from '../../../schema.js';
import { eq } from 'drizzle-orm';

export default class BlacklistManager extends BaseManager {
  constructor() {
    super('blacklists');
  }

  public create(userid: string, reason: string, mod: string | bigint) {
    return this.drizzle
      .insert(blacklistTable)
      .values({
        user: BigInt(userid),
        reason,
        mod: BigInt(mod)
      })
      .returning();
  }

  public delete(userid: string) {
    return this.drizzle
      .delete(blacklistTable)
      .where(eq(blacklistTable.user, BigInt(userid)))
      .returning();
  }

  public update(userid: string, field: keyof Blacklist, value: Blacklist[keyof Blacklist]) {
    return this.drizzle
      .update(blacklistTable)
      .set({
        user: BigInt(userid),
        [field]: value
      })
      .returning();
  }

  public get(userid: string) {
    return this.drizzle
      .select()
      .from(blacklistTable)
      .where(eq(blacklistTable.user, BigInt(userid)));
  }
}
