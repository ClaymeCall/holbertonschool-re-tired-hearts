import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { User } from '../../src/users/entities/user.entity';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  auth: AuthService;
}

export interface Actor {
  id: number;
  cookie: string;
}

export interface ActorOptions {
  /** Profile moderation status; null = no profile at all. Default: approved. */
  profile?: 'approved' | 'pending' | 'blocked' | null;
  accountStatus?: 'active' | 'suspended';
  isAdmin?: boolean;
}

// The integration tests empty tables: refuse to run against anything but a *_test database.
function assertTestDatabase(): string {
  const name = process.env.DB_NAME ?? '';
  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(`Refusing to run integration tests on database "${name}" (must end with _test)`);
  }
  return name;
}

// Creates the test database the first time (connecting to the maintenance database).
async function ensureDatabase(name: string): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (found.rowCount === 0) {
      await client.query(`CREATE DATABASE ${name}`); // name checked by assertTestDatabase
    }
  } finally {
    await client.end();
  }
}

// Same global setup as src/main.ts (prefix, cookies, validation), on top of the real AppModule.
export async function createTestApp(): Promise<TestContext> {
  await ensureDatabase(assertTestDatabase());

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations(); // creates the schema (and the 12 interests) on a blank test database
  return { app, dataSource, auth: app.get(AuthService) };
}

// Empties every table except the reference data (interests) and restarts the ids.
export async function resetData(dataSource: DataSource): Promise<void> {
  assertTestDatabase();
  await dataSource.query(
    `TRUNCATE moderation_actions, messages, conversations, event_registrations, events,
              profile_interests, profiles, users RESTART IDENTITY CASCADE`,
  );
}

// Inserts a member (and its profile) and returns the session cookie the real login would set.
let counter = 0;
export async function createActor(ctx: TestContext, options: ActorOptions = {}): Promise<Actor> {
  const { profile = 'approved', accountStatus = 'active', isAdmin = false } = options;
  counter += 1;
  const [{ id }] = await ctx.dataSource.query(
    `INSERT INTO users (email, password_hash, is_admin, account_status, suspended_at)
     VALUES ($1, 'not-a-real-hash', $2, $3::account_status,
             CASE WHEN $3::account_status = 'suspended' THEN now() END)
     RETURNING id`,
    [`member${counter}@test.fr`, isAdmin, accountStatus],
  );
  if (profile) {
    await ctx.dataSource.query(
      `INSERT INTO profiles (user_id, display_name, approximate_location, moderation_status)
       VALUES ($1, $2, 'Lyon', $3::moderation_status)`,
      [id, `Member ${id}`, profile],
    );
  }
  return { id, cookie: `access_token=${ctx.auth.signToken({ id } as User)}` };
}
