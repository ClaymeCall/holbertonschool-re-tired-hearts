import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccountStatus, User } from '../users/entities/user.entity';
import { EventRegistration, RegistrationStatus } from './entities/event-registration.entity';
import { Event, EventStatus } from './entities/event.entity';
import { EventsService } from './events.service';

const day = 86_400_000;
const user = (overrides: Partial<User> = {}) =>
  ({ id: 1, isAdmin: false, accountStatus: AccountStatus.ACTIVE, ...overrides }) as User;
const event = (overrides: Partial<Event> = {}) =>
  ({
    id: 10,
    organizerId: 2,
    mainInterestId: 3,
    capacity: 2,
    status: EventStatus.PUBLISHED,
    startsAt: new Date(Date.now() + day),
    ...overrides,
  }) as Event;

// A view row as returned by the read query.
const viewRow = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  title: 'T',
  description: 'D',
  approximateLocation: 'Lyon',
  startsAt: new Date(Date.now() + day),
  capacity: 2,
  status: EventStatus.PUBLISHED,
  registeredCount: 0,
  interestId: 3,
  interestName: 'Cooking',
  organizerId: 2,
  organizerName: 'Marie',
  isOrganizer: false,
  myRegistration: null,
  ...overrides,
});

function build({ approvedProfile = true, interestExists = true, view = viewRow() } = {}) {
  const events = {
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 10, ...value })),
    update: jest.fn(async () => ({ affected: 1 })),
    delete: jest.fn(),
  };
  const registrations = { count: jest.fn(async () => 0), update: jest.fn(async () => ({ affected: 1 })) };
  const manager = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    count: jest.fn(async () => 0),
    save: jest.fn(async (value) => value),
    create: jest.fn((_entity, value) => value),
    update: jest.fn(),
  };
  const dataSource = {
    query: jest.fn(async (sql: string): Promise<unknown[]> => {
      if (sql.includes('FROM profiles WHERE')) return approvedProfile ? [{ '?column?': 1 }] : [];
      if (sql.includes('FROM interests WHERE')) return interestExists ? [{ '?column?': 1 }] : [];
      return [view];
    }),
    transaction: jest.fn((callback) => callback(manager)),
  };
  const service = new EventsService(events as never, registrations as never, dataSource as never);
  return { service, events, registrations, manager, dataSource };
}

const createDto = (overrides = {}) => ({
  title: 'Balade',
  description: 'Une sortie',
  approximateLocation: 'Lyon',
  startsAt: new Date(Date.now() + day).toISOString(),
  capacity: 10,
  mainInterestId: 3,
  ...overrides,
});

