import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Actor, TestContext, createActor, createTestApp, resetData } from './test-app';

// Integration tests of the auth API: real HTTP requests through the whole application (guards,
// validation pipe, services) against a real PostgreSQL test database.
//
// POST /auth/register and /auth/login are rate-limited (AUTH_RATE_LIMIT = 5 per IP per route,
// see rate-limit.constants.ts) and the limiter is in-memory, shared by every test in this file
// (the app is created once in beforeAll). The guard itself is already covered by
// src/auth/rate-limit.spec.ts, so this file keeps its calls to each throttled route to 5 or
// fewer and creates login-test accounts by inserting directly into the database instead of
// going through POST /auth/register.
describe('Auth API (integration)', () => {
  let ctx: TestContext;

  function call(method: 'get' | 'post', path: string, actor?: Actor, body?: object) {
    let req = request(ctx.app.getHttpServer())[method](`/v1${path}`);
    if (actor) req = req.set('Cookie', actor.cookie);
    return body ? req.send(body) : req;
  }

  // Inserts a user with a real bcrypt hash, so POST /auth/login can be exercised without
  // spending one of the register route's rate-limited attempts.
  async function insertUser(email: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 4); // low cost factor: these tests don't need bcrypt's real cost
    await ctx.dataSource.query(
      `INSERT INTO users (email, password_hash, account_status) VALUES ($1, $2, 'active')`,
      [email, passwordHash],
    );
  }

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetData(ctx.dataSource);
  });

  describe('GET /auth/me', () => {
    it('refuses an anonymous request', async () => {
      await call('get', '/auth/me').expect(401);
    });

    it('refuses a forged session cookie', async () => {
      const forged: Actor = { id: 1, cookie: 'access_token=not.a.real.token' };
      await call('get', '/auth/me', forged).expect(401);
    });

    it('returns the authenticated account without the password hash', async () => {
      const member = await createActor(ctx);
      const res = await call('get', '/auth/me', member).expect(200);
      expect(res.body).toMatchObject({ id: member.id, isAdmin: false, accountStatus: 'active' });
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('password_hash');
    });

    it('stays reachable for a suspended account, so the member can see why they are restricted', async () => {
      const suspended = await createActor(ctx, { accountStatus: 'suspended' });
      const res = await call('get', '/auth/me', suspended).expect(200);
      expect(res.body.accountStatus).toBe('suspended');
    });
  });

  describe('POST /auth/register', () => {
    // These two behaviors share one register call (rather than one each) so the whole describe
    // block stays within the route's 5-attempts-per-window rate limit (see the file banner).
    it('creates an active member account, starts a session, hides the password hash, and rejects a case-insensitive duplicate', async () => {
      const res = await call('post', '/auth/register', undefined, {
        email: 'jane@example.com',
        password: 'a-strong-passphrase',
      }).expect(201);

      expect(res.body).toMatchObject({ email: 'jane@example.com', isAdmin: false, accountStatus: 'active' });
      expect(res.body).not.toHaveProperty('passwordHash');

      const cookie = res.headers['set-cookie'][0].split(';')[0];
      const me = await request(ctx.app.getHttpServer()).get('/v1/auth/me').set('Cookie', cookie).expect(200);
      expect(me.body.id).toBe(res.body.id);

      await call('post', '/auth/register', undefined, {
        email: 'JANE@EXAMPLE.COM',
        password: 'another-passphrase',
      }).expect(409);
    });

    it.each([
      ['an is_admin field: elevated roles are never self-assignable', { email: 'a@example.com', password: 'a-strong-passphrase', isAdmin: true }],
      ['an invalid email', { email: 'not-an-email', password: 'a-strong-passphrase' }],
      ['a password shorter than 8 characters', { email: 'b@example.com', password: 'short1' }],
    ])('rejects a registration with %s', async (_name, body) => {
      await call('post', '/auth/register', undefined, body).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with valid credentials, case-insensitive email, and starts a session', async () => {
      await insertUser('jane@example.com', 'a-strong-passphrase');

      const res = await call('post', '/auth/login', undefined, {
        email: 'JANE@EXAMPLE.COM',
        password: 'a-strong-passphrase',
      }).expect(200);
      expect(res.body).toMatchObject({ email: 'jane@example.com', isAdmin: false, accountStatus: 'active' });

      const cookie = res.headers['set-cookie'][0].split(';')[0];
      await request(ctx.app.getHttpServer()).get('/v1/auth/me').set('Cookie', cookie).expect(200);
    });

    it('refuses an unknown email and a wrong password with the same generic message', async () => {
      await insertUser('jane@example.com', 'a-strong-passphrase');

      const unknown = await call('post', '/auth/login', undefined, {
        email: 'ghost@example.com',
        password: 'whatever123',
      }).expect(401);

      const wrongPassword = await call('post', '/auth/login', undefined, {
        email: 'jane@example.com',
        password: 'wrong-password',
      }).expect(401);

      expect(unknown.body.message).toEqual(wrongPassword.body.message); // no account-enumeration signal
    });
  });

  describe('POST /auth/logout', () => {
    it('refuses an anonymous request', async () => {
      await call('post', '/auth/logout').expect(401);
    });

    it("clears the session so /auth/me stops working with the same cookie", async () => {
      const member = await createActor(ctx);
      await call('get', '/auth/me', member).expect(200);

      const res = await request(ctx.app.getHttpServer())
        .post('/v1/auth/logout')
        .set('Cookie', member.cookie)
        .expect(204);
      const cleared = res.headers['set-cookie'][0];

      await request(ctx.app.getHttpServer()).get('/v1/auth/me').set('Cookie', cleared).expect(401);
    });
  });
});
