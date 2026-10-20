import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AccountStatus, User } from '../users/entities/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import {
  EventListResponseDto,
  EventResponseDto,
  EventViewRow,
  MyEventsResponseDto,
  toEventResponse,
} from './dto/event-response.dto';
import { ListEventsQuery } from './dto/list-events.query';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventRegistration, RegistrationStatus } from './entities/event-registration.entity';
import { Event, EventStatus } from './entities/event.entity';
import { canViewEvent, registrationClosedReason } from './event-rules';

@Injectable()
export class EventsService {
  // Read model of an event, seen by the user whose id is $1: counts the `registered` rows and
  // adds the viewer-specific fields (isOrganizer, myRegistration). It reads the `interests` and
  // `profiles` tables directly so this module does not depend on their entities.
  private static readonly VIEW_SELECT = `
    SELECT e.id, e.title, e.description,
           e.approximate_location AS "approximateLocation",
           e.starts_at AS "startsAt",
           e.capacity, e.status,
           (SELECT count(*)::int FROM event_registrations r
             WHERE r.event_id = e.id AND r.status = 'registered') AS "registeredCount",
           i.id AS "interestId", i.name AS "interestName",
           e.organizer_id AS "organizerId", p.display_name AS "organizerName",
           (e.organizer_id = $1) AS "isOrganizer",
           (SELECT r.status FROM event_registrations r
             WHERE r.event_id = e.id AND r.user_id = $1) AS "myRegistration"
    FROM events e
    JOIN interests i ON i.id = e.main_interest_id
    LEFT JOIN profiles p ON p.user_id = e.organizer_id`;

  constructor(
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(EventRegistration) private readonly registrations: Repository<EventRegistration>,
    private readonly dataSource: DataSource,
  ) {}

  // ---------- reading ----------

  async list(user: User, query: ListEventsQuery): Promise<EventListResponseDto> {
    const { page, limit } = query;
    const filters = (firstIndex: number) => {
      const conditions = [`e.status = 'published'`];
      const params: unknown[] = [];
      if (query.interest !== undefined) {
        params.push(query.interest);
        conditions.push(`e.main_interest_id = $${firstIndex + params.length - 1}`);
      }
      if (query.location) {
        // Escape LIKE wildcards so "100%" or "a_b" are searched literally.
        params.push(`%${query.location.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`);
        conditions.push(`lower(e.approximate_location) LIKE $${firstIndex + params.length - 1}`);
      }
      return { where: conditions.join(' AND '), params };
    };

    const count = filters(1);
    const [{ total }] = await this.dataSource.query(
      `SELECT count(*)::int AS total FROM events e WHERE ${count.where}`,
      count.params,
    );

    const page$ = filters(2);
    const rows: EventViewRow[] = await this.dataSource.query(
      `${EventsService.VIEW_SELECT}
       WHERE ${page$.where}
       ORDER BY e.starts_at ASC, e.id ASC
       LIMIT $${2 + page$.params.length} OFFSET $${3 + page$.params.length}`,
      [user.id, ...page$.params, limit, (page - 1) * limit],
    );

    return { items: rows.map(toEventResponse), page, limit, total };
  }

  async getById(user: User, id: number): Promise<EventResponseDto> {
    const [row]: EventViewRow[] = await this.dataSource.query(
      `${EventsService.VIEW_SELECT} WHERE e.id = $2`,
      [user.id, id],
    );
    // A draft of someone else answers 404, exactly like an unknown id: its existence is not revealed.
    if (!row || !canViewEvent(row, user.isAdmin)) {
      throw new NotFoundException('Event not found.');
    }
    return toEventResponse(row);
  }

  async listMine(user: User): Promise<MyEventsResponseDto> {
    const registered: EventViewRow[] = await this.dataSource.query(
      `${EventsService.VIEW_SELECT}
       WHERE EXISTS (SELECT 1 FROM event_registrations r
                      WHERE r.event_id = e.id AND r.user_id = $1 AND r.status = 'registered')
       ORDER BY e.starts_at ASC, e.id ASC`,
      [user.id],
    );
    const organized: EventViewRow[] = await this.dataSource.query(
      `${EventsService.VIEW_SELECT}
       WHERE e.organizer_id = $1
       ORDER BY e.starts_at ASC, e.id ASC`,
      [user.id],
    );
    return { registered: registered.map(toEventResponse), organized: organized.map(toEventResponse) };
  }

