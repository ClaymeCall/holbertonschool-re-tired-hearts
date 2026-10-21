import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, User } from '../users/entities/user.entity';
import { Profile, ProfileModerationStatus } from './entities/profile.entity';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: jest.Mocked<
    Pick<ProfilesService, 'findOwn' | 'upsertOwn' | 'findApproved' | 'findByIdForViewer'>
  >;

  const user: User = {
    id: 1,
    email: 'jane@example.com',
    passwordHash: 'hashed',
    isAdmin: false,
    accountStatus: AccountStatus.ACTIVE,
    selfDeletedAt: null,
    suspendedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const profile: Profile = {
    id: 10,
    userId: user.id,
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
    service = {
      findOwn: jest.fn().mockResolvedValue(profile),
      upsertOwn: jest.fn().mockResolvedValue(profile),
      findApproved: jest.fn().mockResolvedValue([profile]),
      findByIdForViewer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: service }],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
  });

  it('me returns the full profile view, including moderation status', async () => {
    const body = await controller.me(user);

    expect(service.findOwn).toHaveBeenCalledWith(user.id);
    expect(body.moderationStatus).toBe(ProfileModerationStatus.PENDING);
  });

  it('updateMe forwards the dto to the service', async () => {
    await controller.updateMe(user, { displayName: 'Jane D.', approximateLocation: 'Lyon' });

    expect(service.upsertOwn).toHaveBeenCalledWith(user.id, {
      displayName: 'Jane D.',
      approximateLocation: 'Lyon',
    });
  });

  it('discover returns the public view, with the messaging flag but without moderation status', async () => {
    const body = await controller.discover();

    expect(body).toEqual([
      {
        id: profile.id,
        displayName: profile.displayName,
        bio: profile.bio,
        approximateLocation: profile.approximateLocation,
        messagingEnabled: profile.messagingEnabled,
        interests: [],
      },
    ]);
    expect(body[0]).not.toHaveProperty('moderationStatus');
  });

  it('findOne returns the full view when the service grants it', async () => {
    service.findByIdForViewer.mockResolvedValue({ profile, isFullView: true });

    const body = await controller.findOne(profile.id, user);

    expect(body).toHaveProperty('moderationStatus');
  });

  it('findOne returns the public view when the service does not grant full view', async () => {
    service.findByIdForViewer.mockResolvedValue({ profile, isFullView: false });

    const body = await controller.findOne(profile.id, user);

    expect(body).not.toHaveProperty('moderationStatus');
    expect(body).toHaveProperty('messagingEnabled', profile.messagingEnabled);
  });

  it('findOne exposes a disabled messaging flag in the public view', async () => {
    service.findByIdForViewer.mockResolvedValue({
      profile: { ...profile, messagingEnabled: false },
      isFullView: false,
    });

    const body = await controller.findOne(profile.id, user);

    expect(body).toHaveProperty('messagingEnabled', false);
  });
});
