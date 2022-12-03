import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class BDFDSetting {
  @PrimaryColumn({ type: 'bigint', unique: true })
  guildid: bigint;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;
}
