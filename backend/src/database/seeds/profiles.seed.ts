import { DataSource, In } from 'typeorm';
import { Interest } from '../../interests/entities/interest.entity';
import { Profile, ProfileModerationStatus } from '../../profiles/entities/profile.entity';
import { MEMBER_KEYS, MemberKey, SeedUsers } from './users.seed';

interface SeedProfileSpec {
  displayName: string;
  bio: string;
  approximateLocation: string;
  moderationStatus: ProfileModerationStatus;
  interestNames: string[];
}

// Keyed the same way as DEMO_MEMBER_SEEDS — the moderator has no profile (not required,
// see docs/data-model.md: Profile is 1:1 with User but nothing forces one to exist).
const DEMO_PROFILE_SEEDS: Record<MemberKey, SeedProfileSpec> = {
  alice: {
    displayName: 'Alice Moreau',
    bio: 'Ancienne institutrice, j’organise une randonnée presque chaque mois et j’aime partager mes graines.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Randonnée et marche', 'Jardinage'],
  },
  bob: {
    displayName: 'Bob Laurent',
    bio: 'Joueur de belote et amateur de bons films, toujours partant pour une partie.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Jeux de société et de cartes', 'Cinéma et théâtre'],
  },
  carol: {
    displayName: 'Carol Petit',
    bio: 'Nouvelle inscrite : son profil attend la validation d’un modérateur.',
    approximateLocation: 'Paris',
    moderationStatus: ProfileModerationStatus.PENDING,
    interestNames: ['Lecture et clubs de lecture'],
  },
  dave: {
    displayName: 'Dave Robert',
    bio: 'Compte de démonstration, suspendu pour montrer la restriction d’un compte.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Voyages et découvertes'],
  },
  emma: {
    displayName: 'Emma Bernard',
    bio: 'Bibliothécaire retraitée, j’organise des ateliers et des sorties culturelles.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Lecture et clubs de lecture', 'Cinéma et théâtre'],
  },
  farid: {
    displayName: 'Farid Haddad',
    bio: 'Nouveau à Lyon, je cherche des compagnons de balade et de photo.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Randonnée et marche', 'Photographie'],
  },
  gaby: {
    displayName: 'Gabrielle Roux',
    bio: 'Nouvelle inscrite : son profil attend la validation d’un modérateur.',
    approximateLocation: 'Marseille',
    moderationStatus: ProfileModerationStatus.PENDING,
    interestNames: ['Cuisine'],
  },
  hugo: {
    displayName: 'Hugo Martin',
    bio: 'Profil bloqué, pour montrer la modération et le déblocage.',
    approximateLocation: 'Toulouse',
    moderationStatus: ProfileModerationStatus.BLOCKED,
    interestNames: ['Musique et chant'],
  },
  colette: {
    displayName: 'Colette Dubois',
    bio: 'Passionnée de poterie et de jardinage, j’aime les ateliers où l’on repart avec quelque chose.',
    approximateLocation: 'Villeurbanne',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Arts et loisirs créatifs', 'Jardinage'],
  },
  gerard: {
    displayName: 'Gérard Lefebvre',
    bio: 'Ancien guide de montagne, je connais tous les sentiers autour de Grenoble.',
    approximateLocation: 'Grenoble',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Randonnée et marche', 'Photographie'],
  },
  francoise: {
    displayName: 'Françoise Garnier',
    bio: 'Je chante dans une chorale depuis trente ans et je cherche de nouveaux choristes.',
    approximateLocation: 'Annecy',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Musique et chant', 'Danse'],
  },
  jacques: {
    displayName: 'Jacques Moreau',
    bio: 'Cycliste du dimanche, je prends mon temps et je m’arrête souvent pour un café.',
    approximateLocation: 'Valence',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Randonnée et marche', 'Voyages et découvertes'],
  },
  monique: {
    displayName: 'Monique Fontaine',
    bio: 'Je tiens un petit potager et je donne volontiers des plants et des conseils.',
    approximateLocation: 'Saint-Étienne',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Jardinage', 'Cuisine'],
  },
  henri: {
    displayName: 'Henri Vidal',
    bio: 'Ancien cheminot, passionné de trains, de cartes et de bonnes histoires.',
    approximateLocation: 'Lyon',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Jeux de société et de cartes', 'Voyages et découvertes'],
  },
  odile: {
    displayName: 'Odile Perrin',
    bio: 'Danseuse de salon depuis toujours, je cherche des partenaires de valse et de tango.',
    approximateLocation: 'Paris',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Danse', 'Musique et chant'],
  },
  josette: {
    displayName: 'Josette Faure',
    bio: 'Bénévole dans une association de quartier, toujours prête à donner un coup de main.',
    approximateLocation: 'Toulouse',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Bénévolat', 'Cuisine'],
  },
  michel: {
    displayName: 'Michel Giraud',
    bio: 'Photographe amateur, je cherche des modèles de paysages et des compagnons de sortie.',
    approximateLocation: 'Bordeaux',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Photographie', 'Randonnée et marche'],
  },
  nicole: {
    displayName: 'Nicole André',
    bio: 'Je me suis mise au vélo à la retraite et je ne regrette rien.',
    approximateLocation: 'Nantes',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Randonnée et marche', 'Voyages et découvertes'],
  },
  bernard: {
    displayName: 'Bernard Roche',
    bio: 'Ancien professeur de lettres, je tiens un club de lecture et j’adore le théâtre.',
    approximateLocation: 'Lille',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Lecture et clubs de lecture', 'Cinéma et théâtre'],
  },
  christiane: {
    displayName: 'Christiane Blanc',
    bio: 'Cuisinière gourmande, j’organise des repas partagés et des cours de cuisine.',
    approximateLocation: 'Strasbourg',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Cuisine', 'Bénévolat'],
  },
  pierre: {
    displayName: 'Pierre Mercier',
    bio: 'Amateur de jeux de société et de bonne humeur, les débutants sont les bienvenus.',
    approximateLocation: 'Montpellier',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Jeux de société et de cartes', 'Musique et chant'],
  },
  simone: {
    displayName: 'Simone Guérin',
    bio: 'Nouvelle inscrite à Dijon : son profil attend la validation d’un modérateur.',
    approximateLocation: 'Dijon',
    moderationStatus: ProfileModerationStatus.PENDING,
    interestNames: ['Arts et loisirs créatifs', 'Lecture et clubs de lecture'],
  },
  raymond: {
    displayName: 'Raymond Colin',
    bio: 'Nouvel inscrit à Clermont-Ferrand : son profil attend la validation d’un modérateur.',
    approximateLocation: 'Clermont-Ferrand',
    moderationStatus: ProfileModerationStatus.PENDING,
    interestNames: ['Randonnée et marche'],
  },
  denise: {
    displayName: 'Denise Lemoine',
    bio: 'Je découvre l’aquarelle et les musées, et j’aimerais en parler avec d’autres curieux.',
    approximateLocation: 'Rennes',
    moderationStatus: ProfileModerationStatus.APPROVED,
    interestNames: ['Arts et loisirs créatifs', 'Voyages et découvertes'],
  },
};

export type SeedProfiles = Record<MemberKey, Profile>;

export async function seedProfiles(dataSource: DataSource, users: SeedUsers): Promise<SeedProfiles> {
  const profileRepo = dataSource.getRepository(Profile);
  const interestRepo = dataSource.getRepository(Interest);

  const result = {} as SeedProfiles;
  for (const key of MEMBER_KEYS) {
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
