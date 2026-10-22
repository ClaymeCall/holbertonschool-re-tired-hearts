import { DataSource } from 'typeorm';
import { EventSpec, findOrCreateEvent, findOrCreateModerationAction, findOrCreateRegistration } from './raw-schema.seed';
import { MemberKey, SeedUsers } from './users.seed';

// A living community in French: more events across France (upcoming, past, cancelled, draft), their
// registrations, a few conversations with unread messages and the moderation approvals of the new
// profiles. Idempotent like the other seeds: events by organizer + title, registrations by event +
// member, conversations by their pair, audit rows by target + action.

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

interface CommunityEvent {
  organizer: MemberKey;
  interest: string;
  title: string;
  description: string;
  city: string;
  inDays: number; // negative: already happened
  capacity: number;
  status: EventSpec['status'];
  registered: MemberKey[]; // approved members, never the organizer
}

const EVENTS: CommunityEvent[] = [
  { organizer: 'colette', interest: 'Arts et loisirs créatifs', title: 'Atelier poterie et modelage', description: 'Initiation au modelage de l’argile, chacun repart avec sa pièce après la cuisson.', city: 'Villeurbanne', inDays: 6, capacity: 8, status: 'published', registered: ['monique', 'emma', 'denise'] },
  { organizer: 'gerard', interest: 'Randonnée et marche', title: 'Randonnée jusqu’au fort de la Bastille', description: 'Montée tranquille avec de belles vues sur la ville, pause pique-nique au sommet.', city: 'Grenoble', inDays: 13, capacity: 12, status: 'published', registered: ['farid', 'jacques', 'michel'] },
  { organizer: 'francoise', interest: 'Musique et chant', title: 'Répétition ouverte de la chorale', description: 'On chante ensemble des chansons françaises, aucune lecture de partition n’est nécessaire.', city: 'Annecy', inDays: 4, capacity: 25, status: 'published', registered: ['odile', 'pierre', 'colette'] },
  { organizer: 'jacques', interest: 'Randonnée et marche', title: 'Balade à vélo le long de la ViaRhôna', description: 'Une trentaine de kilomètres sur piste plate, à votre rythme, avec une halte déjeuner.', city: 'Valence', inDays: 11, capacity: 14, status: 'published', registered: ['nicole', 'henri', 'lucien'] },
  { organizer: 'monique', interest: 'Jardinage', title: 'Troc de plantes et de graines', description: 'Apportez vos boutures et vos graines, repartez avec celles des autres et de bons conseils.', city: 'Saint-Étienne', inDays: 15, capacity: 20, status: 'published', registered: ['alice', 'colette', 'josette'] },
  { organizer: 'odile', interest: 'Danse', title: 'Thé dansant au salon', description: 'Valses, tangos et slows autour d’un thé et de petits gâteaux, ambiance chaleureuse.', city: 'Paris', inDays: 17, capacity: 40, status: 'published', registered: ['bernard', 'denise', 'francoise'] },
  { organizer: 'josette', interest: 'Bénévolat', title: 'Collecte de livres pour la bibliothèque du quartier', description: 'On trie, on range et on étiquette les dons, puis on partage un goûter.', city: 'Toulouse', inDays: 19, capacity: 12, status: 'published', registered: ['emma', 'lucien'] },
  { organizer: 'michel', interest: 'Photographie', title: 'Sortie photo sur les quais de la Garonne', description: 'Lumière du soir et reflets sur l’eau, pour débutants comme pour confirmés.', city: 'Bordeaux', inDays: 22, capacity: 10, status: 'published', registered: ['gerard', 'nicole'] },
  { organizer: 'bernard', interest: 'Lecture et clubs de lecture', title: 'Club de lecture : un classique à relire', description: 'Nous relisons un grand roman du XIXe siècle et nous en discutons librement.', city: 'Lille', inDays: 7, capacity: 12, status: 'published', registered: ['odile', 'emma', 'christiane'] },
  { organizer: 'christiane', interest: 'Cuisine', title: 'Repas partagé de saison', description: 'Chacun apporte un plat de saison, nous mettons la table ensemble.', city: 'Strasbourg', inDays: 10, capacity: 16, status: 'published', registered: ['pierre', 'bernard', 'josette', 'denise'] },
  { organizer: 'pierre', interest: 'Jeux de société et de cartes', title: 'Soirée jeux de société', description: 'Tarot, scrabble et jeux modernes expliqués pas à pas, les débutants sont les bienvenus.', city: 'Montpellier', inDays: 12, capacity: 12, status: 'published', registered: ['henri', 'michel'] },
  { organizer: 'denise', interest: 'Voyages et découvertes', title: 'Conférence : carnets de voyage', description: 'Un diaporama de carnets illustrés, suivi d’un échange sur la façon de tenir le sien.', city: 'Rennes', inDays: 25, capacity: 20, status: 'published', registered: ['nicole', 'bernard'] },
  { organizer: 'colette', interest: 'Arts et loisirs créatifs', title: 'Atelier peinture sur porcelaine', description: 'Un après-midi de décoration de tasses et d’assiettes, terminé et très apprécié.', city: 'Villeurbanne', inDays: -12, capacity: 8, status: 'completed', registered: ['alice', 'monique', 'emma'] },
  { organizer: 'francoise', interest: 'Musique et chant', title: 'Concert de la chorale d’Annecy', description: 'Le concert d’automne de la chorale, salle comble et bonne humeur.', city: 'Annecy', inDays: -20, capacity: 60, status: 'completed', registered: ['gerard', 'odile'] },
  { organizer: 'henri', interest: 'Voyages et découvertes', title: 'Visite du musée du chemin de fer', description: 'Une visite guidée des locomotives d’hier, terminée et commentée avec passion.', city: 'Lyon', inDays: -30, capacity: 10, status: 'completed', registered: ['bob', 'farid', 'alice'] },
  { organizer: 'gerard', interest: 'Randonnée et marche', title: 'Randonnée en Chartreuse (annulée)', description: 'Annulée par son organisateur : la météo annoncée est trop mauvaise pour marcher en sécurité.', city: 'Grenoble', inDays: 6, capacity: 10, status: 'cancelled', registered: [] },
  { organizer: 'monique', interest: 'Jardinage', title: 'Visite d’une ferme maraîchère (en préparation)', description: 'Brouillon : la date et le lieu exact sont encore à confirmer avec le maraîcher.', city: 'Saint-Étienne', inDays: 40, capacity: 10, status: 'draft', registered: [] },
];

