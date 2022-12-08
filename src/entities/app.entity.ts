import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ApplicationState } from '../constants';

@Entity()
export class BDFDApplication {
  /**
   * The user ID of the app creator
   */
  @PrimaryColumn({ type: 'bigint', unique: true, nullable: false })
  userid: bigint;

  /**
   * Array of config defined length strings, default + random
   */
  @Column({ type: 'text', array: true, nullable: false })
  questions: string[] = [];

  /**
   * Array of config defined length strings (default empty array)
   */
  @Column({ type: 'text', array: true, default: [] })
  answers: string[];

  /**
   * The message ID of the pending/denied/accepted/active application
   */
  @Column({ type: 'bigint', nullable: true })
  messageid: bigint;

  /**
   * ApplicationState enum value
   */
  @Column({ type: 'text', default: ApplicationState.Active })
  state: ApplicationState;

  // TODO: make the bot multi guild
  // @Column({ type: 'bigint', nullable: false })
  // guildid: bigint;
}
