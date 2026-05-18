import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TermEntity } from './term.entity';

@Entity('term_views')
export class TermViewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  termId: string;

  @ManyToOne(() => TermEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'termId' })
  term: TermEntity;

  @CreateDateColumn()
  createdAt: Date;
}
