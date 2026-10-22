import { DataSource } from 'typeorm';
import { EventSpec, findOrCreateEvent, findOrCreateModerationAction, findOrCreateRegistration } from './raw-schema.seed';
import { DEMO_MEMBER_SEEDS, SeedUsers } from './users.seed';

// More demo data, so the main journeys (browse and filter events, paginate, register, a full event,
// "my events", a second conversation with an unread badge, the moderation queue) can be shown without
// creating anything by hand (#75). Everything is idempotent: events by organizer + title,
// registrations by event + member, the conversation by its pair, audit rows by target + action.

type MemberKey = keyof typeof DEMO_MEMBER_SEEDS;

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

interface ExtraEvent {
  organizer: MemberKey;
  interest: string;
  title: string;
  description: string;
  city: string;
  inDays: number;
  capacity: number;
  registered: MemberKey[]; // approved members only; never the organizer
}

// 12 published events in several cities and interests (the front end shows 12 per page: with the
// seeded hike, this makes a second page), plus one event that is already full (capacity 2, 2 registered).
const EXTRA_EVENTS: ExtraEvent[] = [
  { organizer: 'emma', interest: 'Gardening', title: 'Atelier jardinage au potager partagé', description: 'Semis d’automne et échange de graines, tout le matériel est fourni.', city: 'Lyon', inDays: 7, capacity: 10, registered: ['alice', 'farid'] },
  { organizer: 'emma', interest: 'Cinema and theatre', title: 'Séance de cinéma suivie d’un café', description: 'Un classique en version restaurée, puis une discussion autour d’un café.', city: 'Lyon', inDays: 10, capacity: 15, registered: ['alice', 'bob'] },
  { organizer: 'emma', interest: 'Board games and cards', title: 'Tournoi de belote du dimanche', description: 'Une après-midi conviviale, débutants bienvenus.', city: 'Villeurbanne', inDays: 5, capacity: 8, registered: ['bob', 'farid'] },
  { organizer: 'alice', interest: 'Photography', title: 'Balade photo au bord du Rhône', description: 'Une promenade tranquille pour photographier les quais, avec ou sans appareil.', city: 'Lyon', inDays: 12, capacity: 12, registered: ['bob', 'emma'] },
  { organizer: 'alice', interest: 'Cooking', title: 'Cours de cuisine : les quenelles', description: 'On prépare ensemble, puis on déguste.', city: 'Lyon', inDays: 9, capacity: 6, registered: ['emma', 'farid'] },
  { organizer: 'bob', interest: 'Music and singing', title: 'Chorale d’automne', description: 'Répétition ouverte à tous, aucune connaissance musicale requise.', city: 'Lyon', inDays: 14, capacity: 20, registered: ['alice'] },
  { organizer: 'bob', interest: 'Arts and crafts', title: 'Atelier loisirs créatifs', description: 'Cartes, collages et petits objets à rapporter chez soi.', city: 'Lyon', inDays: 16, capacity: 10, registered: ['emma'] },
  { organizer: 'emma', interest: 'Reading and book clubs', title: 'Club de lecture : romans policiers', description: 'On échange sur le livre du mois autour d’un thé.', city: 'Paris', inDays: 8, capacity: 12, registered: [] },
  { organizer: 'alice', interest: 'Dancing', title: 'Après-midi dansante', description: 'Valses, tangos et danses en ligne, avec un animateur.', city: 'Lyon', inDays: 20, capacity: 30, registered: ['bob'] },
  { organizer: 'farid', interest: 'Volunteering', title: 'Sortie bénévole : distribution de repas', description: 'Aider une association locale, par petits groupes.', city: 'Lyon', inDays: 11, capacity: 8, registered: ['emma'] },
  { organizer: 'emma', interest: 'Travel and discovery', title: 'Conférence : découvrir l’Italie', description: 'Diaporama et conseils de voyage, questions bienvenues.', city: 'Toulouse', inDays: 18, capacity: 25, registered: [] },
  { organizer: 'bob', interest: 'Walking and hiking', title: 'Randonnée dans les Monts d’Or', description: 'Environ 8 km, rythme tranquille, pique-nique partagé.', city: 'Lyon', inDays: 21, capacity: 14, registered: ['farid', 'alice'] },
  { organizer: 'emma', interest: 'Cooking', title: 'Dégustation de fromages (complet)', description: 'Une petite table de dégustation : toutes les places sont prises.', city: 'Lyon', inDays: 6, capacity: 2, registered: ['bob', 'farid'] },
];

