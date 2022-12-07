import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class BDFDBlacklist {
  /**
   * The ID of the blacklisted user
   */
  @PrimaryColumn({ type: 'bigint' })
  userid: bigint;

  /**
   * The reason for the blacklist
   */
  @Column({ type: 'text', nullable: false })
  reason: string;

  /**
   * The ID of the mod who blacklisted
   */
  @Column({ type: 'bigint', nullable: false })
  mod: bigint;
}