describe('EventsService.create', () => {
  it('creates a draft whose organizer is the authenticated user', async () => {
    const { service, events } = build();
    await service.create(user({ id: 7 }), createDto());
    expect(events.save).toHaveBeenCalledWith(
      expect.objectContaining({ organizerId: 7, status: EventStatus.DRAFT, capacity: 10 }),
    );
  });

  it('refuses a suspended account', async () => {
    const { service, events } = build();
    await expect(service.create(user({ accountStatus: AccountStatus.SUSPENDED }), createDto())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(events.save).not.toHaveBeenCalled();
  });

  it('refuses a member whose profile is not approved', async () => {
    const { service } = build({ approvedProfile: false });
    await expect(service.create(user(), createDto())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a start date in the past', async () => {
    const { service } = build();
    await expect(
      service.create(user(), createDto({ startsAt: new Date(Date.now() - day).toISOString() })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses an unknown interest', async () => {
    const { service } = build({ interestExists: false });
    await expect(service.create(user(), createDto())).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('EventsService.getById', () => {
  it("answers 404 for someone else's draft, like an unknown event", async () => {
    const { service } = build({ view: viewRow({ status: EventStatus.DRAFT }) });
    await expect(service.getById(user(), 10)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('shows the draft to its organizer', async () => {
    const { service } = build({ view: viewRow({ status: EventStatus.DRAFT, isOrganizer: true }) });
    await expect(service.getById(user(), 10)).resolves.toMatchObject({ status: EventStatus.DRAFT });
  });

  it('returns the response shape of the contract', async () => {
    const { service } = build();
    await expect(service.getById(user(), 10)).resolves.toMatchObject({
      id: 10,
      mainInterest: { id: 3, name: 'Cooking' },
      organizer: { id: 2, displayName: 'Marie' },
      registeredCount: 0,
      isOrganizer: false,
      myRegistration: null,
    });
  });
});

describe('EventsService lifecycle', () => {
  it('lets only the organizer publish', async () => {
    const { service, events } = build();
    events.findOneBy.mockResolvedValue(event({ status: EventStatus.DRAFT, organizerId: 2 }));
    await expect(service.publish(user({ id: 1 }), 10)).rejects.toBeInstanceOf(NotFoundException); // hidden draft
    events.findOneBy.mockResolvedValue(event({ status: EventStatus.PUBLISHED, organizerId: 2 }));
    await expect(service.publish(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('publishes a draft', async () => {
    const { service, events } = build();
    events.findOneBy.mockResolvedValue(event({ status: EventStatus.DRAFT, organizerId: 1 }));
    await service.publish(user({ id: 1 }), 10);
    expect(events.update).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }), { status: EventStatus.PUBLISHED });
  });

  it('answers 409 when the status changed meanwhile (nothing updated)', async () => {
    const { service, events } = build();
    events.findOneBy.mockResolvedValue(event({ status: EventStatus.DRAFT, organizerId: 1 }));
    events.update.mockResolvedValue({ affected: 0 });
    await expect(service.publish(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ConflictException);
  });

  it('cancels only a published event (a draft is deleted, not cancelled)', async () => {
    const { service, events } = build();
    events.findOneBy.mockResolvedValue(event({ status: EventStatus.DRAFT, organizerId: 1 }));
    events.update.mockResolvedValue({ affected: 0 });
    await expect(service.cancel(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ConflictException);
  });

  it('completes an event only once its start date has passed', async () => {
    const { service, events } = build();
    events.findOneBy.mockResolvedValue(event({ organizerId: 1, startsAt: new Date(Date.now() + day) }));
    await expect(service.complete(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ConflictException);
    events.findOneBy.mockResolvedValue(event({ organizerId: 1, startsAt: new Date(Date.now() - day) }));
    await service.complete(user({ id: 1 }), 10);
    expect(events.update).toHaveBeenCalledWith(expect.anything(), { status: EventStatus.COMPLETED });
  });

  it('deletes only a draft without registrations', async () => {
    const { service, events, registrations } = build();
    events.findOneBy.mockResolvedValue(event({ status: EventStatus.PUBLISHED, organizerId: 1 }));
    await expect(service.remove(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ConflictException);

    events.findOneBy.mockResolvedValue(event({ status: EventStatus.DRAFT, organizerId: 1 }));
    registrations.count.mockResolvedValue(1);
    await expect(service.remove(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ConflictException);

    registrations.count.mockResolvedValue(0);
    await service.remove(user({ id: 1 }), 10);
    expect(events.delete).toHaveBeenCalledWith({ id: 10, status: EventStatus.DRAFT });
  });

  it('lets a moderator cancel any published event, regardless of organizer', async () => {
    const { service, events } = build();
    events.findOneBy.mockResolvedValue(event({ status: EventStatus.PUBLISHED, organizerId: 2 }));
    const moderator = user({ id: 99, isAdmin: true });

    await service.cancelByModerator(moderator, 10);

    expect(events.update).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }), { status: EventStatus.CANCELLED });
  });

  it('refuses to moderator-cancel an unpublished event', async () => {
    const { service, events } = build();
    events.findOneBy.mockResolvedValue(event({ status: EventStatus.DRAFT, organizerId: 2 }));
    events.update.mockResolvedValue({ affected: 0 });

    await expect(service.cancelByModerator(user({ id: 99, isAdmin: true }), 10)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('answers 404 when a moderator cancels an unknown event', async () => {
    const { service, events } = build();
    events.findOneBy.mockResolvedValue(null);

    await expect(service.cancelByModerator(user({ id: 99, isAdmin: true }), 404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('EventsService.update', () => {
  it('refuses a capacity below the registered count', async () => {
    const { service, manager } = build();
    manager.findOne.mockResolvedValue(event({ organizerId: 1 }));
    manager.count.mockResolvedValue(3);
    await expect(service.update(user({ id: 1 }), 10, { capacity: 2 })).rejects.toBeInstanceOf(ConflictException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('refuses to edit a cancelled event', async () => {
    const { service, manager } = build();
    manager.findOne.mockResolvedValue(event({ organizerId: 1, status: EventStatus.CANCELLED }));
    await expect(service.update(user({ id: 1 }), 10, { title: 'x' })).rejects.toBeInstanceOf(ConflictException);
  });

  it("refuses another member's edit", async () => {
    const { service, manager } = build();
    manager.findOne.mockResolvedValue(event({ organizerId: 2 }));
    await expect(service.update(user({ id: 1 }), 10, { title: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates only the provided fields', async () => {
    const { service, manager } = build();
    manager.findOne.mockResolvedValue(event({ organizerId: 1 }));
    await service.update(user({ id: 1 }), 10, { title: 'New title' });
    expect(manager.update).toHaveBeenCalledWith(Event, { id: 10 }, { title: 'New title' });
  });
});

describe('EventsService.register', () => {
  const lock = (manager: ReturnType<typeof build>['manager'], found: Event | null) =>
    manager.findOne.mockResolvedValue(found);

  it('registers a member and counts only registered rows', async () => {
    const { service, manager } = build();
    lock(manager, event());
    manager.findOneBy.mockResolvedValue(null);
    manager.count.mockResolvedValue(1);
    await service.register(user({ id: 1 }), 10);
    expect(manager.count).toHaveBeenCalledWith(EventRegistration, {
      where: { eventId: 10, status: RegistrationStatus.REGISTERED },
    });
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ eventId: 10, userId: 1 }));
  });

  it('locks the event row before counting', async () => {
    const { service, manager } = build();
    lock(manager, event());
    manager.findOneBy.mockResolvedValue(null);
    await service.register(user({ id: 1 }), 10);
    expect(manager.findOne).toHaveBeenCalledWith(Event, { where: { id: 10 }, lock: { mode: 'pessimistic_write' } });
  });

  it('refuses the organizer of the event', async () => {
    const { service, manager } = build();
    lock(manager, event({ organizerId: 1 }));
    await expect(service.register(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a full event', async () => {
    const { service, manager } = build();
    lock(manager, event({ capacity: 2 }));
    manager.findOneBy.mockResolvedValue(null);
    manager.count.mockResolvedValue(2);
    await expect(service.register(user({ id: 1 }), 10)).rejects.toThrow('full');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it.each([EventStatus.CANCELLED, EventStatus.COMPLETED])('refuses a %s event', async (status) => {
    const { service, manager } = build();
    lock(manager, event({ status }));
    manager.findOneBy.mockResolvedValue(null);
    await expect(service.register(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a past event', async () => {
    const { service, manager } = build();
    lock(manager, event({ startsAt: new Date(Date.now() - day) }));
    manager.findOneBy.mockResolvedValue(null);
    await expect(service.register(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a second registration', async () => {
    const { service, manager } = build();
    lock(manager, event());
    manager.findOneBy.mockResolvedValue({ status: RegistrationStatus.REGISTERED });
    await expect(service.register(user({ id: 1 }), 10)).rejects.toThrow('already registered');
  });

  it('reuses the withdrawn row instead of creating a duplicate', async () => {
    const { service, manager } = build();
    lock(manager, event());
    const row = { id: 5, eventId: 10, userId: 1, status: RegistrationStatus.WITHDRAWN };
    manager.findOneBy.mockResolvedValue(row);
    await service.register(user({ id: 1 }), 10);
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ id: 5, status: RegistrationStatus.REGISTERED }));
    expect(manager.create).not.toHaveBeenCalled();
  });

  it('refuses a suspended account or an unapproved profile before touching the database', async () => {
    const suspended = build();
    await expect(
      suspended.service.register(user({ accountStatus: AccountStatus.SUSPENDED }), 10),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(suspended.dataSource.transaction).not.toHaveBeenCalled();

    const pending = build({ approvedProfile: false });
    await expect(pending.service.register(user(), 10)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("answers 404 for an unknown event or someone else's draft", async () => {
    const { service, manager } = build();
    lock(manager, null);
    await expect(service.register(user({ id: 1 }), 10)).rejects.toBeInstanceOf(NotFoundException);
    lock(manager, event({ status: EventStatus.DRAFT, organizerId: 2 }));
    await expect(service.register(user({ id: 1 }), 10)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('EventsService.withdraw', () => {
  it('frees the place by switching the row to withdrawn', async () => {
    const { service, events, registrations } = build();
    events.findOneBy.mockResolvedValue(event());
    await service.withdraw(user({ id: 1 }), 10);
    expect(registrations.update).toHaveBeenCalledWith(
      { eventId: 10, userId: 1, status: RegistrationStatus.REGISTERED },
      { status: RegistrationStatus.WITHDRAWN },
    );
  });

  it('answers 409 without a registered row', async () => {
    const { service, events, registrations } = build();
    events.findOneBy.mockResolvedValue(event());
    registrations.update.mockResolvedValue({ affected: 0 });
    await expect(service.withdraw(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ConflictException);
  });

  it('answers 409 once the event is no longer published', async () => {
    const { service, events } = build();
    events.findOneBy.mockResolvedValue(event({ status: EventStatus.CANCELLED }));
    await expect(service.withdraw(user({ id: 1 }), 10)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('EventsService.list', () => {
  it('lists published events with the pagination envelope and escapes LIKE wildcards', async () => {
    const { service, dataSource } = build();
    dataSource.query
      .mockResolvedValueOnce([{ moderation_status: 'approved' }]) // assertCanBrowse
      .mockResolvedValueOnce([{ total: 30 }])
      .mockResolvedValueOnce([viewRow(), viewRow({ id: 11 })]);
    const result = await service.list(user({ id: 5 }), { page: 2, limit: 12, interest: 3, location: '100%_' });

    expect(result).toMatchObject({ page: 2, limit: 12, total: 30 });
    expect(result.items).toHaveLength(2);
    const [countSql, countParams] = dataSource.query.mock.calls[1] as unknown as [string, unknown[]];
    expect(countSql).toContain(`e.status = 'published'`);
    expect(countParams).toEqual([3, '%100\\%\\_%']);
    const [, pageParams] = dataSource.query.mock.calls[2] as unknown as [string, unknown[]];
    expect(pageParams).toEqual([5, 3, '%100\\%\\_%', 12, 12]); // viewer, filters, limit, offset
  });

  it('refuses to list for a blocked profile', async () => {
    const { service, dataSource } = build();
    dataSource.query.mockResolvedValueOnce([{ moderation_status: 'blocked' }]);

    await expect(service.list(user({ id: 5 }), { page: 1, limit: 12 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows listing for a pending profile', async () => {
    const { service, dataSource } = build();
    dataSource.query
      .mockResolvedValueOnce([{ moderation_status: 'pending' }])
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);

    await expect(service.list(user({ id: 5 }), { page: 1, limit: 12 })).resolves.toMatchObject({ total: 0 });
  });

  it('refuses to list for a suspended account', async () => {
    const { service } = build();

    await expect(
      service.list(user({ id: 5, accountStatus: AccountStatus.SUSPENDED }), { page: 1, limit: 12 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