export async function seedDemoExtras(dataSource: DataSource, users: SeedUsers): Promise<void> {
  for (const spec of EXTRA_EVENTS) {
    const event: EventSpec = {
      organizerId: users[spec.organizer].id,
      interestName: spec.interest,
      title: spec.title,
      description: spec.description,
      approximateLocation: spec.city,
      startsAt: inDays(spec.inDays),
      capacity: spec.capacity,
      status: 'published',
    };
    const eventId = await findOrCreateEvent(dataSource, event);
    for (const member of spec.registered) {
      await findOrCreateRegistration(dataSource, eventId, users[member].id);
    }
  }

  await seedEmmaAliceConversation(dataSource, users);
  await seedExtraModerationActions(dataSource, users);
}

// Alice is registered to events organized by Emma, which is a contact link. Alice has an unread
// badge from this conversation (two messages from Emma not read yet). Farid has no conversation on
// purpose: he and Bob share events, so he is the member to write to in the "empty conversation" demo.
async function seedEmmaAliceConversation(dataSource: DataSource, users: SeedUsers): Promise<void> {
  const [firstId, secondId] = [users.alice.id, users.emma.id].sort((a, b) => a - b);
  const found = await dataSource.query(
    'SELECT id FROM conversations WHERE participant_one_id = $1 AND participant_two_id = $2',
    [firstId, secondId],
  );
  const conversationId: number =
    found.length > 0
      ? found[0].id
      : (
          await dataSource.query(
            'INSERT INTO conversations (participant_one_id, participant_two_id) VALUES ($1, $2) RETURNING id',
            [firstId, secondId],
          )
        )[0].id;

  const existing = await dataSource.query('SELECT id FROM messages WHERE conversation_id = $1', [conversationId]);
  if (existing.length === 0) {
    await dataSource.query(
      `INSERT INTO messages (conversation_id, sender_id, content) VALUES
         ($1, $2, $3),
         ($1, $4, $5),
         ($1, $2, $6)`,
      [
        conversationId,
        users.emma.id,
        'Bonjour Alice, ravie de vous compter parmi les inscrits à l’atelier jardinage !',
        users.alice.id,
        'Merci Emma, j’apporterai des graines de capucines.',
        'Parfait, à samedi !',
      ],
    );
  }
}

// The new approved profiles went through the moderator, and Hugo's profile was blocked (the screens
// "Profils approuvés" and "Profils bloqués" then show something).
async function seedExtraModerationActions(dataSource: DataSource, users: SeedUsers): Promise<void> {
  const profileId = async (userId: number): Promise<number> =>
    (await dataSource.query('SELECT id FROM profiles WHERE user_id = $1', [userId]))[0].id;
  const moderatorId = users.moderator.id;

  for (const key of ['emma', 'farid'] as const) {
    await findOrCreateModerationAction(dataSource, {
      moderatorId,
      targetType: 'profile',
      targetId: await profileId(users[key].id),
      action: 'approve_profile',
      reason: null,
    });
  }
  await findOrCreateModerationAction(dataSource, {
    moderatorId,
    targetType: 'profile',
    targetId: await profileId(users.hugo.id),
    action: 'block_profile',
    reason: 'Seed demo account: blocked to demonstrate the blocked state and the unblock action.',
  });
}
