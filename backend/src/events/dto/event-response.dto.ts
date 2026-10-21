import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '../entities/event.entity';
import { RegistrationStatus } from '../entities/event-registration.entity';

class InterestSummaryDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Cooking' })
  name: string;
}

class OrganizerSummaryDto {
  @ApiProperty({ example: 7, description: 'Profile id of the organizer (same id as GET /v1/profiles/:id)' })
  id: number;

  @ApiProperty({ example: 'Marie', nullable: true, description: 'Display name of the organizer profile (never the email)' })
  displayName: string | null;
}

export class EventResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ example: 'Lyon' })
  approximateLocation: string;

  @ApiProperty({ example: '2026-11-02T14:00:00.000Z' })
  startsAt: string;

  @ApiProperty({ example: 20 })
  capacity: number;

  @ApiProperty({ enum: EventStatus })
  status: EventStatus;

  @ApiProperty({ example: 6, description: 'Number of `registered` members (available places = capacity - registeredCount)' })
  registeredCount: number;

  @ApiProperty({ type: InterestSummaryDto })
  mainInterest: InterestSummaryDto;

  @ApiProperty({ type: OrganizerSummaryDto })
  organizer: OrganizerSummaryDto;

  @ApiProperty({ description: 'True when the authenticated user organizes this event' })
  isOrganizer: boolean;

  @ApiProperty({ enum: RegistrationStatus, nullable: true, description: 'Registration of the authenticated user, null if none' })
  myRegistration: RegistrationStatus | null;
}

export class EventListResponseDto {
  @ApiProperty({ type: [EventResponseDto] })
  items: EventResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 12 })
  limit: number;

  @ApiProperty({ example: 2000, description: 'Total number of events matching the filters' })
  total: number;
}

export class MyEventsResponseDto {
  @ApiProperty({ type: [EventResponseDto], description: 'Events where I am registered' })
  registered: EventResponseDto[];

  @ApiProperty({ type: [EventResponseDto], description: 'Events I organize, whatever their status' })
  organized: EventResponseDto[];
}

// Row returned by the read query of EventsService (see EventsService.VIEW_SELECT).
export interface EventViewRow {
  id: number;
  title: string;
  description: string;
  approximateLocation: string;
  startsAt: Date;
  capacity: number;
  status: EventStatus;
  registeredCount: number;
  interestId: number;
  interestName: string;
  organizerId: number; // profile id of the organizer
  organizerName: string | null;
  isOrganizer: boolean;
  myRegistration: RegistrationStatus | null;
}

export function toEventResponse(row: EventViewRow): EventResponseDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    approximateLocation: row.approximateLocation,
    startsAt: new Date(row.startsAt).toISOString(),
    capacity: row.capacity,
    status: row.status,
    registeredCount: row.registeredCount,
    mainInterest: { id: row.interestId, name: row.interestName },
    organizer: { id: row.organizerId, displayName: row.organizerName },
    isOrganizer: row.isOrganizer,
    myRegistration: row.myRegistration,
  };
}
