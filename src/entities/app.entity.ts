import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ApplicationState } from '../utils';

@Entity()
export class BDFDApplication {
  // the user ID of the app creator, bigint to save space
  @PrimaryColumn({ type: 'bigint', unique: true, nullable: false })
  userid: bigint;

  // array of env defined length strings, default + random
  @Column({ type: 'text', array: true, nullable: false })
  questions: string[] = [];

  // array of env defined length strings (default empty array)
  @Column({ type: 'text', array: true, default: [] })
  answers: string[];

  // the message ID of the pending/denied/accepted/active application
  @Column({ type: 'bigint', nullable: true })
  messageid: bigint;

  // ApplicationState enum value
  @Column({ type: 'text', default: ApplicationState.Active })
  state: ApplicationState;
}
