import { EventStatus } from './entities/event.entity';
import { RegistrationStatus } from './entities/event-registration.entity';
import { canViewEvent, registrationClosedReason } from './event-rules';

const view = (status: EventStatus, isOrganizer = false, myRegistration: RegistrationStatus | null = null) => ({
  status,
  isOrganizer,
  myRegistration,
});

describe('canViewEvent', () => {
  it('shows a published event to every member', () => {
    expect(canViewEvent(view(EventStatus.PUBLISHED), false)).toBe(true);
  });

  it('shows a draft only to its organizer and to moderators', () => {
    expect(canViewEvent(view(EventStatus.DRAFT), false)).toBe(false);
    expect(canViewEvent(view(EventStatus.DRAFT, true), false)).toBe(true);
    expect(canViewEvent(view(EventStatus.DRAFT), true)).toBe(true);
  });

  it.each([EventStatus.CANCELLED, EventStatus.COMPLETED])(
    'shows a %s event to organizer, moderator and members with a registration row only',
    (status) => {
      expect(canViewEvent(view(status), false)).toBe(false);
      expect(canViewEvent(view(status, true), false)).toBe(true);
      expect(canViewEvent(view(status), true)).toBe(true);
      expect(canViewEvent(view(status, false, RegistrationStatus.REGISTERED), false)).toBe(true);
      expect(canViewEvent(view(status, false, RegistrationStatus.WITHDRAWN), false)).toBe(true);
    },
  );
});

describe('registrationClosedReason', () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it('accepts a published future event with a free place', () => {
    expect(registrationClosedReason({ status: EventStatus.PUBLISHED, startsAt: future, capacity: 2 }, 1)).toBeNull();
  });

  it.each([EventStatus.DRAFT, EventStatus.CANCELLED, EventStatus.COMPLETED])('refuses a %s event', (status) => {
    expect(registrationClosedReason({ status, startsAt: future, capacity: 2 }, 0)).toMatch(/not open/);
  });

  it('refuses a past event', () => {
    expect(registrationClosedReason({ status: EventStatus.PUBLISHED, startsAt: past, capacity: 2 }, 0)).toMatch(/started/);
  });

  it('refuses a full event, only registered members count', () => {
    expect(registrationClosedReason({ status: EventStatus.PUBLISHED, startsAt: future, capacity: 2 }, 2)).toMatch(/full/);
  });
});
