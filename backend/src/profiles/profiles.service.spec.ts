import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountStatus, User } from '../users/entities/user.entity';
import { InterestsService } from '../interests/interests.service';
import { Profile, ProfileModerationStatus } from './entities/profile.entity';
import { ProfilesService } from './profiles.service';

type RepoMock = { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };

describe('ProfilesService', () => {
  let service: ProfilesService;
  let repo: RepoMock;
  let interests: jest.Mocked<Pick<InterestsService, 'findByIds'>>;

  const owner: User = {
    id: 1,
    email: 'jane@example.com',
    passwordHash: 'hashed',
    isAdmin: false,
    accountStatus: AccountStatus.ACTIVE,
    selfDeletedAt: null,
    suspendedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const moderator: User = { ...owner, id: 99, isAdmin: true };
  const otherMember: User = { ...owner, id: 2 };

  const existingProfile: Profile = {
    id: 10,
    userId: owner.id,
    displayName: 'Jane D.',
    bio: null,
    approximateLocation: 'Lyon',
    messagingEnabled: true,
    moderationStatus: ProfileModerationStatus.PENDING,
    interests: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn((input) => ({ ...input })),
      save: jest.fn(async (input) => ({ id: 10, ...input })),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    interests = { findByIds: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: getRepositoryToken(Profile), useValue: repo },
        { provide: InterestsService, useValue: interests },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  describe('findOwn', () => {
    it('returns the profile when one exists', async () => {
      repo.findOne.mockResolvedValue(existingProfile);

      await expect(service.findOwn(owner.id)).resolves.toBe(existingProfile);
    });

    it('throws 404 when the member has not created a profile yet', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOwn(owner.id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('upsertOwn', () => {
    it('creates a new profile as pending when none exists', async () => {
      repo.findOne.mockResolvedValue(null);

      const profile = await service.upsertOwn(owner.id, {
        displayName: 'Jane D.',
        approximateLocation: 'Lyon',
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: owner.id,
        moderationStatus: ProfileModerationStatus.PENDING,
      });
      expect(profile.displayName).toBe('Jane D.');
      expect(profile.approximateLocation).toBe('Lyon');
      expect(profile.moderationStatus).toBe(ProfileModerationStatus.PENDING);
      expect(repo.save).toHaveBeenCalled();
    });

    it('updates the existing profile without touching its moderation status', async () => {
      repo.findOne.mockResolvedValue({ ...existingProfile, moderationStatus: ProfileModerationStatus.APPROVED });

      const profile = await service.upsertOwn(owner.id, {
        displayName: 'Jane Updated',
        approximateLocation: 'Paris',
        messagingEnabled: false,
      });

      expect(profile.displayName).toBe('Jane Updated');
      expect(profile.approximateLocation).toBe('Paris');
      expect(profile.messagingEnabled).toBe(false);
      expect(profile.moderationStatus).toBe(ProfileModerationStatus.APPROVED);
    });

    it('rejects an unknown interest id', async () => {
      repo.findOne.mockResolvedValue(null);
      interests.findByIds.mockResolvedValue([]);

      await expect(
        service.upsertOwn(owner.id, {
          displayName: 'Jane D.',
          approximateLocation: 'Lyon',
          interestIds: [999],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findApproved', () => {
    it('queries only approved profiles', async () => {
      repo.find.mockResolvedValue([existingProfile]);

      await service.findApproved();

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { moderationStatus: ProfileModerationStatus.APPROVED } }),
      );
    });
  });

  describe('findByIdForViewer', () => {
    it('gives the owner full view of their own pending profile', async () => {
      repo.findOne.mockResolvedValue(existingProfile);

      const result = await service.findByIdForViewer(existingProfile.id, owner);

      expect(result.isFullView).toBe(true);
    });

    it('gives a moderator full view of a pending profile', async () => {
      repo.findOne.mockResolvedValue(existingProfile);

      const result = await service.findByIdForViewer(existingProfile.id, moderator);

      expect(result.isFullView).toBe(true);
    });

    it('hides a pending profile from another member as 404, not 403', async () => {
      repo.findOne.mockResolvedValue(existingProfile);

      await expect(service.findByIdForViewer(existingProfile.id, otherMember)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('gives another member the public view of an approved profile', async () => {
      repo.findOne.mockResolvedValue({ ...existingProfile, moderationStatus: ProfileModerationStatus.APPROVED });

      const result = await service.findByIdForViewer(existingProfile.id, otherMember);

      expect(result.isFullView).toBe(false);
    });

    it('throws 404 for a non-existent profile id', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findByIdForViewer(404, otherMember)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