  // ---------- writing (organizer) ----------

  async create(user: User, dto: CreateEventDto): Promise<EventResponseDto> {
    await this.assertCanParticipate(user);
    const startsAt = this.parseFutureDate(dto.startsAt);
    await this.assertInterestExists(dto.mainInterestId);

    // The organizer comes from the session, never from the request body.
    const event = await this.events.save(
      this.events.create({
        organizerId: user.id,
        mainInterestId: dto.mainInterestId,
        title: dto.title,
        description: dto.description,
        approximateLocation: dto.approximateLocation,
        startsAt,
        capacity: dto.capacity,
        status: EventStatus.DRAFT,
      }),
    );
    return this.getById(user, event.id);
  }

  async update(user: User, id: number, dto: UpdateEventDto): Promise<EventResponseDto> {
    if (dto.startsAt !== undefined) this.parseFutureDate(dto.startsAt);
    if (dto.mainInterestId !== undefined) await this.assertInterestExists(dto.mainInterestId);

    // The event row is locked so that a registration cannot slip in between the capacity check
    // and the update.
    await this.dataSource.transaction(async (manager) => {
      const event = await manager.findOne(Event, { where: { id }, lock: { mode: 'pessimistic_write' } });
      this.assertOwner(event, user);
      if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.PUBLISHED) {
        throw new ConflictException('A cancelled or completed event cannot be edited.');
      }
      if (dto.capacity !== undefined) {
        const registeredCount = await manager.count(EventRegistration, {
          where: { eventId: id, status: RegistrationStatus.REGISTERED },
        });
        if (dto.capacity < registeredCount) {
          throw new ConflictException('The capacity cannot be lower than the number of registered members.');
        }
      }
      await manager.update(Event, { id }, {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.approximateLocation !== undefined && { approximateLocation: dto.approximateLocation }),
        ...(dto.startsAt !== undefined && { startsAt: new Date(dto.startsAt) }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.mainInterestId !== undefined && { mainInterestId: dto.mainInterestId }),
      });
    });
    return this.getById(user, id);
  }

  async publish(user: User, id: number): Promise<EventResponseDto> {
    const event = await this.events.findOneBy({ id });
    this.assertOwner(event, user);
    if (event.startsAt.getTime() <= Date.now()) {
      throw new ConflictException('An event that has already started cannot be published.');
    }
    await this.transition(event, [EventStatus.DRAFT], EventStatus.PUBLISHED, 'Only a draft can be published.');
    return this.getById(user, id);
  }

  // Cancelling by the organizer. A moderator cancels through the audited moderation route (Phase 4).
  async cancel(user: User, id: number): Promise<EventResponseDto> {
    const event = await this.events.findOneBy({ id });
    this.assertOwner(event, user);
    await this.transition(
      event,
      [EventStatus.PUBLISHED],
      EventStatus.CANCELLED,
      'Only a published event can be cancelled (delete a draft instead).',
    );
    return this.getById(user, id);
  }

  async complete(user: User, id: number): Promise<EventResponseDto> {
    const event = await this.events.findOneBy({ id });
    this.assertOwner(event, user);
    if (event.startsAt.getTime() > Date.now()) {
      throw new ConflictException('An event can be completed only once its start date has passed.');
    }
    await this.transition(event, [EventStatus.PUBLISHED], EventStatus.COMPLETED, 'Only a published event can be completed.');
    return this.getById(user, id);
  }

  async remove(user: User, id: number): Promise<void> {
    const event = await this.events.findOneBy({ id });
    this.assertOwner(event, user);
    if (event.status !== EventStatus.DRAFT) {
      throw new ConflictException('Only a draft can be deleted: cancel a published event instead.');
    }
    if ((await this.registrations.count({ where: { eventId: id } })) > 0) {
      throw new ConflictException('An event with registrations cannot be deleted.');
    }
    await this.events.delete({ id, status: EventStatus.DRAFT });
  }

  // ---------- registrations (member) ----------

  async register(user: User, id: number): Promise<EventResponseDto> {
    await this.assertCanParticipate(user);

    // One transaction that locks the event row: the capacity check and the write cannot be
    // interleaved with another registration for the same event.
    await this.dataSource.transaction(async (manager) => {
      const event = await manager.findOne(Event, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!event || (event.status === EventStatus.DRAFT && event.organizerId !== user.id)) {
        throw new NotFoundException('Event not found.');
      }
      if (event.organizerId === user.id) {
        throw new ForbiddenException('You cannot register for your own event.');
      }
      const existing = await manager.findOneBy(EventRegistration, { eventId: id, userId: user.id });
      const registeredCount = await manager.count(EventRegistration, {
        where: { eventId: id, status: RegistrationStatus.REGISTERED },
      });

      const closed = registrationClosedReason(event, registeredCount);
      if (closed) throw new ConflictException(closed);
      if (existing?.status === RegistrationStatus.REGISTERED) {
        throw new ConflictException('You are already registered for this event.');
      }

      if (existing) {
        existing.status = RegistrationStatus.REGISTERED; // re-register: reuse the same row
        await manager.save(existing);
      } else {
        await manager.save(manager.create(EventRegistration, { eventId: id, userId: user.id }));
      }
    });
    return this.getById(user, id);
  }

  async withdraw(user: User, id: number): Promise<EventResponseDto> {
    const event = await this.events.findOneBy({ id });
    if (!event || (event.status === EventStatus.DRAFT && event.organizerId !== user.id)) {
      throw new NotFoundException('Event not found.');
    }
    if (event.status !== EventStatus.PUBLISHED) {
      throw new ConflictException('You can only withdraw from a published event.');
    }
    const result = await this.registrations.update(
      { eventId: id, userId: user.id, status: RegistrationStatus.REGISTERED },
      { status: RegistrationStatus.WITHDRAWN },
    );
    if (!result.affected) {
      throw new ConflictException('You are not registered for this event.');
    }
    return this.getById(user, id);
  }

  // ---------- helpers ----------

  // Account `active` and profile `approved` are required to create or register. The account
  // check will also be covered by ActiveAccountGuard (#42); it is kept here so the rule holds
  // whatever the guards of the route.
  private async assertCanParticipate(user: User): Promise<void> {
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Your account is not active.');
    }
    const [approved] = await this.dataSource.query(
      `SELECT 1 FROM profiles WHERE user_id = $1 AND moderation_status = 'approved'`,
      [user.id],
    );
    if (!approved) {
      throw new ForbiddenException('Your profile must be approved first.');
    }
  }

  // 404 when the caller cannot even see the event (someone else's draft, unknown id), 403 when
  // the event is visible but belongs to another organizer.
  private assertOwner(event: Event | null, user: User): asserts event is Event {
    if (!event) throw new NotFoundException('Event not found.');
    if (event.organizerId === user.id) return;
    if (event.status === EventStatus.DRAFT && !user.isAdmin) {
      throw new NotFoundException('Event not found.');
    }
    throw new ForbiddenException('Only the organizer can do this.');
  }

  private async transition(event: Event, from: EventStatus[], to: EventStatus, message: string): Promise<void> {
    // The status is part of the WHERE clause: if another request changed it meanwhile, nothing is updated.
    const result = await this.events.update({ id: event.id, status: In(from) }, { status: to });
    if (!result.affected) {
      throw new ConflictException(message);
    }
  }

  private parseFutureDate(value: string): Date {
    const date = new Date(value);
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('startsAt must be in the future.');
    }
    return date;
  }

  private async assertInterestExists(id: number): Promise<void> {
    const [found] = await this.dataSource.query(`SELECT 1 FROM interests WHERE id = $1`, [id]);
    if (!found) {
      throw new BadRequestException('Unknown interest.');
    }
  }
}
