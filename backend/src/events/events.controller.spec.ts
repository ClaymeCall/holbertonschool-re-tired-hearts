import { User } from '../users/entities/user.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

describe('EventsController', () => {
  const user = { id: 4 } as User;

  it('passes the authenticated user, never a client-supplied id, to the service', async () => {
    const service = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      register: jest.fn().mockResolvedValue({ id: 9 }),
      withdraw: jest.fn().mockResolvedValue({ id: 9 }),
    };
    const controller = new EventsController(service as unknown as EventsService);

    await controller.create(user, { title: 't' } as never);
    await controller.register(user, 9);
    await controller.withdraw(user, 9);

    expect(service.create).toHaveBeenCalledWith(user, { title: 't' });
    expect(service.register).toHaveBeenCalledWith(user, 9);
    expect(service.withdraw).toHaveBeenCalledWith(user, 9);
  });
});
