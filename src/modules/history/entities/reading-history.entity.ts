import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TermEntity } from '../../terms/entities/term.entity';

@Entity('reading_history')
@Unique(['userId', 'termId'])
export class ReadingHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  termId: string;

  @ManyToOne(() => TermEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'termId' })
  term: TermEntity;

  @Column({ type: 'int', default: 1 })
  viewsCount: number;

  @CreateDateColumn()
  firstViewedAt: Date;

  @UpdateDateColumn()
  lastViewedAt: Date;
}
