import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class BDFDSetting {
  /**
   * The guild ID for this configuration
   */
  @PrimaryColumn({ type: 'bigint', unique: true })
  guildid: bigint;

  /**
   * The state of the applications
   */
  @Column({ type: 'boolean', default: false })
  enabled: boolean;
}
