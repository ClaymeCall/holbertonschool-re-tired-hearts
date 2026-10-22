import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventsService } from '../events/events.service';
import { Profile, ProfileModerationStatus } from '../profiles/entities/profile.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { AccountStatus, User } from '../users/entities/user.entity';
import { ModerationAction } from './entities/moderation-action.entity';
import { ModerationService } from './moderation.service';

type ActionsRepoMock = { find: jest.Mock };
type UsersRepoMock = { findOneBy: jest.Mock; find: jest.Mock };
type ManagerMock = { create: jest.Mock; save: jest.Mock; update: jest.Mock; findOneBy: jest.Mock };

describe('ModerationService', () => {
  let service: ModerationService;
  let actionsRepo: ActionsRepoMock;
  let usersRepo: UsersRepoMock;
  let manager: ManagerMock;
  let profiles: jest.Mocked<
    Pick<ProfilesService, 'approve' | 'block' | 'unblock' | 'findByIdForModeration' | 'listByStatus'>
  >;
  let events: jest.Mocked<Pick<EventsService, 'cancelByModerator' | 'getById'>>;

  const moderator = { id: 99, isAdmin: true } as User;
  const targetUser = { id: 1, isAdmin: false, accountStatus: AccountStatus.ACTIVE, suspendedAt: null } as User;
  const targetProfile = { id: 10, userId: 1, moderationStatus: ProfileModerationStatus.PENDING } as Profile;

  beforeEach(async () => {
    actionsRepo = { find: jest.fn().mockResolvedValue([]) };
    usersRepo = { findOneBy: jest.fn().mockResolvedValue(targetUser), find: jest.fn().mockResolvedValue([targetUser]) };
    // The transaction's manager: state changes and the audit row both go through it.
    manager = {
      create: jest.fn((_entity, input) => ({ ...input })),
      save: jest.fn(async (input) => ({ id: 1, ...input })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOneBy: jest.fn(),
    };
    const dataSource = { transaction: jest.fn((work) => work(manager)) };
    profiles = {
      approve: jest.fn().mockResolvedValue({ ...targetProfile, moderationStatus: ProfileModerationStatus.APPROVED }),
      block: jest.fn().mockResolvedValue({ ...targetProfile, moderationStatus: ProfileModerationStatus.BLOCKED }),
      unblock: jest.fn().mockResolvedValue({ ...targetProfile, moderationStatus: ProfileModerationStatus.APPROVED }),
      findByIdForModeration: jest.fn().mockResolvedValue(targetProfile),
      listByStatus: jest.fn().mockResolvedValue([]),
    };
    events = {
      cancelByModerator: jest.fn().mockResolvedValue(undefined),
      getById: jest.fn().mockResolvedValue({ id: 7 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: getRepositoryToken(ModerationAction), useValue: actionsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: ProfilesService, useValue: profiles },
        { provide: EventsService, useValue: events },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
  });

  describe('profiles', () => {
    it('approves a profile and records the action in the same transaction', async () => {
      await service.approveProfile(moderator, 10, 'looks fine');

      expect(profiles.approve).toHaveBeenCalledWith(10, manager);
      expect(manager.save).toHaveBeenCalled();
      expect(manager.create).toHaveBeenCalledWith(
        ModerationAction,
        expect.objectContaining({ moderatorId: 99, targetId: 10, reason: 'looks fine' }),
      );
    });

    it('refuses a moderator approving their own profile', async () => {
      profiles.findByIdForModeration.mockResolvedValue({ ...targetProfile, userId: moderator.id });

      await expect(service.approveProfile(moderator, 10)).rejects.toBeInstanceOf(ForbiddenException);
      expect(profiles.approve).not.toHaveBeenCalled();
    });

    it("refuses to block another moderator's profile", async () => {
      usersRepo.findOneBy.mockResolvedValue({ ...targetUser, isAdmin: true });

      await expect(service.blockProfile(moderator, 10)).rejects.toBeInstanceOf(ForbiddenException);
      expect(profiles.block).not.toHaveBeenCalled();
    });

    it('propagates a conflict from the underlying transition without recording an action', async () => {
      profiles.block.mockRejectedValue(new ConflictException('already blocked'));

      await expect(service.blockProfile(moderator, 10)).rejects.toBeInstanceOf(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('accounts', () => {
    it('suspends an active account with a status-conditional update and records the action', async () => {
      manager.findOneBy.mockResolvedValue({ ...targetUser, accountStatus: AccountStatus.SUSPENDED });

      const result = await service.suspendUser(moderator, 1, 'reported');

      expect(result.accountStatus).toBe(AccountStatus.SUSPENDED);
      expect(manager.update).toHaveBeenCalledWith(
        User,
        { id: 1, accountStatus: AccountStatus.ACTIVE },
        expect.objectContaining({ accountStatus: AccountStatus.SUSPENDED }),
      );
      expect(manager.create).toHaveBeenCalledWith(
        ModerationAction,
        expect.objectContaining({ targetId: 1, reason: 'reported' }),
      );
    });

    it('refuses to suspend an account that is no longer active, without recording an action', async () => {
      manager.update.mockResolvedValue({ affected: 0 });
      manager.findOneBy.mockResolvedValue({ ...targetUser, accountStatus: AccountStatus.SUSPENDED });

      await expect(service.suspendUser(moderator, 1)).rejects.toBeInstanceOf(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('reactivates a suspended account, clearing suspendedAt', async () => {
      manager.findOneBy.mockResolvedValue({ ...targetUser, accountStatus: AccountStatus.ACTIVE });

      const result = await service.reactivateUser(moderator, 1);

      expect(result.accountStatus).toBe(AccountStatus.ACTIVE);
      expect(manager.update).toHaveBeenCalledWith(
        User,
        { id: 1, accountStatus: AccountStatus.SUSPENDED },
        expect.objectContaining({ suspendedAt: null }),
      );
    });

    it('refuses to moderate your own account', async () => {
      await expect(service.suspendUser(moderator, moderator.id)).rejects.toBeInstanceOf(ForbiddenException);
      expect(usersRepo.findOneBy).not.toHaveBeenCalled();
    });

    it("refuses to suspend another moderator's account", async () => {
      usersRepo.findOneBy.mockResolvedValue({ ...targetUser, isAdmin: true });

      await expect(service.suspendUser(moderator, 1)).rejects.toBeInstanceOf(ForbiddenException);
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('throws 404 for an unknown account', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);

      await expect(service.suspendUser(moderator, 404)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('events', () => {
    it('cancels an event in the audit transaction, then reads it back', async () => {
      const result = await service.cancelEvent(moderator, 7, 'spam');

      expect(events.cancelByModerator).toHaveBeenCalledWith(7, manager);
      expect(manager.create).toHaveBeenCalledWith(
        ModerationAction,
        expect.objectContaining({ targetId: 7, reason: 'spam' }),
      );
      expect(events.getById).toHaveBeenCalledWith(moderator, 7);
      expect(result).toEqual({ id: 7 });
    });
  });
});
