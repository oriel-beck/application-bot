import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class BDFDBlacklist {
  @PrimaryColumn({ type: 'bigint' })
  userid: bigint;

  @Column({ type: 'text', nullable: false })
  reason: string;

  @Column({ type: 'bigint', nullable: false })
  mod: bigint;
}
