import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

// Matches the `account_status` enum created by the InitialSchema migration (#31).
export enum AccountStatus {
  ACTIVE = 'active',
  SELF_DELETED = 'self_deleted',
  SUSPENDED = 'suspended',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'is_admin', type: 'boolean', default: false })
  isAdmin: boolean;

  @Column({ name: 'account_status', type: 'enum', enum: AccountStatus, enumName: 'account_status' })
  accountStatus: AccountStatus;

  @Column({ name: 'self_deleted_at', type: 'timestamptz', nullable: true })
  selfDeletedAt: Date | null;

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
