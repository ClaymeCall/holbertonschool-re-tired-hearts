import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Interest } from '../../interests/entities/interest.entity';

// Matches the `moderation_status` enum created by the InitialSchema migration (#31).
// Visibility rules per status are documented in docs/profile-visibility-rules.md.
export enum ProfileModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  BLOCKED = 'blocked',
}

@Entity({ name: 'profiles' })
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  // 1:1 with User via a plain FK column (no ORM relation), matching the rest of this
  // codebase's style: the identity always comes from the authenticated session, never
  // by joining through an ORM relation.
  @Column({ name: 'user_id', type: 'integer', unique: true })
  userId: number;

  @Column({ name: 'display_name', type: 'varchar', length: 60 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  // City/region only — never an exact address (docs/design-decisions.md §2).
  @Column({ name: 'approximate_location', type: 'varchar', length: 100 })
  approximateLocation: string;

  // Privacy choice: whether other eligible members can start a conversation with this
  // profile (docs/messaging-rules.md). Not visible to other members on the profile itself.
  @Column({ name: 'messaging_enabled', type: 'boolean', default: true })
  messagingEnabled: boolean;

  @Column({
    name: 'moderation_status',
    type: 'enum',
    enum: ProfileModerationStatus,
    enumName: 'moderation_status',
    default: ProfileModerationStatus.PENDING,
  })
  moderationStatus: ProfileModerationStatus;

  @ManyToMany(() => Interest)
  @JoinTable({
    name: 'profile_interests',
    joinColumn: { name: 'profile_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'interest_id', referencedColumnName: 'id' },
  })
  interests: Interest[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
