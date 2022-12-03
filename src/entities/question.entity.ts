import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class BDFDQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  question: string;
}
