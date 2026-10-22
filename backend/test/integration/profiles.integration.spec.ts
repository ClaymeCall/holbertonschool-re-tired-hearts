import * as request from 'supertest';
import { Actor, TestContext, createActor, createTestApp, profileIdOf, resetData } from './test-app';

// Integration tests of the profiles API: real HTTP requests through the whole application
// (guards, validation pipe, services) against a real PostgreSQL test database. Authorization
// behavior follows docs/profile-visibility-rules.md and docs/role-assignment-rules.md.
describe('Profiles API (integration)', () => {
  let ctx: TestContext;

  function call(method: 'get' | 'patch', path: string, actor?: Actor, body?: object) {
    let req = request(ctx.app.getHttpServer())[method](`/v1${path}`);
    if (actor) req = req.set('Cookie', actor.cookie);
    return body ? req.send(body) : req;
  }

  const profileBody = (overrides: object = {}) => ({
    displayName: 'Jane D.',
    approximateLocation: 'Lyon',
    ...overrides,
  });

  const setModerationStatus = (profileId: number, status: 'pending' | 'approved' | 'blocked') =>
    ctx.dataSource.query(`UPDATE profiles SET moderation_status = $1::moderation_status WHERE id = $2`, [
      status,
      profileId,
    ]);

  const setAccountStatus = (userId: number, status: 'active' | 'suspended' | 'self_deleted') =>
    ctx.dataSource.query(
      `UPDATE users SET account_status = $1::account_status,
              self_deleted_at = CASE WHEN $1::account_status = 'self_deleted' THEN now() END
       WHERE id = $2`,
      [status, userId],
    );

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetData(ctx.dataSource);
  });

  describe('authentication', () => {
    it('refuses an anonymous request on every route', async () => {
      await call('get', '/profiles').expect(401);
      await call('get', '/profiles/me').expect(401);
      await call('get', '/profiles/1').expect(401);
      await call('patch', '/profiles/me', undefined, profileBody()).expect(401);
    });

    it('refuses a forged session cookie', async () => {
      const forged: Actor = { id: 1, cookie: 'access_token=not.a.real.token' };
      await call('get', '/profiles/me', forged).expect(401);
    });
  });

  describe('GET /profiles/me', () => {
    it('answers 404 before the member has ever created a profile', async () => {
      const member = await createActor(ctx, { profile: null });
      await call('get', '/profiles/me', member).expect(404);
    });

    it('shows the owner their own profile in full, whatever its moderation status', async () => {
      for (const status of ['pending', 'approved', 'blocked'] as const) {
        const member = await createActor(ctx, { profile: status });
        const res = await call('get', '/profiles/me', member).expect(200);
        expect(res.body).toMatchObject({ moderationStatus: status, displayName: `Member ${member.id}` });
      }
    });
  });

  describe('PATCH /profiles/me', () => {
    it('creates the profile as pending on first save, then updates it in place', async () => {
      const member = await createActor(ctx, { profile: null });
      const created = await call('patch', '/profiles/me', member, profileBody({ bio: 'Bonjour' })).expect(200);
      expect(created.body).toMatchObject({ moderationStatus: 'pending', displayName: 'Jane D.', bio: 'Bonjour' });

      const updated = await call('patch', '/profiles/me', member, profileBody({ displayName: 'Jane M.' })).expect(200);
      expect(updated.body).toMatchObject({ id: created.body.id, displayName: 'Jane M.', moderationStatus: 'pending' });
    });

    it('lets a member with a pending or blocked profile keep editing it', async () => {
      for (const status of ['pending', 'blocked'] as const) {
        const member = await createActor(ctx, { profile: status });
        const res = await call('patch', '/profiles/me', member, profileBody({ displayName: 'Edited' })).expect(200);
        expect(res.body).toMatchObject({ displayName: 'Edited', moderationStatus: status });
      }
    });

    it.each([
      ['an isAdmin field: elevated roles are never self-assignable', { isAdmin: true }],
      ['a moderationStatus field: approval is never self-service', { moderationStatus: 'approved' }],
      ['a blank display name', { displayName: '' }],
      ['a blank approximate location', { approximateLocation: '' }],
      ['an unknown interest id', { interestIds: [9999] }],
    ])('rejects a profile save with %s', async (_name, change) => {
      const member = await createActor(ctx, { profile: null });
      await call('patch', '/profiles/me', member, profileBody(change)).expect(400);
    });

    it('has no route to edit another member\'s profile by id', async () => {
      const member = await createActor(ctx);
      await call('patch', '/profiles/123', member, profileBody()).expect(404); // unmatched route, not a 403
    });

    it('saves the chosen interests and the messaging preference', async () => {
      const member = await createActor(ctx, { profile: null });
      const res = await call('patch', '/profiles/me', member, profileBody({ interestIds: [1, 3], messagingEnabled: false })).expect(200);
      expect(res.body.messagingEnabled).toBe(false);
      expect(res.body.interests.map((i: { id: number }) => i.id).sort()).toEqual([1, 3]);
    });
  });

  describe('GET /profiles (discovery)', () => {
    it('lists only approved profiles, with the public field set', async () => {
      const approved = await createActor(ctx, { profile: 'approved' });
      await createActor(ctx, { profile: 'pending' });
      await createActor(ctx, { profile: 'blocked' });
      const viewer = await createActor(ctx, { profile: 'pending' }); // kept off this list itself

      const res = await call('get', '/profiles', viewer).expect(200);
      const approvedId = await profileIdOf(ctx, approved);
      expect(res.body.map((p: { id: number }) => p.id)).toEqual([approvedId]);

      const [profile] = res.body;
      expect(profile).toMatchObject({ displayName: `Member ${approved.id}`, approximateLocation: 'Lyon' });
      expect(profile).not.toHaveProperty('moderationStatus');
      expect(profile).toHaveProperty('messagingEnabled', true);
      expect(profile).not.toHaveProperty('email');
    });

    it('excludes an approved profile whose account is self_deleted', async () => {
      const deleted = await createActor(ctx, { profile: 'approved' });
      await setAccountStatus(deleted.id, 'self_deleted');
      const viewer = await createActor(ctx, { profile: 'pending' });

      const res = await call('get', '/profiles', viewer).expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /profiles/:id', () => {
    it('answers 404 for an unknown id and 400 for a non-numeric one', async () => {
      const viewer = await createActor(ctx);
      await call('get', '/profiles/99999', viewer).expect(404);
      await call('get', '/profiles/abc', viewer).expect(400);
    });

    it('hides a pending or blocked profile from another member (404, same as a non-existent id)', async () => {
      const viewer = await createActor(ctx);
      for (const status of ['pending', 'blocked'] as const) {
        const target = await createActor(ctx, { profile: status });
        await call('get', `/profiles/${await profileIdOf(ctx, target)}`, viewer).expect(404);
      }
    });

    it('hides an approved profile whose account is self_deleted', async () => {
      const deleted = await createActor(ctx, { profile: 'approved' });
      await setAccountStatus(deleted.id, 'self_deleted');
      const viewer = await createActor(ctx);
      await call('get', `/profiles/${await profileIdOf(ctx, deleted)}`, viewer).expect(404);
    });

    it('shows another member only the public fields of an approved profile', async () => {
      const target = await createActor(ctx, { profile: 'approved' });
      const viewer = await createActor(ctx);
      const res = await call('get', `/profiles/${await profileIdOf(ctx, target)}`, viewer).expect(200);
      expect(res.body).toMatchObject({ displayName: `Member ${target.id}` });
      expect(res.body).not.toHaveProperty('moderationStatus');
      expect(res.body).toHaveProperty('messagingEnabled', true);
      expect(res.body).not.toHaveProperty('email');
    });

    it('shows a moderator the full fields of any profile, whatever its status', async () => {
      const moderator = await createActor(ctx, { isAdmin: true });
      for (const status of ['pending', 'approved', 'blocked'] as const) {
        const target = await createActor(ctx, { profile: status });
        const res = await call('get', `/profiles/${await profileIdOf(ctx, target)}`, moderator).expect(200);
        expect(res.body).toMatchObject({ moderationStatus: status });
      }
    });

    it("shows the owner their own profile by id too, in full", async () => {
      const member = await createActor(ctx, { profile: 'pending' });
      const res = await call('get', `/profiles/${await profileIdOf(ctx, member)}`, member).expect(200);
      expect(res.body).toMatchObject({ moderationStatus: 'pending' });
    });
  });
});
