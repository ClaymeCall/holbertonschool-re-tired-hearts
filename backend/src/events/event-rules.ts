import { EventStatus } from './entities/event.entity';
import { RegistrationStatus } from './entities/event-registration.entity';

// Pure business rules of docs/event-rules.md: no database, no framework, easy to test.

// Who can read an event (draft / published / cancelled / completed).
export function canViewEvent(
  event: { status: EventStatus; isOrganizer: boolean; myRegistration: RegistrationStatus | null },
  isAdmin: boolean,
): boolean {
  switch (event.status) {
    case EventStatus.PUBLISHED:
      return true;
    case EventStatus.DRAFT:
      return event.isOrganizer || isAdmin;
    default: // cancelled, completed: organizer, moderator, anyone with a registration row
      return event.isOrganizer || isAdmin || event.myRegistration !== null;
  }
}

// Why a registration cannot be accepted right now, or null when the event is open.
export function registrationClosedReason(
  event: { status: EventStatus; startsAt: Date; capacity: number },
  registeredCount: number,
  now: Date = new Date(),
): string | null {
  if (event.status !== EventStatus.PUBLISHED) return 'This event is not open for registration.';
  if (event.startsAt.getTime() <= now.getTime()) return 'This event has already started.';
  if (registeredCount >= event.capacity) return 'This event is full.';
  return null;
}
