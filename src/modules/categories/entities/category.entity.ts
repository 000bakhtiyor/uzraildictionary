import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LocalizedString } from '../../../common/types/localized-string.type';

@Entity('categories')
export class CategoryEntity extends BaseEntity {
  @Column({ type: 'jsonb' })
  name: LocalizedString;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'jsonb', nullable: true })
  description: LocalizedString | null;

  @Column({ default: true })
  isActive: boolean;
}
