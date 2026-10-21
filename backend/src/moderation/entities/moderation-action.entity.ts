import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Matches the `moderation_actions` table and its two enums, already created by the
// InitialSchema migration (#31) ahead of this module. Audit log only: never passwords or
// private message content (docs/data-model.md's ModerationAction).
export enum ModerationTargetType {
  PROFILE = 'profile',
  USER_ACCOUNT = 'user_account',
  EVENT = 'event',
}

export enum ModerationActionType {
  APPROVE_PROFILE = 'approve_profile',
  BLOCK_PROFILE = 'block_profile',
  UNBLOCK_PROFILE = 'unblock_profile',
  SUSPEND_ACCOUNT = 'suspend_account',
  REACTIVATE_ACCOUNT = 'reactivate_account',
  CANCEL_EVENT = 'cancel_event',
}

@Entity({ name: 'moderation_actions' })
export class ModerationAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'moderator_id', type: 'integer' })
  moderatorId: number;

  @Column({ name: 'target_type', type: 'enum', enum: ModerationTargetType, enumName: 'moderation_target_type' })
  targetType: ModerationTargetType;

  @Column({ name: 'target_id', type: 'integer' })
  targetId: number;

  @Column({ type: 'enum', enum: ModerationActionType, enumName: 'moderation_action_type' })
  action: ModerationActionType;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
