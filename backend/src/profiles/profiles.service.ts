import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interest } from '../interests/entities/interest.entity';
import { InterestsService } from '../interests/interests.service';
import { User } from '../users/entities/user.entity';
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

  // Discovery list: approved profiles only, per docs/profile-visibility-rules.md. Plain
  // (unpaginated) for now — pagination is #49.
  findApproved(): Promise<Profile[]> {
    return this.profiles.find({
      where: { moderationStatus: ProfileModerationStatus.APPROVED },
      relations: ['interests'],
      order: { id: 'ASC' },
    });
  }

  // A non-approved profile is 404 to anyone but its owner or a moderator — same
  // treatment as a non-existent id, so its existence is never revealed.
  async findByIdForViewer(id: number, viewer: User): Promise<ViewedProfile> {
    const profile = await this.profiles.findOne({ where: { id }, relations: ['interests'] });
    if (!profile) {
      throw new NotFoundException();
    }
    const isOwner = profile.userId === viewer.id;
    const isModerator = viewer.isAdmin;
    if (profile.moderationStatus !== ProfileModerationStatus.APPROVED && !isOwner && !isModerator) {
      throw new NotFoundException();
    }
    return { profile, isFullView: isOwner || isModerator };
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