interface ChatMessage {
  from: MemberKey;
  text: string;
  minutesAgo: number;
  unread?: boolean; // the recipient has not opened it yet
}

interface Chat {
  between: [MemberKey, MemberKey];
  messages: ChatMessage[];
}

// Each pair shares an event, which is what the messaging rules require (docs/messaging-rules.md).
const CHATS: Chat[] = [
  {
    between: ['colette', 'monique'],
    messages: [
      { from: 'colette', text: 'Bonjour Monique, vous venez à l’atelier poterie samedi ?', minutesAgo: 2900 },
      { from: 'monique', text: 'Oui, avec plaisir ! Faut-il apporter un tablier ?', minutesAgo: 2850 },
      { from: 'colette', text: 'Je fournis tout, venez simplement avec de bonnes chaussures.', minutesAgo: 2800 },
    ],
  },
  {
    between: ['henri', 'bob'],
    messages: [
      { from: 'henri', text: 'Bonjour Bob, merci d’être venu au musée du chemin de fer, c’était une belle visite.', minutesAgo: 180, unread: true },
      { from: 'henri', text: 'Si vous aimez les cartes, je prépare une soirée belote le mois prochain.', minutesAgo: 175, unread: true },
    ],
  },
  {
    between: ['gerard', 'farid'],
    messages: [
      { from: 'farid', text: 'Bonjour Gérard, je viens d’arriver dans la région, la randonnée de la Bastille est-elle adaptée aux débutants ?', minutesAgo: 600 },
      { from: 'gerard', text: 'Bienvenue Farid ! Oui, la montée est régulière et nous faisons des pauses.', minutesAgo: 90, unread: true },
    ],
  },
  {
    between: ['monique', 'alice'],
    messages: [
      { from: 'alice', text: 'Bonjour Monique, j’apporterai des graines de capucines pour le troc.', minutesAgo: 1500 },
      { from: 'monique', text: 'Merci Alice ! Je garde une place pour vous près de la table des graines.', minutesAgo: 1440 },
      { from: 'monique', text: 'Pensez aussi à prendre un petit sac pour les boutures.', minutesAgo: 60, unread: true },
    ],
  },
  {
    between: ['odile', 'bernard'],
    messages: [
      { from: 'odile', text: 'Bonjour Bernard, vous serez au thé dansant ? Je réserve une valse pour vous.', minutesAgo: 300 },
      { from: 'bernard', text: 'Avec joie, Odile, mais je danse comme je lis : lentement !', minutesAgo: 240 },
    ],
  },
];

export async function seedCommunity(dataSource: DataSource, users: SeedUsers): Promise<void> {
  for (const spec of EVENTS) {
    const eventId = await findOrCreateEvent(dataSource, {
      organizerId: users[spec.organizer].id,
      interestName: spec.interest,
      title: spec.title,
      description: spec.description,
      approximateLocation: spec.city,
      startsAt: inDays(spec.inDays),
      capacity: spec.capacity,
      status: spec.status,
    });
    for (const member of spec.registered) {
      await findOrCreateRegistration(dataSource, eventId, users[member].id);
    }
  }

  for (const chat of CHATS) {
    await seedChat(dataSource, users, chat);
  }

  await approveCommunityProfiles(dataSource, users);
}

async function seedChat(dataSource: DataSource, users: SeedUsers, chat: Chat): Promise<void> {
  const [firstId, secondId] = chat.between.map((key) => users[key].id).sort((a, b) => a - b);
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
  if (existing.length > 0) {
    return;
  }
  for (const message of chat.messages) {
    await dataSource.query(
      `INSERT INTO messages (conversation_id, sender_id, content, created_at, read_at)
       VALUES ($1, $2, $3, now() - ($4 || ' minutes')::interval, CASE WHEN $5 THEN NULL ELSE now() END)`,
      [conversationId, users[message.from].id, message.text, String(message.minutesAgo), Boolean(message.unread)],
    );
  }
}

// The new approved profiles went through the moderator, like the first ones.
async function approveCommunityProfiles(dataSource: DataSource, users: SeedUsers): Promise<void> {
  const approved: MemberKey[] = [
    'colette', 'gerard', 'francoise', 'jacques', 'monique', 'henri', 'odile', 'lucien', 'josette',
    'michel', 'nicole', 'bernard', 'christiane', 'pierre', 'denise',
  ];
  for (const key of approved) {
    const profile = await dataSource.query('SELECT id FROM profiles WHERE user_id = $1', [users[key].id]);
    await findOrCreateModerationAction(dataSource, {
      moderatorId: users.moderator.id,
      targetType: 'profile',
      targetId: profile[0].id,
      action: 'approve_profile',
      reason: key === 'colette' ? 'Profil complet et bienveillant.' : null,
    });
  }
}
