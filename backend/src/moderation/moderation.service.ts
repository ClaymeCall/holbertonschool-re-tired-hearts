import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from '../events/events.service';
import { EventResponseDto } from '../events/dto/event-response.dto';
import { Profile, ProfileModerationStatus } from '../profiles/entities/profile.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { AccountStatus, User } from '../users/entities/user.entity';
import { UserResponseDto, toUserResponse } from '../users/dto/user-response.dto';
import {
  ModerationActionResponseDto,
  toModerationActionResponse,
} from './dto/moderation-action-response.dto';
import { ModerationAction, ModerationActionType, ModerationTargetType } from './entities/moderation-action.entity';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ModerationAction) private readonly actions: Repository<ModerationAction>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly profiles: ProfilesService,
    private readonly events: EventsService,
  ) {}

  // ---------- reading ----------

  listProfilesByStatus(status: ProfileModerationStatus): Promise<Profile[]> {
    return this.profiles.listByStatus(status);
  }

  listActions(): Promise<ModerationActionResponseDto[]> {
    return this.actions
      .find({ order: { createdAt: 'DESC' } })
      .then((rows) => rows.map(toModerationActionResponse));
  }

  // ---------- profiles ----------

  async approveProfile(moderator: User, id: number, reason?: string): Promise<Profile> {
    await this.assertNotSelfProfile(moderator, id);
    const profile = await this.profiles.approve(id);
    await this.record(moderator, ModerationTargetType.PROFILE, id, ModerationActionType.APPROVE_PROFILE, reason);
    return profile;
  }

  async blockProfile(moderator: User, id: number, reason?: string): Promise<Profile> {
    await this.assertNotSelfProfile(moderator, id);
    const profile = await this.profiles.block(id);
    await this.record(moderator, ModerationTargetType.PROFILE, id, ModerationActionType.BLOCK_PROFILE, reason);
    return profile;
  }

  async unblockProfile(moderator: User, id: number, reason?: string): Promise<Profile> {
    await this.assertNotSelfProfile(moderator, id);
    const profile = await this.profiles.unblock(id);
    await this.record(moderator, ModerationTargetType.PROFILE, id, ModerationActionType.UNBLOCK_PROFILE, reason);
    return profile;
  }

  // ---------- accounts ----------

  async suspendUser(moderator: User, id: number, reason?: string): Promise<UserResponseDto> {
    this.assertNotSelf(moderator, id);
    const user = await this.findUserOrThrow(id);
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new ConflictException(`Cannot suspend a '${user.accountStatus}' account.`);
    }
    user.accountStatus = AccountStatus.SUSPENDED;
    user.suspendedAt = new Date();
    const saved = await this.users.save(user);
    await this.record(moderator, ModerationTargetType.USER_ACCOUNT, id, ModerationActionType.SUSPEND_ACCOUNT, reason);
    return toUserResponse(saved);
  }

  async reactivateUser(moderator: User, id: number, reason?: string): Promise<UserResponseDto> {
    this.assertNotSelf(moderator, id);
    const user = await this.findUserOrThrow(id);
    if (user.accountStatus !== AccountStatus.SUSPENDED) {
      throw new ConflictException(`Cannot reactivate a '${user.accountStatus}' account.`);
    }
    user.accountStatus = AccountStatus.ACTIVE;
    user.suspendedAt = null;
    const saved = await this.users.save(user);
    await this.record(moderator, ModerationTargetType.USER_ACCOUNT, id, ModerationActionType.REACTIVATE_ACCOUNT, reason);
    return toUserResponse(saved);
  }

  // ---------- events ----------

  async cancelEvent(moderator: User, id: number, reason?: string): Promise<EventResponseDto> {
    const event = await this.events.cancelByModerator(moderator, id);
    await this.record(moderator, ModerationTargetType.EVENT, id, ModerationActionType.CANCEL_EVENT, reason);
    return event;
  }

  // ---------- helpers ----------

  // Prevent self-modification of one's own account restriction (#67): a moderator acting on
  // their own user id, even through the moderation route, is refused.
  private assertNotSelf(moderator: User, targetUserId: number): void {
    if (moderator.id === targetUserId) {
      throw new ForbiddenException('You cannot moderate your own account.');
    }
  }

  // Same rule for profile actions, resolved through the profile's owning user id.
  private async assertNotSelfProfile(moderator: User, profileId: number): Promise<void> {
    const profile = await this.profiles.findByIdForModeration(profileId);
    this.assertNotSelf(moderator, profile.userId);
  }

  private async findUserOrThrow(id: number): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Account not found.');
    }
    return user;
  }

  // Writes the audit row after the state change has already succeeded above: a rejected action
  // (404/409/403) never reaches here, so no action is ever logged without having actually
  // happened. Not wrapped in the same DB transaction as the state change itself — an audit
  // write failing after a successful, valid state change is a (rare) logging gap, not an
  // invariant violation, unlike the capacity-locking transactions in EventsService.
  private async record(
    moderator: User,
    targetType: ModerationTargetType,
    targetId: number,
    action: ModerationActionType,
    reason?: string,
  ): Promise<void> {
    await this.actions.save(
      this.actions.create({ moderatorId: moderator.id, targetType, targetId, action, reason: reason ?? null }),
    );
  }
}
