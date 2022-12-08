import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class BDFDQuestion {
  /**
   * The unique UUID of the question
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The question
   */
  @Column({ type: 'text' })
  question: string;

  // TODO: make the bot multi guild
  // @Column({ type: 'bigint', nullable: false })
  // guildid: bigint;
}
