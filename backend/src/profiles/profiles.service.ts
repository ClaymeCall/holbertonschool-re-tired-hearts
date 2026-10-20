import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interest } from '../interests/entities/interest.entity';
import { InterestsService } from '../interests/interests.service';
import { AccountStatus, User } from '../users/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile, ProfileModerationStatus } from './entities/profile.entity';

export interface ViewedProfile {
  profile: Profile;
  // Whether the caller may see the full (owner/moderator) field set rather than the
  // public discovery view — see docs/profile-visibility-rules.md.
  isFullView: boolean;
}

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly interests: InterestsService,
  ) {}

  // 404, not an empty shape: the Vue profile form uses this to decide between "create"
  // and "edit" mode.
  async findOwn(userId: number): Promise<Profile> {
    const profile = await this.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Profile not created yet');
    }
    return profile;
  }

  // Creates the profile on first call, updates it on every later call — there is no
  // separate POST route (docs/api-conventions.md): a member fills in their profile once
  // after registering, not at registration itself. A new profile always starts `pending`,
  // never discoverable until a moderator approves it (docs/design-decisions.md §4).
  async upsertOwn(userId: number, dto: UpdateProfileDto): Promise<Profile> {
    const interests =
      dto.interestIds !== undefined ? await this.resolveInterests(dto.interestIds) : undefined;

    let profile = await this.findByUserId(userId);
    if (!profile) {
      profile = this.profiles.create({ userId, moderationStatus: ProfileModerationStatus.PENDING });
    }
    profile.displayName = dto.displayName;
    profile.bio = dto.bio ?? null;
    profile.approximateLocation = dto.approximateLocation;
    if (dto.messagingEnabled !== undefined) {
      profile.messagingEnabled = dto.messagingEnabled;
    }
    if (interests !== undefined) {
      profile.interests = interests;
    }
    return this.profiles.save(profile);
  }

  // Discovery list: approved profiles only, per docs/profile-visibility-rules.md. Also
  // excludes profiles owned by a self_deleted account (same doc, "Who can see a profile
  // at all") — a self_deleted account's profile is never discoverable, regardless of
  // moderation_status. Plain (unpaginated) for now — pagination is #49.
  findApproved(): Promise<Profile[]> {
    return this.profiles
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.interests', 'interest')
      .innerJoin(User, 'owner', 'owner.id = profile.userId')
      .where('profile.moderationStatus = :status', { status: ProfileModerationStatus.APPROVED })
      .andWhere('owner.accountStatus != :selfDeleted', { selfDeleted: AccountStatus.SELF_DELETED })
      .orderBy('profile.id', 'ASC')
      .getMany();
  }

  // A non-approved profile, or one owned by a self_deleted account, is 404 to anyone but
  // its owner or a moderator — same treatment as a non-existent id, so its existence is
  // never revealed (docs/profile-visibility-rules.md).
  async findByIdForViewer(id: number, viewer: User): Promise<ViewedProfile> {
    const profile = await this.profiles.findOne({ where: { id }, relations: ['interests'] });
    if (!profile) {
      throw new NotFoundException();
    }
    const isOwner = profile.userId === viewer.id;
    const isModerator = viewer.isAdmin;
    if (!isOwner && !isModerator) {
      if (profile.moderationStatus !== ProfileModerationStatus.APPROVED) {
        throw new NotFoundException();
      }
      const owner = await this.users.findOneBy({ id: profile.userId });
      if (owner?.accountStatus === AccountStatus.SELF_DELETED) {
        throw new NotFoundException();
      }
    }
    return { profile, isFullView: isOwner || isModerator };
  }

  // ---------- moderation (Phase 4, #64/#65/#66) ----------

  // A moderator can see a profile in any status by its id — unlike findByIdForViewer, there is
  // no visibility filtering here, since the caller is already known to be a moderator.
  async findByIdForModeration(id: number): Promise<Profile> {
    const profile = await this.profiles.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Profile not found.');
    }
    return profile;
  }

  listByStatus(status: ProfileModerationStatus): Promise<Profile[]> {
    return this.profiles.find({
      where: { moderationStatus: status },
      relations: ['interests'],
      order: { id: 'ASC' },
    });
  }

  // `pending -> approved` only: a blocked profile is restored via unblock(), not approve()
  // (docs/design-decisions.md §4 "Allowed transitions").
  approve(id: number): Promise<Profile> {
    return this.transitionModerationStatus(
      id,
      [ProfileModerationStatus.PENDING],
      ProfileModerationStatus.APPROVED,
    );
  }

  // `pending -> blocked` or `approved -> blocked`: both are recorded as the same `block_profile`
  // action (docs/design-decisions.md §4).
  block(id: number): Promise<Profile> {
    return this.transitionModerationStatus(
      id,
      [ProfileModerationStatus.PENDING, ProfileModerationStatus.APPROVED],
      ProfileModerationStatus.BLOCKED,
    );
  }

  // `blocked -> approved`: unblocking always restores `approved`, never `pending`.
  unblock(id: number): Promise<Profile> {
    return this.transitionModerationStatus(
      id,
      [ProfileModerationStatus.BLOCKED],
      ProfileModerationStatus.APPROVED,
    );
  }

  private async transitionModerationStatus(
    id: number,
    from: ProfileModerationStatus[],
    to: ProfileModerationStatus,
  ): Promise<Profile> {
    const profile = await this.findByIdForModeration(id);
    if (!from.includes(profile.moderationStatus)) {
      throw new ConflictException(`Cannot move a '${profile.moderationStatus}' profile to '${to}'.`);
    }
    profile.moderationStatus = to;
    return this.profiles.save(profile);
  }

  private findByUserId(userId: number): Promise<Profile | null> {
    return this.profiles.findOne({ where: { userId }, relations: ['interests'] });
  }

  private async resolveInterests(ids: number[]): Promise<Interest[]> {
    const found = await this.interests.findByIds(ids);
    if (found.length !== new Set(ids).size) {
      throw new BadRequestException('Unknown interest id');
    }
    return found;
  }
}
