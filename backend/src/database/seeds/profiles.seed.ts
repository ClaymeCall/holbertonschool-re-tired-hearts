import { DataSource, In } from 'typeorm';
import { Interest } from '../../interests/entities/interest.entity';
import { Profile, ProfileModerationStatus } from '../../profiles/entities/profile.entity';
import { DEMO_MEMBER_SEEDS, SeedUsers } from './users.seed';

interface SeedProfileSpec {
  displayName: string;
  bio: string;
  approximateLocation: string;
  moderationStatus: ProfileModerationStatus;
  interestNames: string[];
}

// Keyed the same way as DEMO_MEMBER_SEEDS — the moderator has no profile (not required,
// see docs/data-model.md: Profile is 1:1 with User but nothing forces one to exist).
const DEMO_PROFILE_SEEDS: Record<keyof typeof DEMO_MEMBER_SEEDS, SeedProfileSpec> = {
  alice: {
    displayName: 'Alice Moreau',
    bio: 'Retired teacher, organizes a weekend hike most months.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Walking and hiking', 'Gardening'],
  },
  bob: {
    displayName: 'Bob Laurent',
    bio: 'Enjoys board games and a good film.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Board games and cards', 'Cinema and theatre'],
  },
  carol: {
    displayName: 'Carol Petit',
    bio: 'New member, profile awaiting moderator approval.',
    approximateLocation: 'Paris',
    moderationStatus: ProfileModerationStatus.PENDING,
    interestNames: ['Reading and book clubs'],
  },
  dave: {
    displayName: 'Dave Robert',
    bio: 'Demo account used to show the suspended-account restriction.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Travel and discovery'],
  },
  emma: {
    displayName: 'Emma Bernard',
    bio: 'Bibliothécaire retraitée, organise des ateliers et des sorties culturelles.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Reading and book clubs', 'Cinema and theatre'],
  },
  farid: {
    displayName: 'Farid Haddad',
    bio: 'Nouveau à Lyon, cherche des compagnons de balade.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Walking and hiking', 'Photography'],
  },
  gaby: {
    displayName: 'Gabrielle Roux',
    bio: 'Nouvelle inscrite : son profil attend la validation d’un modérateur.',
    approximateLocation: 'Marseille',
    moderationStatus: ProfileModerationStatus.PENDING,
    interestNames: ['Cooking'],
  },
  hugo: {
    displayName: 'Hugo Martin',
    bio: 'Profil bloqué, pour montrer la modération et le déblocage.',
    approximateLocation: 'Toulouse',
    moderationStatus: ProfileModerationStatus.BLOCKED,
    interestNames: ['Music and singing'],
  },
};

export type SeedProfiles = Record<keyof typeof DEMO_PROFILE_SEEDS, Profile>;

export async function seedProfiles(dataSource: DataSource, users: SeedUsers): Promise<SeedProfiles> {
  const profileRepo = dataSource.getRepository(Profile);
  const interestRepo = dataSource.getRepository(Interest);

  const result = {} as SeedProfiles;
  for (const key of Object.keys(DEMO_PROFILE_SEEDS) as (keyof typeof DEMO_PROFILE_SEEDS)[]) {
    const spec = DEMO_PROFILE_SEEDS[key];
    const userId = users[key].id;

    let profile = await profileRepo.findOne({ where: { userId }, relations: ['interests'] });
    if (!profile) {
      const interests = await interestRepo.find({ where: { name: In(spec.interestNames) } });
      profile = await profileRepo.save(
        profileRepo.create({
          userId,
          displayName: spec.displayName,
          bio: spec.bio,
          approximateLocation: spec.approximateLocation,
          moderationStatus: spec.moderationStatus,
          interests,
        }),
      );
    }
    result[key] = profile;
  }
  return result;
}
