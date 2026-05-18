import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { TermEntity } from '../../terms/entities/term.entity';

@Entity('favorites')
@Unique(['userId', 'termId'])
export class FavoriteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column('uuid')
  termId: string;

  @ManyToOne(() => TermEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'termId' })
  term: TermEntity;

  @CreateDateColumn()
  createdAt: Date;
}
