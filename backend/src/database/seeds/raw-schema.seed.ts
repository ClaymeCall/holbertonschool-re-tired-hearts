import { DataSource } from 'typeorm';
import { SeedProfiles } from './profiles.seed';
import { SeedUsers } from './users.seed';

// Scaffolding for the parts of the data model that don't have a TypeORM entity/module
// yet: `events`, `event_registrations`, `conversations`, `messages` and
// `moderation_actions` land with #47/#48, #57/#58 and #64. The tables themselves already
// exist (Phase 0 initial migration, #31), so this seeds real rows with raw SQL against
// the exact columns in docs/data-model.md. Once each module exists, replace the matching
// function here with repository calls — the orchestration in seed.ts doesn't need to
// change.

const DAY_MS = 24 * 60 * 60 * 1000;
const futureDate = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();
const pastDate = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

interface EventSpec {
  organizerId: number;
  interestName: string;
  title: string;
  description: string;
  approximateLocation: string;
  startsAt: string;
  capacity: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
}

export type SeedEventIds = Record<'published' | 'draft' | 'completed' | 'cancelled', number>;

export async function seedEvents(dataSource: DataSource, users: SeedUsers): Promise<SeedEventIds> {
  return {
    published: await findOrCreateEvent(dataSource, {
      organizerId: users.alice.id,
      interestName: 'Walking and hiking',
      title: "Sunday hike around Parc de la Tête d'Or",
      description: 'A gentle 5km walk, meeting at the main gate at 10am.',
      approximateLocation: 'Lyon',
      startsAt: futureDate(14),
      capacity: 12,
      status: 'published',
    }),
    draft: await findOrCreateEvent(dataSource, {
      organizerId: users.alice.id,
      interestName: 'Gardening',
      title: 'Community garden morning (planning)',
      description: 'Draft — details still being worked out, visible only to its organizer and moderators.',
      approximateLocation: 'Lyon',
      startsAt: futureDate(30),
      capacity: 8,
      status: 'draft',
    }),
    completed: await findOrCreateEvent(dataSource, {
      organizerId: users.bob.id,
      interestName: 'Board games and cards',
      title: 'Belote afternoon',
      description: 'Past event, marked completed by its organizer.',
      approximateLocation: 'Lyon',
      startsAt: pastDate(10),
      capacity: 6,
      status: 'completed',
    }),
    cancelled: await findOrCreateEvent(dataSource, {
      organizerId: users.alice.id,
      interestName: 'Cinema and theatre',
      title: 'Outdoor film screening',
      description: 'Cancelled by its organizer due to weather.',
      approximateLocation: 'Lyon',
      startsAt: futureDate(5),
      capacity: 20,
      status: 'cancelled',
    }),
  };
}

