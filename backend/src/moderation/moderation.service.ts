import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
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
import { ModeratedProfile } from './dto/moderation-profile-response.dto';
import { ModerationAction, ModerationActionType, ModerationTargetType } from './entities/moderation-action.entity';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ModerationAction) private readonly actions: Repository<ModerationAction>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly profiles: ProfilesService,
    private readonly events: EventsService,
    private readonly dataSource: DataSource,
  ) {}

  // ---------- reading ----------

  async listProfilesByStatus(status: ProfileModerationStatus): Promise<ModeratedProfile[]> {
    const profiles = await this.profiles.listByStatus(status);
    if (profiles.length === 0) {
      return [];
    }
    const owners = await this.users.find({ where: { id: In(profiles.map((p) => p.userId)) } });
    const statusOf = new Map(owners.map((u) => [u.id, u.accountStatus]));
    // Every profile has an owner (FK): a missing row would be a data integrity error.
    return profiles.map((p) => Object.assign(p, { accountStatus: statusOf.get(p.userId) as AccountStatus }));
  }

  listActions(): Promise<ModerationActionResponseDto[]> {
    return this.actions
      .find({ order: { createdAt: 'DESC' } })
      .then((rows) => rows.map(toModerationActionResponse));
  }

  // ---------- profiles ----------

  async approveProfile(moderator: User, id: number, reason?: string): Promise<ModeratedProfile> {
    await this.assertCanModerateProfile(moderator, id);
    const profile = await this.dataSource.transaction(async (manager) => {
      const approved = await this.profiles.approve(id, manager);
      await this.record(manager, moderator, ModerationTargetType.PROFILE, id, ModerationActionType.APPROVE_PROFILE, reason);
      return approved;
    });
    return this.withAccountStatus(profile);
  }

  async blockProfile(moderator: User, id: number, reason?: string): Promise<ModeratedProfile> {
    await this.assertCanModerateProfile(moderator, id);
    const profile = await this.dataSource.transaction(async (manager) => {
      const blocked = await this.profiles.block(id, manager);
      await this.record(manager, moderator, ModerationTargetType.PROFILE, id, ModerationActionType.BLOCK_PROFILE, reason);
      return blocked;
    });
    return this.withAccountStatus(profile);
  }

  async unblockProfile(moderator: User, id: number, reason?: string): Promise<ModeratedProfile> {
    await this.assertCanModerateProfile(moderator, id);
    const profile = await this.dataSource.transaction(async (manager) => {
      const unblocked = await this.profiles.unblock(id, manager);
      await this.record(manager, moderator, ModerationTargetType.PROFILE, id, ModerationActionType.UNBLOCK_PROFILE, reason);
      return unblocked;
    });
    return this.withAccountStatus(profile);
  }

  // ---------- accounts ----------

  async suspendUser(moderator: User, id: number, reason?: string): Promise<UserResponseDto> {
    await this.assertCanModerate(moderator, id);
    return this.dataSource.transaction(async (manager) => {
      const user = await this.transitionAccountStatus(
        manager,
        id,
        AccountStatus.ACTIVE,
        { accountStatus: AccountStatus.SUSPENDED, suspendedAt: new Date() },
        'suspend',
      );
      await this.record(manager, moderator, ModerationTargetType.USER_ACCOUNT, id, ModerationActionType.SUSPEND_ACCOUNT, reason);
      return toUserResponse(user);
    });
  }

  async reactivateUser(moderator: User, id: number, reason?: string): Promise<UserResponseDto> {
    await this.assertCanModerate(moderator, id);
    return this.dataSource.transaction(async (manager) => {
      const user = await this.transitionAccountStatus(
        manager,
        id,
        AccountStatus.SUSPENDED,
        { accountStatus: AccountStatus.ACTIVE, suspendedAt: null },
        'reactivate',
      );
      await this.record(manager, moderator, ModerationTargetType.USER_ACCOUNT, id, ModerationActionType.REACTIVATE_ACCOUNT, reason);
      return toUserResponse(user);
    });
  }

  // ---------- events ----------

  async cancelEvent(moderator: User, id: number, reason?: string): Promise<EventResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      await this.events.cancelByModerator(id, manager);
      await this.record(manager, moderator, ModerationTargetType.EVENT, id, ModerationActionType.CANCEL_EVENT, reason);
    });
    // Read back after commit: getById uses its own connection, which would not see the change yet.
    return this.events.getById(moderator, id);
  }

  // ---------- helpers ----------

  // A moderator cannot act on their own account (#67) nor on another moderator's: a moderator
  // could otherwise lock the others out. Restricting a moderator is a direct database operation,
  // outside the API (docs/role-assignment-rules.md).
  private async assertCanModerate(moderator: User, targetUserId: number): Promise<void> {
    if (moderator.id === targetUserId) {
      throw new ForbiddenException('You cannot moderate your own account.');
    }
    const target = await this.findUserOrThrow(targetUserId);
    if (target.isAdmin) {
      throw new ForbiddenException("You cannot moderate another moderator's account.");
    }
  }

  // Same rule for profile actions, resolved through the profile's owning user.
  private async assertCanModerateProfile(moderator: User, profileId: number): Promise<void> {
    const profile = await this.profiles.findByIdForModeration(profileId);
    await this.assertCanModerate(moderator, profile.userId);
  }

  // Read after commit, like cancelEvent: the account is not touched by a profile action, so this
  // is the status the moderator's screen needs to offer suspend or reactivate.
  private async withAccountStatus(profile: Profile): Promise<ModeratedProfile> {
    const owner = await this.findUserOrThrow(profile.userId);
    return Object.assign(profile, { accountStatus: owner.accountStatus });
  }

  private async findUserOrThrow(id: number): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Account not found.');
    }
    return user;
  }

  // The current status is part of the WHERE clause: if another moderator changed it meanwhile,
  // nothing is updated and the request gets 409 (same pattern as EventsService.transition()).
  private async transitionAccountStatus(
    manager: EntityManager,
    id: number,
    from: AccountStatus,
    changes: Pick<User, 'accountStatus' | 'suspendedAt'>,
    verb: string,
  ): Promise<User> {
    const result = await manager.update(User, { id, accountStatus: from }, changes);
    const user = await manager.findOneBy(User, { id });
    if (!user) {
      throw new NotFoundException('Account not found.');
    }
    if (!result.affected) {
      throw new ConflictException(`Cannot ${verb} a '${user.accountStatus}' account.`);
    }
    return user;
  }

  // Written in the same transaction as the state change: a rejected action (404/409/403) rolls
  // back before reaching here, and a failed audit write rolls the state change back, so the log
  // holds exactly the moderation actions that actually happened.
  private async record(
    manager: EntityManager,
    moderator: User,
    targetType: ModerationTargetType,
    targetId: number,
    action: ModerationActionType,
    reason?: string,
  ): Promise<void> {
    await manager.save(
      manager.create(ModerationAction, { moderatorId: moderator.id, targetType, targetId, action, reason: reason ?? null }),
    );
  }
}
