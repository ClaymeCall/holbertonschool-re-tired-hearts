import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { AccountStatus, User } from '../../users/entities/user.entity';

const BCRYPT_ROUNDS = 12;

export interface SeedUserSpec {
  email: string;
  password: string;
  isAdmin?: boolean;
}

// Demo credentials only — clearly labeled, no real personal data (docs/requirements.md's
// "demo accounts may use clearly-labeled non-sensitive test credentials", issue #74).
// The moderator's is overridable so a deployment can set its own without editing this file.
export const MODERATOR_SEED: SeedUserSpec = {
  email: process.env.SEED_MODERATOR_EMAIL ?? 'moderator@retired-hearts.demo',
  password: process.env.SEED_MODERATOR_PASSWORD ?? 'DemoModerator123!',
  isAdmin: true,
};

// Covers the member scenarios the demonstrations need: approved + organizer (alice, emma),
// approved + plain member (bob), approved with no conversation yet (farid), pending (carol,
// gaby, simone, raymond: the moderation queue), blocked (hugo: the "unblock" demonstration) and
// approved-but-later-suspended (dave, seeded further in raw-schema.seed.ts to demonstrate the
// account-restriction + cascade behavior). The other members (colette to denise) make the site
// look alive: more profiles, events and conversations (community.seed.ts). Every member signs in
// with the same demo password.
export const MEMBER_KEYS = [
  'alice', 'bob', 'carol', 'dave', 'emma', 'farid', 'gaby', 'hugo',
  'colette', 'gerard', 'francoise', 'jacques', 'monique', 'henri', 'odile', 'lucien', 'josette',
  'michel', 'nicole', 'bernard', 'christiane', 'pierre', 'simone', 'raymond', 'denise',
] as const;

export type MemberKey = (typeof MEMBER_KEYS)[number];

export const DEMO_MEMBER_SEEDS = Object.fromEntries(
  MEMBER_KEYS.map((key) => [key, { email: `${key}@retired-hearts.demo`, password: 'DemoMember123!' }]),
) as Record<MemberKey, SeedUserSpec>;

export type SeedUsers = Record<'moderator' | MemberKey, User>;

export async function seedUsers(dataSource: DataSource): Promise<SeedUsers> {
  const repo = dataSource.getRepository(User);

  const moderator = await findOrCreateUser(repo, MODERATOR_SEED);
  const members = {} as Record<MemberKey, User>;
  for (const key of MEMBER_KEYS) {
    members[key] = await findOrCreateUser(repo, DEMO_MEMBER_SEEDS[key]);
  }

  return { moderator, ...members };
}

// Idempotent by email, so re-running `npm run seed` after a reset never duplicates a
// demo account (same requirement as the reproducible seed data in #75).
async function findOrCreateUser(repo: Repository<User>, spec: SeedUserSpec): Promise<User> {
  const existing = await repo
    .createQueryBuilder('user')
    .where('lower(user.email) = lower(:email)', { email: spec.email })
    .getOne();
  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(spec.password, BCRYPT_ROUNDS);
  return repo.save(
    repo.create({
      email: spec.email,
      passwordHash,
      isAdmin: spec.isAdmin ?? false,
      accountStatus: AccountStatus.ACTIVE,
    }),
  );
}
