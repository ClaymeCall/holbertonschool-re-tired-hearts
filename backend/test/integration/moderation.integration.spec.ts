import { Logger } from '@nestjs/common';
import * as request from 'supertest';
import { Actor, TestContext, createActor, createTestApp, profileIdOf, resetData } from './test-app';

// Integration tests of the moderation API: real HTTP requests through the whole application
// against a real PostgreSQL test database. Profile actions use the profile id, account actions
// the user id (user ids start at 1000 here, profile ids at 1: a mix-up cannot go unnoticed).
describe('Moderation API (integration)', () => {
  let ctx: TestContext;
  let moderator: Actor;
  let otherModerator: Actor;
  let member: Actor; // approved profile, owns the published event
  let memberP: number;
  let eventId: number;

  type Method = 'get' | 'post';
  function call(method: Method, path: string, actor?: Actor, body?: object) {
    let req = request(ctx.app.getHttpServer())[method](`/v1${path}`);
    if (actor) req = req.set('Cookie', actor.cookie);
    return method === 'post' ? req.send(body ?? {}) : req;
  }

  const audit = (): Promise<object[]> =>
    ctx.dataSource.query(
      `SELECT moderator_id, target_type, target_id, action, reason FROM moderation_actions ORDER BY id`,
    );
  const profileStatus = async (actor: Actor): Promise<string> =>
    (await ctx.dataSource.query(`SELECT moderation_status FROM profiles WHERE user_id = $1`, [actor.id]))[0]
      .moderation_status;
  const account = async (actor: Actor): Promise<{ account_status: string; suspended_at: Date | null }> =>
    (await ctx.dataSource.query(`SELECT account_status, suspended_at FROM users WHERE id = $1`, [actor.id]))[0];
  const eventStatus = async (id: number): Promise<string> =>
    (await ctx.dataSource.query(`SELECT status FROM events WHERE id = $1`, [id]))[0].status;
  async function insertEvent(organizer: Actor, status: string): Promise<number> {
    const [{ id }] = await ctx.dataSource.query(
      `INSERT INTO events (organizer_id, main_interest_id, title, description, approximate_location, starts_at, capacity, status)
       VALUES ($1, 1, 'Sortie', 'd', 'Lyon', now() + interval '2 days', 10, $2::event_status) RETURNING id`,
      [organizer.id, status],
    );
    return id;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetData(ctx.dataSource);
    moderator = await createActor(ctx, { isAdmin: true });
    otherModerator = await createActor(ctx, { isAdmin: true });
    member = await createActor(ctx);
    memberP = await profileIdOf(ctx, member);
    eventId = await insertEvent(member, 'published');
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await ctx.dataSource.query(`DROP TRIGGER IF EXISTS fail_audit ON moderation_actions`);
    await ctx.dataSource.query(`DROP FUNCTION IF EXISTS fail_audit()`);
  });

  describe('access control on every route', () => {
    // Targets that exist, so a refusal can only come from the guards, never from a 404.
    const routes: [string, Method, (ids: { profile: number; user: number; event: number }) => string][] = [
      ['GET /moderation/profiles', 'get', () => '/moderation/profiles?status=pending'],
      ['GET /moderation/actions', 'get', () => '/moderation/actions'],
      ['POST /moderation/profiles/:id/approve', 'post', (i) => `/moderation/profiles/${i.profile}/approve`],
      ['POST /moderation/profiles/:id/block', 'post', (i) => `/moderation/profiles/${i.profile}/block`],
      ['POST /moderation/profiles/:id/unblock', 'post', (i) => `/moderation/profiles/${i.profile}/unblock`],
      ['POST /moderation/users/:id/suspend', 'post', (i) => `/moderation/users/${i.user}/suspend`],
      ['POST /moderation/users/:id/reactivate', 'post', (i) => `/moderation/users/${i.user}/reactivate`],
      ['POST /moderation/events/:id/cancel', 'post', (i) => `/moderation/events/${i.event}/cancel`],
    ];
    const pathOf = (build: (ids: { profile: number; user: number; event: number }) => string) =>
      build({ profile: memberP, user: member.id, event: eventId });

    it.each(routes)('%s refuses an anonymous caller (401)', async (_label, method, build) => {
      await call(method, pathOf(build)).expect(401);
    });

    it.each(routes)('%s refuses a member who is not a moderator (403), and changes nothing', async (_label, method, build) => {
      await call(method, pathOf(build), member).expect(403);

      expect(await audit()).toEqual([]);
      expect(await profileStatus(member)).toBe('approved');
      expect((await account(member)).account_status).toBe('active');
      expect(await eventStatus(eventId)).toBe('published');
    });

    it.each(routes)('%s refuses a suspended moderator (403)', async (_label, method, build) => {
      const suspended = await createActor(ctx, { isAdmin: true, accountStatus: 'suspended' });

      await call(method, pathOf(build), suspended).expect(403);
      expect(await audit()).toEqual([]);
    });
  });

  describe('profiles', () => {
    const transitions: [string, string, string, number, string][] = [
      // [status before, action, status after, HTTP code, audit action]
      ['pending', 'approve', 'approved', 200, 'approve_profile'],
      ['pending', 'block', 'blocked', 200, 'block_profile'],
      ['pending', 'unblock', 'pending', 409, 'unblock_profile'],
      ['approved', 'approve', 'approved', 409, 'approve_profile'],
      ['approved', 'block', 'blocked', 200, 'block_profile'],
      ['approved', 'unblock', 'approved', 409, 'unblock_profile'],
      ['blocked', 'approve', 'blocked', 409, 'approve_profile'],
      ['blocked', 'block', 'blocked', 409, 'block_profile'],
      ['blocked', 'unblock', 'approved', 200, 'unblock_profile'],
    ];

    it.each(transitions)(
      'profile %s: %s -> %s (%i)',
      async (before, action, after, code, auditAction) => {
        const target = await createActor(ctx, { profile: before as 'pending' | 'approved' | 'blocked' });
        const targetP = await profileIdOf(ctx, target);

        const res = await call('post', `/moderation/profiles/${targetP}/${action}`, moderator, { reason: 'because' });

        expect(res.status).toBe(code);
        expect(await profileStatus(target)).toBe(after);
        if (code === 200) {
          expect(res.body).toMatchObject({ id: targetP, moderationStatus: after });
          expect(await audit()).toEqual([
            { moderator_id: moderator.id, target_type: 'profile', target_id: targetP, action: auditAction, reason: 'because' },
          ]);
        } else {
          expect(await audit()).toEqual([]); // a refused action leaves no trace
        }
      },
    );

    it('designates a profile by its profile id, never by the user id', async () => {
      const pending = await createActor(ctx, { profile: 'pending' });
      const pendingP = await profileIdOf(ctx, pending);
      expect(pending.id).not.toBe(pendingP);

      await call('post', `/moderation/profiles/${pending.id}/approve`, moderator).expect(404);
      expect(await profileStatus(pending)).toBe('pending');

      await call('post', `/moderation/profiles/${pendingP}/approve`, moderator).expect(200);
    });

    it('answers 404 for an unknown profile, without writing an audit row', async () => {
      await call('post', '/moderation/profiles/99999/approve', moderator).expect(404);
      expect(await audit()).toEqual([]);
    });

    it('lists the profiles of one status, by profile id', async () => {
      const pending1 = await createActor(ctx, { profile: 'pending' });
      const pending2 = await createActor(ctx, { profile: 'pending' });

      const res = await call('get', '/moderation/profiles?status=pending', moderator).expect(200);

      expect(res.body.map((p: { id: number }) => p.id)).toEqual([
        await profileIdOf(ctx, pending1),
        await profileIdOf(ctx, pending2),
      ]);
      expect(res.body.every((p: { moderationStatus: string }) => p.moderationStatus === 'pending')).toBe(true);
    });

    it('rejects an unknown status filter and a missing one (400)', async () => {
      await call('get', '/moderation/profiles?status=banana', moderator).expect(400);
      await call('get', '/moderation/profiles', moderator).expect(400);
    });

    it('keeps the reason optional, trimmed, and limited to 500 characters', async () => {
      const pending = await createActor(ctx, { profile: 'pending' });
      const pendingP = await profileIdOf(ctx, pending);

      await call('post', `/moderation/profiles/${pendingP}/block`, moderator, { reason: 'x'.repeat(501) }).expect(400);
      await call('post', `/moderation/profiles/${pendingP}/block`, moderator, { unknown: 1 }).expect(400);
      expect(await audit()).toEqual([]);

      await call('post', `/moderation/profiles/${pendingP}/block`, moderator, { reason: '  spam  ' }).expect(200);
      await call('post', `/moderation/profiles/${pendingP}/unblock`, moderator).expect(200);
      expect(await audit()).toMatchObject([{ reason: 'spam' }, { reason: null }]);
    });

    it('a blocked profile can no longer browse events, and unblocking restores it', async () => {
      await call('get', '/events', member).expect(200);

      await call('post', `/moderation/profiles/${memberP}/block`, moderator).expect(200);
      await call('get', '/events', member).expect(403);

      await call('post', `/moderation/profiles/${memberP}/unblock`, moderator).expect(200);
      await call('get', '/events', member).expect(200);
    });

    it('refuses to moderate your own profile or another moderator\'s profile (403)', async () => {
      const ownPending = await createActor(ctx, { isAdmin: true, profile: 'pending' });
      const ownP = await profileIdOf(ctx, ownPending);
      const otherP = await profileIdOf(ctx, otherModerator);

      await call('post', `/moderation/profiles/${ownP}/approve`, ownPending).expect(403);
      await call('post', `/moderation/profiles/${otherP}/block`, moderator).expect(403);

      expect(await profileStatus(ownPending)).toBe('pending');
      expect(await profileStatus(otherModerator)).toBe('approved');
      expect(await audit()).toEqual([]);
    });
  });

  describe('accounts', () => {
    it('suspends an active account: the member loses access but can still read their restriction', async () => {
      const res = await call('post', `/moderation/users/${member.id}/suspend`, moderator, { reason: 'reported' }).expect(200);

      expect(res.body).toMatchObject({ id: member.id, accountStatus: 'suspended' });
      expect(res.body).not.toHaveProperty('passwordHash');
      const row = await account(member);
      expect(row.account_status).toBe('suspended');
      expect(row.suspended_at).not.toBeNull();
      expect(await audit()).toEqual([
        { moderator_id: moderator.id, target_type: 'user_account', target_id: member.id, action: 'suspend_account', reason: 'reported' },
      ]);

      await call('get', '/events', member).expect(403);
      const me = await call('get', '/auth/me', member).expect(200);
      expect(me.body.accountStatus).toBe('suspended');
    });

    it('reactivates a suspended account, clearing the suspension date', async () => {
      await call('post', `/moderation/users/${member.id}/suspend`, moderator).expect(200);

      const res = await call('post', `/moderation/users/${member.id}/reactivate`, moderator).expect(200);

      expect(res.body).toMatchObject({ accountStatus: 'active' });
      const row = await account(member);
      expect(row.account_status).toBe('active');
      expect(row.suspended_at).toBeNull();
      await call('get', '/events', member).expect(200);
      expect(await audit()).toMatchObject([{ action: 'suspend_account' }, { action: 'reactivate_account' }]);
    });

    it('answers 409 for a transition the status does not allow, without an audit row', async () => {
      await call('post', `/moderation/users/${member.id}/reactivate`, moderator).expect(409); // active
      await call('post', `/moderation/users/${member.id}/suspend`, moderator).expect(200);
      await call('post', `/moderation/users/${member.id}/suspend`, moderator).expect(409); // already suspended

      const deleted = await createActor(ctx);
      await ctx.dataSource.query(
        `UPDATE users SET account_status = 'self_deleted', self_deleted_at = now() WHERE id = $1`,
        [deleted.id],
      );
      await call('post', `/moderation/users/${deleted.id}/suspend`, moderator).expect(409);
      await call('post', `/moderation/users/${deleted.id}/reactivate`, moderator).expect(409);

      expect(await audit()).toHaveLength(1); // only the one successful suspension
    });

    it('answers 404 for an unknown account', async () => {
      await call('post', '/moderation/users/99999/suspend', moderator).expect(404);
      expect(await audit()).toEqual([]);
    });

    it('refuses to moderate your own account or another moderator\'s account (403)', async () => {
      // Each rule has its own message: the self rule must not be hidden behind the moderator rule.
      const self = await call('post', `/moderation/users/${moderator.id}/suspend`, moderator).expect(403);
      expect(self.body.message).toBe('You cannot moderate your own account.');
      await call('post', `/moderation/users/${moderator.id}/reactivate`, moderator).expect(403);
      const other = await call('post', `/moderation/users/${otherModerator.id}/suspend`, moderator).expect(403);
      expect(other.body.message).toBe("You cannot moderate another moderator's account.");

      expect((await account(moderator)).account_status).toBe('active');
      expect((await account(otherModerator)).account_status).toBe('active');
      expect(await audit()).toEqual([]);
    });
  });

  describe('events', () => {
    it('cancels a published event of any organizer, through the audited route', async () => {
      const res = await call('post', `/moderation/events/${eventId}/cancel`, moderator, { reason: 'spam' }).expect(200);

      expect(res.body).toMatchObject({ id: eventId, status: 'cancelled' });
      expect(await eventStatus(eventId)).toBe('cancelled');
      expect(await audit()).toEqual([
        { moderator_id: moderator.id, target_type: 'event', target_id: eventId, action: 'cancel_event', reason: 'spam' },
      ]);
    });

    it.each(['draft', 'cancelled', 'completed'])('answers 409 for a %s event, without an audit row', async (status) => {
      const id = await insertEvent(member, status);

      await call('post', `/moderation/events/${id}/cancel`, moderator).expect(409);

      expect(await eventStatus(id)).toBe(status);
      expect(await audit()).toEqual([]);
    });

    it('answers 404 for an unknown event', async () => {
      await call('post', '/moderation/events/99999/cancel', moderator).expect(404);
      expect(await audit()).toEqual([]);
    });

    it('does not give a moderator the organizer route: a moderator cancelling through it gets 403', async () => {
      await call('post', `/events/${eventId}/cancel`, moderator).expect(403);

      expect(await eventStatus(eventId)).toBe('published');
    });
  });

  describe('audit log', () => {
    it('is empty at first, then lists the actions most recent first', async () => {
      expect((await call('get', '/moderation/actions', moderator).expect(200)).body).toEqual([]);

      const pending = await createActor(ctx, { profile: 'pending' });
      const pendingP = await profileIdOf(ctx, pending);
      await call('post', `/moderation/profiles/${pendingP}/approve`, moderator, { reason: 'ok' }).expect(200);
      await call('post', `/moderation/users/${member.id}/suspend`, otherModerator).expect(200);

      const res = await call('get', '/moderation/actions', moderator).expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        moderatorId: otherModerator.id,
        targetType: 'user_account',
        targetId: member.id,
        action: 'suspend_account',
        reason: null,
      });
      expect(res.body[1]).toMatchObject({
        moderatorId: moderator.id,
        targetType: 'profile',
        targetId: pendingP,
        action: 'approve_profile',
        reason: 'ok',
      });
      expect(typeof res.body[0].createdAt).toBe('string');
    });
  });

  describe('consistency under failure and concurrency', () => {
    // [label, how to build the path, how to read the state that must be rolled back]
    const operations: [string, () => Promise<{ path: string; stateIsUntouched: () => Promise<boolean> }>][] = [
      [
        'approving a profile',
        async () => {
          const pending = await createActor(ctx, { profile: 'pending' });
          const id = await profileIdOf(ctx, pending);
          return { path: `/moderation/profiles/${id}/approve`, stateIsUntouched: async () => (await profileStatus(pending)) === 'pending' };
        },
      ],
      [
        'suspending an account',
        async () => ({
          path: `/moderation/users/${member.id}/suspend`,
          stateIsUntouched: async () => (await account(member)).account_status === 'active',
        }),
      ],
      [
        'cancelling an event',
        async () => ({
          path: `/moderation/events/${eventId}/cancel`,
          stateIsUntouched: async () => (await eventStatus(eventId)) === 'published',
        }),
      ],
    ];

    it.each(operations)('%s is rolled back when the audit row cannot be written', async (_label, prepare) => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined); // the expected 500 is not noise
      await ctx.dataSource.query(
        `CREATE FUNCTION fail_audit() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'audit unavailable'; END $$ LANGUAGE plpgsql`,
      );
      await ctx.dataSource.query(
        `CREATE TRIGGER fail_audit BEFORE INSERT ON moderation_actions FOR EACH ROW EXECUTE FUNCTION fail_audit()`,
      );
      const { path, stateIsUntouched } = await prepare();

      await call('post', path, moderator).expect(500);

      expect(await stateIsUntouched()).toBe(true); // no moderation without its audit trace
    });

    it.each(operations)('%s: of two simultaneous moderators, exactly one succeeds', async (_label, prepare) => {
      const { path } = await prepare();

      const results = await Promise.all([call('post', path, moderator), call('post', path, otherModerator)]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await audit()).toHaveLength(1);
    });
  });
});
