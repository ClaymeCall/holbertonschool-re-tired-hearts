import dataSource from './data-source';
import { seedCommunity } from './seeds/community.seed';
import { seedDemoExtras } from './seeds/demo-extra.seed';
import { seedProfiles } from './seeds/profiles.seed';
import {
  seedConversationAndMessages,
  seedEvents,
  seedModerationActions,
  seedRegistrations,
} from './seeds/raw-schema.seed';
import { DEMO_MEMBER_SEEDS, MEMBER_KEYS, MODERATOR_SEED, seedUsers } from './seeds/users.seed';

// Reproducible demo data for the whole data model (docs/data-model.md), run against an
// already-migrated database: `npm run migration:run` then `npm run seed`. Idempotent —
// each seed function checks for its row(s) by a natural key before inserting, so running
// it again after `docker compose down -v && docker compose up` is always safe, and running
// it twice without a reset changes nothing. See docs/contributing.md for the full
// reset/reseed procedure.
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    console.log('Seeding users (moderator + demo members)...');
    const users = await seedUsers(dataSource);

    console.log('Seeding profiles (with interests)...');
    const profiles = await seedProfiles(dataSource, users);

    console.log('Seeding events (draft/published/cancelled/completed)...');
    const eventIds = await seedEvents(dataSource, users);

    console.log('Seeding event registrations...');
    await seedRegistrations(dataSource, users, eventIds);

    console.log('Seeding a demo conversation and messages...');
    await seedConversationAndMessages(dataSource, users);

    console.log('Seeding moderation actions (and the suspended-account demo)...');
    await seedModerationActions(dataSource, users, profiles);

    console.log('Seeding the extra demo data (more events, a full event, a second conversation, a blocked profile)...');
    await seedDemoExtras(dataSource, users);

    console.log('Seeding the community (more members\' events, registrations, conversations, approvals)...');
    await seedCommunity(dataSource, users);

    console.log('\nSeed complete. Demo logins (password in parentheses):');
    console.log(`  moderator: ${MODERATOR_SEED.email} (${MODERATOR_SEED.password})`);
    const scenarioKeys = MEMBER_KEYS.slice(0, 8);
    for (const key of scenarioKeys) {
      console.log(`  ${key}: ${DEMO_MEMBER_SEEDS[key].email} (${DEMO_MEMBER_SEEDS[key].password})`);
    }
    console.log(`  ...and ${MEMBER_KEYS.length - scenarioKeys.length} more members (<first name>@retired-hearts.demo, same password)`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
