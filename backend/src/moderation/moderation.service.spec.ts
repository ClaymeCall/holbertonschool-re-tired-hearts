import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from '../events/events.service';
import { Profile, ProfileModerationStatus } from '../profiles/entities/profile.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { AccountStatus, User } from '../users/entities/user.entity';
import { ModerationAction } from './entities/moderation-action.entity';
import { ModerationService } from './moderation.service';

type ActionsRepoMock = { create: jest.Mock; save: jest.Mock; find: jest.Mock };
type UsersRepoMock = { findOneBy: jest.Mock; save: jest.Mock };

describe('ModerationService', () => {
  let service: ModerationService;
  let actionsRepo: ActionsRepoMock;
  let usersRepo: UsersRepoMock;
  let profiles: jest.Mocked<
    Pick<ProfilesService, 'approve' | 'block' | 'unblock' | 'findByIdForModeration' | 'listByStatus'>
  >;
  let events: jest.Mocked<Pick<EventsService, 'cancelByModerator'>>;

  const moderator = { id: 99, isAdmin: true } as User;
  const targetUser = { id: 1, accountStatus: AccountStatus.ACTIVE, suspendedAt: null } as User;
  const targetProfile = { id: 10, userId: 1, moderationStatus: ProfileModerationStatus.PENDING } as Profile;

  beforeEach(async () => {
    actionsRepo = {
      create: jest.fn((input) => ({ ...input })),
      save: jest.fn(async (input) => ({ id: 1, ...input })),
      find: jest.fn().mockResolvedValue([]),
    };
    usersRepo = {
      findOneBy: jest.fn().mockResolvedValue(targetUser),
      save: jest.fn(async (input) => input),
    };
    profiles = {
      approve: jest.fn().mockResolvedValue({ ...targetProfile, moderationStatus: ProfileModerationStatus.APPROVED }),
      block: jest.fn().mockResolvedValue({ ...targetProfile, moderationStatus: ProfileModerationStatus.BLOCKED }),
      unblock: jest.fn().mockResolvedValue({ ...targetProfile, moderationStatus: ProfileModerationStatus.APPROVED }),
      findByIdForModeration: jest.fn().mockResolvedValue(targetProfile),
      listByStatus: jest.fn().mockResolvedValue([]),
    };
    events = { cancelByModerator: jest.fn().mockResolvedValue({ id: 7 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: getRepositoryToken(ModerationAction), useValue: actionsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: ProfilesService, useValue: profiles },
        { provide: EventsService, useValue: events },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
  });

  describe('profiles', () => {
    it('approves a profile and records the action', async () => {
      await service.approveProfile(moderator, 10, 'looks fine');

      expect(profiles.approve).toHaveBeenCalledWith(10);
      expect(actionsRepo.save).toHaveBeenCalled();
      expect(actionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ moderatorId: 99, targetId: 10, reason: 'looks fine' }),
      );
    });

    it('refuses a moderator approving their own profile', async () => {
      profiles.findByIdForModeration.mockResolvedValue({ ...targetProfile, userId: moderator.id });

      await expect(service.approveProfile(moderator, 10)).rejects.toBeInstanceOf(ForbiddenException);
      expect(profiles.approve).not.toHaveBeenCalled();
    });

    it('propagates a conflict from the underlying transition without recording an action', async () => {
      profiles.block.mockRejectedValue(new ConflictException('already blocked'));

      await expect(service.blockProfile(moderator, 10)).rejects.toBeInstanceOf(ConflictException);
      expect(actionsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('accounts', () => {
    it('suspends an active account and records the action', async () => {
      const result = await service.suspendUser(moderator, 1, 'reported');

      expect(result.accountStatus).toBe(AccountStatus.SUSPENDED);
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ accountStatus: AccountStatus.SUSPENDED }));
      expect(actionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ targetId: 1, reason: 'reported' }),
      );
    });

    it('refuses to suspend an already-suspended account', async () => {
      usersRepo.findOneBy.mockResolvedValue({ ...targetUser, accountStatus: AccountStatus.SUSPENDED });

      await expect(service.suspendUser(moderator, 1)).rejects.toBeInstanceOf(ConflictException);
    });

    it('reactivates a suspended account, clearing suspendedAt', async () => {
      usersRepo.findOneBy.mockResolvedValue({
        ...targetUser,
        accountStatus: AccountStatus.SUSPENDED,
        suspendedAt: new Date(),
      });

      const result = await service.reactivateUser(moderator, 1);

      expect(result.accountStatus).toBe(AccountStatus.ACTIVE);
      expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ suspendedAt: null }));
    });

    it('refuses to moderate your own account', async () => {
      await expect(service.suspendUser(moderator, moderator.id)).rejects.toBeInstanceOf(ForbiddenException);
      expect(usersRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('throws 404 for an unknown account', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);

      await expect(service.suspendUser(moderator, 404)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('events', () => {
    it('cancels an event through the events service and records the action', async () => {
      await service.cancelEvent(moderator, 7, 'spam');

      expect(events.cancelByModerator).toHaveBeenCalledWith(moderator, 7);
      expect(actionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ targetId: 7, reason: 'spam' }),
      );
    });
  });
});
