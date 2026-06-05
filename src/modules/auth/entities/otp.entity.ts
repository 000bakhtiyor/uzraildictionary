import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { OtpType } from '../../../common/enums/otp-type.enum';

@Entity('otp_codes')
export class OtpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ nullable: true, type: 'varchar' })
  username: string | null;

  @Column({ nullable: true, type: 'varchar' })
  passwordHash: string | null;

  @Column({ type: 'enum', enum: OtpType, default: OtpType.REGISTRATION })
  type: OtpType;

  @Column({ length: 6 })
  code: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