async function findOrCreateEvent(dataSource: DataSource, spec: EventSpec): Promise<number> {
  const existing = await dataSource.query(
    'SELECT id FROM events WHERE organizer_id = $1 AND title = $2',
    [spec.organizerId, spec.title],
  );
  if (existing.length > 0) {
    return existing[0].id;
  }

  const interest = await dataSource.query('SELECT id FROM interests WHERE name = $1', [spec.interestName]);
  if (interest.length === 0) {
    throw new Error(`Seed interest not found: ${spec.interestName}`);
  }

  const inserted = await dataSource.query(
    `INSERT INTO events
       (organizer_id, main_interest_id, title, description, approximate_location, starts_at, capacity, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      spec.organizerId,
      interest[0].id,
      spec.title,
      spec.description,
      spec.approximateLocation,
      spec.startsAt,
      spec.capacity,
      spec.status,
    ],
  );
  return inserted[0].id;
}

// Bob and Dave both register for Alice's published event; Alice registers for Bob's
// already-completed one (capacity rules aren't re-checked here — this writes rows
// directly, the same way a migration would, not through the future booking service).
export async function seedRegistrations(dataSource: DataSource, users: SeedUsers, eventIds: SeedEventIds): Promise<void> {
  await findOrCreateRegistration(dataSource, eventIds.published, users.bob.id);
  await findOrCreateRegistration(dataSource, eventIds.published, users.dave.id);
  await findOrCreateRegistration(dataSource, eventIds.completed, users.alice.id);
}

async function findOrCreateRegistration(dataSource: DataSource, eventId: number, userId: number): Promise<void> {
  const existing = await dataSource.query(
    'SELECT id FROM event_registrations WHERE event_id = $1 AND user_id = $2',
    [eventId, userId],
  );
  if (existing.length > 0) {
    return;
  }
  await dataSource.query(
    `INSERT INTO event_registrations (event_id, user_id, status) VALUES ($1, $2, 'registered')`,
    [eventId, userId],
  );
}

// One conversation between Alice and Bob: Bob is registered to an event Alice organizes,
// which is the "organizer" contact link in docs/messaging-rules.md (works in both
// directions). Stored in canonical order per the `conversations_distinct_ordered` CHECK.
export async function seedConversationAndMessages(dataSource: DataSource, users: SeedUsers): Promise<void> {
  const [firstId, secondId] = [users.alice.id, users.bob.id].sort((a, b) => a - b);

  let conversation = await dataSource.query(
    'SELECT id FROM conversations WHERE participant_one_id = $1 AND participant_two_id = $2',
    [firstId, secondId],
  );
  let conversationId: number;
  if (conversation.length > 0) {
    conversationId = conversation[0].id;
  } else {
    const inserted = await dataSource.query(
      'INSERT INTO conversations (participant_one_id, participant_two_id) VALUES ($1, $2) RETURNING id',
      [firstId, secondId],
    );
    conversationId = inserted[0].id;
  }

  const existingMessages = await dataSource.query(
    'SELECT id FROM messages WHERE conversation_id = $1',
    [conversationId],
  );
  if (existingMessages.length === 0) {
    await dataSource.query(
      `INSERT INTO messages (conversation_id, sender_id, content) VALUES
         ($1, $2, $3),
         ($1, $4, $5)`,
      [
        conversationId,
        users.bob.id,
        'Hi Alice, looking forward to the Sunday hike!',
        users.alice.id,
        'Great, see you there at 10am!',
      ],
    );
  }
}

interface ModerationActionSpec {
  moderatorId: number;
  targetType: 'profile' | 'user_account' | 'event';
  targetId: number;
  action: string;
  reason: string | null;
}

async function findOrCreateModerationAction(dataSource: DataSource, spec: ModerationActionSpec): Promise<void> {
  const existing = await dataSource.query(
    'SELECT id FROM moderation_actions WHERE target_type = $1 AND target_id = $2 AND action = $3',
    [spec.targetType, spec.targetId, spec.action],
  );
  if (existing.length > 0) {
    return;
  }
  await dataSource.query(
    `INSERT INTO moderation_actions (moderator_id, target_type, target_id, action, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [spec.moderatorId, spec.targetType, spec.targetId, spec.action, spec.reason],
  );
}

// Logs the approvals that already-approved demo profiles implicitly went through, and
// demonstrates the suspended-account journey end-to-end: Dave is suspended *after*
// already registering for the published event, so his registration is flipped to
// `withdrawn` — the cascade documented in docs/data-model.md §3 — and the moderator
// action is recorded.
export async function seedModerationActions(
  dataSource: DataSource,
  users: SeedUsers,
  profiles: SeedProfiles,
): Promise<void> {
  const moderatorId = users.moderator.id;

  for (const key of ['alice', 'bob', 'dave'] as const) {
    await findOrCreateModerationAction(dataSource, {
      moderatorId,
      targetType: 'profile',
      targetId: profiles[key].id,
      action: 'approve_profile',
      reason: null,
    });
  }

  const dave = await dataSource.query('SELECT account_status FROM users WHERE id = $1', [users.dave.id]);
  if (dave[0].account_status !== 'suspended') {
    await dataSource.query(
      `UPDATE users SET account_status = 'suspended', suspended_at = now() WHERE id = $1`,
      [users.dave.id],
    );
    await dataSource.query(
      `UPDATE event_registrations SET status = 'withdrawn', updated_at = now()
       WHERE user_id = $1 AND status = 'registered'`,
      [users.dave.id],
    );
    await findOrCreateModerationAction(dataSource, {
      moderatorId,
      targetType: 'user_account',
      targetId: users.dave.id,
      action: 'suspend_account',
      reason: 'Seed demo account: suspended to demonstrate the account-restriction journey.',
    });
  }
}
