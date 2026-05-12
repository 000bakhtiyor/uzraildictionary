import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LocalizedString } from '../../../common/types/localized-string.type';
import { CategoryEntity } from '../../categories/entities/category.entity';

@Entity('terms')
export class TermEntity extends BaseEntity {
  @Column({ type: 'jsonb' })
  term: LocalizedString;

  @Column({ type: 'jsonb', nullable: true })
  definition: LocalizedString | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => CategoryEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: CategoryEntity | null;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ default: false })
  isAbbreviation: boolean;

  @Column({ default: true })
  isActive: boolean;
}
