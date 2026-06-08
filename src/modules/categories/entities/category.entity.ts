import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LocalizedString } from '../../../common/types/localized-string.type';

@Entity('categories')
export class CategoryEntity extends BaseEntity {
  @Column({ type: 'jsonb' })
  name: LocalizedString;

  @Column({ type: 'varchar', unique: true, nullable: true })
  slug: string | null;

  @Column({ type: 'jsonb', nullable: true })
  description: LocalizedString | null;

  @Column({ default: true })
  isActive: boolean;
}
