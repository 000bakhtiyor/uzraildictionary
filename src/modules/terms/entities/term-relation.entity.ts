import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RelationType } from '../../../common/enums/relation-type.enum';
import { TermEntity } from './term.entity';

@Entity('term_relations')
@Unique(['fromTermId', 'toTermId', 'type'])
export class TermRelationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  fromTermId: string;

  @ManyToOne(() => TermEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromTermId' })
  fromTerm: TermEntity;

  @Column('uuid')
  toTermId: string;

  @ManyToOne(() => TermEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toTermId' })
  toTerm: TermEntity;

  @Column({ type: 'enum', enum: RelationType })
  type: RelationType;

  @CreateDateColumn()
  createdAt: Date;
}
