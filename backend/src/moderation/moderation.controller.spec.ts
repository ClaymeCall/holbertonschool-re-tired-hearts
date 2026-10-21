import { User } from '../users/entities/user.entity';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

describe('ModerationController', () => {
  const moderator = { id: 99, isAdmin: true } as User;

  it('passes the authenticated moderator, never a client-supplied id, and the reason to the service', async () => {
    const service = {
      approveProfile: jest.fn().mockResolvedValue({ id: 10 }),
      blockProfile: jest.fn().mockResolvedValue({ id: 10 }),
      unblockProfile: jest.fn().mockResolvedValue({ id: 10 }),
      suspendUser: jest.fn().mockResolvedValue({ id: 2 }),
      reactivateUser: jest.fn().mockResolvedValue({ id: 2 }),
      cancelEvent: jest.fn().mockResolvedValue({ id: 7 }),
    };
    const controller = new ModerationController(service as unknown as ModerationService);

    await controller.approveProfile(moderator, 10, { reason: 'ok' });
    await controller.blockProfile(moderator, 10, {});
    await controller.unblockProfile(moderator, 10, {});
    await controller.suspendUser(moderator, 2, { reason: 'reported' });
    await controller.reactivateUser(moderator, 2, {});
    await controller.cancelEvent(moderator, 7, { reason: 'inappropriate' });

    expect(service.approveProfile).toHaveBeenCalledWith(moderator, 10, 'ok');
    expect(service.blockProfile).toHaveBeenCalledWith(moderator, 10, undefined);
    expect(service.unblockProfile).toHaveBeenCalledWith(moderator, 10, undefined);
    expect(service.suspendUser).toHaveBeenCalledWith(moderator, 2, 'reported');
    expect(service.reactivateUser).toHaveBeenCalledWith(moderator, 2, undefined);
    expect(service.cancelEvent).toHaveBeenCalledWith(moderator, 7, 'inappropriate');
  });

  it('lists profiles by status and the audit log', async () => {
    const service = {
      listProfilesByStatus: jest.fn().mockResolvedValue([]),
      listActions: jest.fn().mockResolvedValue([]),
    };
    const controller = new ModerationController(service as unknown as ModerationService);

    await controller.listProfiles({ status: 'pending' } as never);
    await controller.listActions();

    expect(service.listProfilesByStatus).toHaveBeenCalledWith('pending');
    expect(service.listActions).toHaveBeenCalled();
  });
});
