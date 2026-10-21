import * as request from 'supertest';
import { Actor, TestContext, createActor, createTestApp, profileIdOf, resetData } from './test-app';

// Integration tests of the events API: real HTTP requests through the whole application
// (guards, validation pipe, services) against a real PostgreSQL test database.
describe('Events API (integration)', () => {
  let ctx: TestContext;
  let organizer: Actor;
  let alice: Actor;
  let bob: Actor;
  let carol: Actor;
  let moderator: Actor;

  const day = 86_400_000;
  const inDays = (days: number) => new Date(Date.now() + days * day).toISOString();

  function call(method: 'get' | 'post' | 'patch' | 'delete', path: string, actor?: Actor, body?: object) {
    let req = request(ctx.app.getHttpServer())[method](`/v1${path}`);
    if (actor) req = req.set('Cookie', actor.cookie);
    return body ? req.send(body) : req;
  }

  const eventBody = (overrides: object = {}) => ({
    title: 'Balade au parc',
    description: 'Une sortie conviviale',
    approximateLocation: 'Lyon',
    startsAt: inDays(2),
    capacity: 2,
    mainInterestId: 3,
    ...overrides,
  });

  // Creates an event through the API and, by default, publishes it.
  async function createEvent(owner: Actor, overrides: object = {}, publish = true): Promise<number> {
    const created = await call('post', '/events', owner, eventBody(overrides)).expect(201);
    if (publish) await call('post', `/events/${created.body.id}/publish`, owner).expect(200);
    return created.body.id;
  }

  const makePast = (id: number) =>
    ctx.dataSource.query(`UPDATE events SET starts_at = now() - interval '1 hour' WHERE id = $1`, [id]);

  const registeredRows = async (eventId: number): Promise<number> => {
    const [{ n }] = await ctx.dataSource.query(
      `SELECT count(*)::int AS n FROM event_registrations WHERE event_id = $1 AND status = 'registered'`,
      [eventId],
    );
    return n;
  };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetData(ctx.dataSource);
    organizer = await createActor(ctx);
    alice = await createActor(ctx);
    bob = await createActor(ctx);
    carol = await createActor(ctx);
    moderator = await createActor(ctx, { isAdmin: true });
  });

  describe('authentication', () => {
    it('refuses an anonymous request', async () => {
      await call('get', '/events').expect(401);
      await call('post', '/events', undefined, eventBody()).expect(401);
    });

    it('refuses a forged session cookie', async () => {
      const forged: Actor = { id: 1, cookie: 'access_token=not.a.real.token' };
      await call('get', '/events', forged).expect(401);
    });
  });

  describe('creation', () => {
    it('creates a draft whose organizer is the authenticated member', async () => {
      const res = await call('post', '/events', organizer, eventBody()).expect(201);
      expect(res.body).toMatchObject({
        status: 'draft',
        capacity: 2,
        registeredCount: 0,
        isOrganizer: true,
        myRegistration: null,
        mainInterest: { id: 3 },
        organizer: { id: await profileIdOf(ctx, organizer), displayName: `Member ${organizer.id}` },
      });
      expect(res.body.organizer).not.toHaveProperty('email');
    });

    it('designates the organizer by profile id, so that the link to their profile works', async () => {
      const id = await createEvent(organizer);
      const { body } = await call('get', `/events/${id}`, alice).expect(200);
      const profileId = await profileIdOf(ctx, organizer);

      expect(profileId).not.toBe(organizer.id); // the two id spaces differ in the tests
      expect(body.organizer.id).toBe(profileId);
      const profile = await call('get', `/profiles/${body.organizer.id}`, alice).expect(200);
      expect(profile.body.displayName).toBe(body.organizer.displayName);
    });

    it.each([
      ['a status', { status: 'published' }],
      ['an organizer id', { organizerId: 99 }],
      ['capacity 0', { capacity: 0 }],
      ['a negative capacity', { capacity: -1 }],
      ['a blank title', { title: '   ' }],
      ['an invalid date', { startsAt: 'tomorrow' }],
      ['a date in the past', { startsAt: inDays(-1) }],
      ['an unknown interest', { mainInterestId: 9999 }],
    ])('refuses %s', async (_name, change) => {
      await call('post', '/events', organizer, eventBody(change)).expect(400);
    });

    it('refuses a member whose profile is pending, blocked or missing', async () => {
      for (const profile of ['pending', 'blocked', null] as const) {
        const member = await createActor(ctx, { profile });
        await call('post', '/events', member, eventBody()).expect(403);
      }
    });

    it('refuses a suspended account', async () => {
      const suspended = await createActor(ctx, { accountStatus: 'suspended' });
      await call('post', '/events', suspended, eventBody()).expect(403);
    });
  });

  describe('visibility', () => {
    it("hides someone else's draft (404) but shows it to its organizer and to a moderator", async () => {
      const id = await createEvent(organizer, {}, false);
      await call('get', `/events/${id}`, alice).expect(404);
      await call('get', `/events/${id}`, organizer).expect(200);
      await call('get', `/events/${id}`, moderator).expect(200);
    });

    it('answers 404 for an unknown event and 400 for a non-numeric id', async () => {
      await call('get', '/events/99999', alice).expect(404);
      await call('get', '/events/abc', alice).expect(400);
    });

    it('shows a cancelled event to its organizer, a moderator and members with a registration row only', async () => {
      const id = await createEvent(organizer);
      await call('post', `/events/${id}/registrations`, alice).expect(201);
      await call('post', `/events/${id}/registrations`, bob).expect(201);
      await call('delete', `/events/${id}/registrations/me`, bob).expect(200); // bob withdraws
      await call('post', `/events/${id}/cancel`, organizer).expect(200);

      await call('get', `/events/${id}`, organizer).expect(200);
      await call('get', `/events/${id}`, moderator).expect(200);
      await call('get', `/events/${id}`, alice).expect(200); // registered
      await call('get', `/events/${id}`, bob).expect(200); // withdrew: still has a registration row
      await call('get', `/events/${id}`, carol).expect(404); // never registered
    });
  });

  describe('lifecycle', () => {
    it('goes draft → published → cancelled', async () => {
      const id = await createEvent(organizer, {}, false);
      let res = await call('post', `/events/${id}/publish`, organizer).expect(200);
      expect(res.body.status).toBe('published');
      res = await call('post', `/events/${id}/cancel`, organizer).expect(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('refuses to publish twice, to cancel a draft and to edit a cancelled event', async () => {
      const draft = await createEvent(organizer, {}, false);
      await call('post', `/events/${draft}/cancel`, organizer).expect(409); // a draft is deleted, not cancelled
      await call('post', `/events/${draft}/publish`, organizer).expect(200);
      await call('post', `/events/${draft}/publish`, organizer).expect(409);
      await call('post', `/events/${draft}/cancel`, organizer).expect(200);
      await call('patch', `/events/${draft}`, organizer, { title: 'Nouveau titre' }).expect(409);
    });

    it('refuses to publish an event whose start date has passed', async () => {
      const id = await createEvent(organizer, {}, false);
      await makePast(id);
      await call('post', `/events/${id}/publish`, organizer).expect(409);
    });

    it('completes a published event only once its start date has passed', async () => {
      const id = await createEvent(organizer);
      await call('post', `/events/${id}/complete`, organizer).expect(409);
      await makePast(id);
      const res = await call('post', `/events/${id}/complete`, organizer).expect(200);
      expect(res.body.status).toBe('completed');
    });

    it('deletes a draft, but never a published or cancelled event', async () => {
      const draft = await createEvent(organizer, {}, false);
      await call('delete', `/events/${draft}`, organizer).expect(204);
      await call('get', `/events/${draft}`, organizer).expect(404);

      const published = await createEvent(organizer);
      await call('delete', `/events/${published}`, organizer).expect(409);
      await call('post', `/events/${published}/cancel`, organizer).expect(200);
      await call('delete', `/events/${published}`, organizer).expect(409);
    });

    it('edits an event, but the status cannot be changed through PATCH', async () => {
      const id = await createEvent(organizer);
      const res = await call('patch', `/events/${id}`, organizer, { title: 'Balade 2', capacity: 5 }).expect(200);
      expect(res.body).toMatchObject({ title: 'Balade 2', capacity: 5, status: 'published' });
      await call('patch', `/events/${id}`, organizer, { status: 'cancelled' }).expect(400);
      await call('patch', `/events/${id}`, organizer, { organizerId: alice.id }).expect(400);
    });
  });

  describe('listing, filters and pagination', () => {
    it('lists only published events, with the pagination envelope', async () => {
      const published = await createEvent(organizer);
      await createEvent(organizer, { title: 'Brouillon' }, false);
      const cancelled = await createEvent(organizer, { title: 'Annulée' });
      await call('post', `/events/${cancelled}/cancel`, organizer).expect(200);

      const res = await call('get', '/events', alice).expect(200);
      expect(res.body).toMatchObject({ page: 1, limit: 12, total: 1 });
      expect(res.body.items.map((e: { id: number }) => e.id)).toEqual([published]);
    });

    it('filters by interest and by location, separately or together (case-insensitive, partial)', async () => {
      const lyonCooking = await createEvent(organizer, { approximateLocation: 'Lyon', mainInterestId: 3 });
      const lyonDancing = await createEvent(organizer, { approximateLocation: 'Lyon', mainInterestId: 6 });
      const parisCooking = await createEvent(organizer, { approximateLocation: 'Paris', mainInterestId: 3 });
      const ids = async (query: string) =>
        (await call('get', `/events?${query}`, alice).expect(200)).body.items
          .map((e: { id: number }) => e.id)
          .sort();

      expect(await ids('interest=3')).toEqual([lyonCooking, parisCooking].sort());
      expect(await ids('location=lyon')).toEqual([lyonCooking, lyonDancing].sort());
      expect(await ids('location=LYO')).toEqual([lyonCooking, lyonDancing].sort());
      expect(await ids('interest=3&location=lyon')).toEqual([lyonCooking]);
      expect(await ids('interest=9&location=lyon')).toEqual([]);
      expect(await ids('location=nantes')).toEqual([]);
      expect(await ids('')).toHaveLength(3);
      expect(parisCooking).toBeDefined();
    });

    it('searches "%" and "_" literally instead of as wildcards', async () => {
      await createEvent(organizer, { approximateLocation: 'Lyon' });
      expect((await call('get', '/events?location=%25', alice).expect(200)).body.total).toBe(0);
      expect((await call('get', '/events?location=L_on', alice).expect(200)).body.total).toBe(0);
    });

    it('paginates in start-date order and reports the total', async () => {
      const ids: number[] = [];
      for (let i = 0; i < 30; i++) {
        ids.push(await createEvent(organizer, { title: `Sortie ${i}`, startsAt: inDays(2 + i) }));
      }
      const first = (await call('get', '/events', alice).expect(200)).body;
      expect(first).toMatchObject({ page: 1, limit: 12, total: 30 });
      expect(first.items.map((e: { id: number }) => e.id)).toEqual(ids.slice(0, 12));

      const third = (await call('get', '/events?page=3&limit=12', alice).expect(200)).body;
      expect(third.items.map((e: { id: number }) => e.id)).toEqual(ids.slice(24, 30)); // last, partial page

      const beyond = (await call('get', '/events?page=4&limit=12', alice).expect(200)).body;
      expect(beyond.items).toEqual([]);
      expect(beyond.total).toBe(30);

      const small = (await call('get', '/events?limit=5&page=2', alice).expect(200)).body;
      expect(small.items.map((e: { id: number }) => e.id)).toEqual(ids.slice(5, 10));
    });

    it.each(['page=0', 'page=abc', 'limit=0', 'limit=51', 'interest=abc'])('refuses ?%s', async (query) => {
      await call('get', `/events?${query}`, alice).expect(400);
    });
  });

  describe('registrations', () => {
    it('registers a member and shows the registration to them', async () => {
      const id = await createEvent(organizer);
      const res = await call('post', `/events/${id}/registrations`, alice).expect(201);
      expect(res.body).toMatchObject({ registeredCount: 1, myRegistration: 'registered' });
      const seenByBob = await call('get', `/events/${id}`, bob).expect(200);
      expect(seenByBob.body).toMatchObject({ registeredCount: 1, myRegistration: null });
    });

    it('refuses a duplicate registration', async () => {
      const id = await createEvent(organizer);
      await call('post', `/events/${id}/registrations`, alice).expect(201);
      await call('post', `/events/${id}/registrations`, alice).expect(409);
      expect(await registeredRows(id)).toBe(1);
    });

    it('refuses a full event and lets a withdrawal free a place', async () => {
      const id = await createEvent(organizer, { capacity: 2 });
      await call('post', `/events/${id}/registrations`, alice).expect(201);
      await call('post', `/events/${id}/registrations`, bob).expect(201);
      const full = await call('post', `/events/${id}/registrations`, carol).expect(409);
      expect(full.body.message).toMatch(/full/);

      await call('delete', `/events/${id}/registrations/me`, alice).expect(200);
      await call('post', `/events/${id}/registrations`, carol).expect(201);
      await call('post', `/events/${id}/registrations`, alice).expect(409); // full again
    });

    it('reuses the same row when a member registers again after a withdrawal', async () => {
      const id = await createEvent(organizer, { capacity: 3 });
      await call('post', `/events/${id}/registrations`, alice).expect(201);
      const withdrawn = await call('delete', `/events/${id}/registrations/me`, alice).expect(200);
      expect(withdrawn.body).toMatchObject({ registeredCount: 0, myRegistration: 'withdrawn' });
      const again = await call('post', `/events/${id}/registrations`, alice).expect(201);
      expect(again.body).toMatchObject({ registeredCount: 1, myRegistration: 'registered' });

      const [{ n }] = await ctx.dataSource.query(
        `SELECT count(*)::int AS n FROM event_registrations WHERE event_id = $1 AND user_id = $2`,
        [id, alice.id],
      );
      expect(n).toBe(1); // still one row, never a duplicate
    });

    it('refuses to withdraw without a registration, or from a cancelled event', async () => {
      const id = await createEvent(organizer);
      await call('delete', `/events/${id}/registrations/me`, alice).expect(409);
      await call('post', `/events/${id}/registrations`, alice).expect(201);
      await call('post', `/events/${id}/cancel`, organizer).expect(200);
      await call('delete', `/events/${id}/registrations/me`, alice).expect(409);
    });

    it('forbids the organizer to register for their own event', async () => {
      const id = await createEvent(organizer);
      await call('post', `/events/${id}/registrations`, organizer).expect(403);
    });

    it('refuses a draft (404), a cancelled event, a completed event and a past event (409)', async () => {
      const draft = await createEvent(organizer, {}, false);
      await call('post', `/events/${draft}/registrations`, alice).expect(404);

      const cancelled = await createEvent(organizer);
      await call('post', `/events/${cancelled}/cancel`, organizer).expect(200);
      await call('post', `/events/${cancelled}/registrations`, alice).expect(409);

      const completed = await createEvent(organizer);
      await makePast(completed);
      await call('post', `/events/${completed}/complete`, organizer).expect(200);
      await call('post', `/events/${completed}/registrations`, alice).expect(409);

      const past = await createEvent(organizer);
      await makePast(past);
      await call('post', `/events/${past}/registrations`, alice).expect(409);
    });

    it('refuses a pending profile, a missing profile and a suspended account', async () => {
      const id = await createEvent(organizer);
      const pending = await createActor(ctx, { profile: 'pending' });
      const noProfile = await createActor(ctx, { profile: null });
      const suspended = await createActor(ctx, { accountStatus: 'suspended' });
      for (const member of [pending, noProfile, suspended]) {
        await call('post', `/events/${id}/registrations`, member).expect(403);
      }
      expect(await registeredRows(id)).toBe(0);
    });

    it('lets a moderator account register like any member', async () => {
      const id = await createEvent(organizer);
      await call('post', `/events/${id}/registrations`, moderator).expect(201);
    });

    it('refuses a capacity below the registered count, then accepts a larger one', async () => {
      const id = await createEvent(organizer, { capacity: 3 });
      await call('post', `/events/${id}/registrations`, alice).expect(201);
      await call('post', `/events/${id}/registrations`, bob).expect(201);
      await call('patch', `/events/${id}`, organizer, { capacity: 1 }).expect(409);
      await call('patch', `/events/${id}`, organizer, { capacity: 2 }).expect(200); // equal to the count: allowed
      await call('post', `/events/${id}/registrations`, carol).expect(409); // now full
      await call('patch', `/events/${id}`, organizer, { capacity: 3 }).expect(200);
      await call('post', `/events/${id}/registrations`, carol).expect(201);
    });
  });

  describe('simultaneous registrations', () => {
    it.each([1, 2, 3])('never exceeds the capacity (round %i: 6 members, 1 place)', async () => {
      const id = await createEvent(organizer, { capacity: 1 });
      const members = await Promise.all(Array.from({ length: 6 }, () => createActor(ctx)));

      const responses = await Promise.all(members.map((m) => call('post', `/events/${id}/registrations`, m)));
      const statuses = responses.map((r) => r.status).sort();

      expect(statuses).toEqual([201, 409, 409, 409, 409, 409]);
      expect(await registeredRows(id)).toBe(1);
    });

    it('accepts exactly the capacity (6 members, 3 places)', async () => {
      const id = await createEvent(organizer, { capacity: 3 });
      const members = await Promise.all(Array.from({ length: 6 }, () => createActor(ctx)));
      const responses = await Promise.all(members.map((m) => call('post', `/events/${id}/registrations`, m)));
      expect(responses.filter((r) => r.status === 201)).toHaveLength(3);
      expect(responses.filter((r) => r.status === 409)).toHaveLength(3);
      expect(await registeredRows(id)).toBe(3);
    });

    it('registers one member once when they send the same request three times at once', async () => {
      const id = await createEvent(organizer, { capacity: 5 });
      const responses = await Promise.all([1, 2, 3].map(() => call('post', `/events/${id}/registrations`, alice)));
      expect(responses.map((r) => r.status).sort()).toEqual([201, 409, 409]);
      expect(await registeredRows(id)).toBe(1);
    });
  });

  describe('permission boundaries', () => {
    it('forbids every organizer action to another member, and hides a draft from them', async () => {
      const published = await createEvent(organizer);
      await call('patch', `/events/${published}`, alice, { title: 'Piraté' }).expect(403);
      await call('post', `/events/${published}/cancel`, alice).expect(403);
      await call('post', `/events/${published}/complete`, alice).expect(403);
      await call('delete', `/events/${published}`, alice).expect(403);

      const draft = await createEvent(organizer, {}, false);
      await call('post', `/events/${draft}/publish`, alice).expect(404);
      await call('patch', `/events/${draft}`, alice, { title: 'Piraté' }).expect(404);
      await call('delete', `/events/${draft}`, alice).expect(404);
    });

    it('does not let a moderator edit or cancel through the organizer routes', async () => {
      const id = await createEvent(organizer);
      await call('patch', `/events/${id}`, moderator, { title: 'Modifié' }).expect(403);
      await call('post', `/events/${id}/cancel`, moderator).expect(403);
      const unchanged = await call('get', `/events/${id}`, organizer).expect(200);
      expect(unchanged.body).toMatchObject({ title: 'Balade au parc', status: 'published' });
    });
  });

  describe('my events', () => {
    it('returns the events I am registered for and the ones I organize', async () => {
      const mine = await createEvent(alice);
      const other = await createEvent(organizer);
      await call('post', `/events/${other}/registrations`, alice).expect(201);

      const res = await call('get', '/events/mine', alice).expect(200);
      expect(res.body.registered.map((e: { id: number }) => e.id)).toEqual([other]);
      expect(res.body.organized.map((e: { id: number }) => e.id)).toEqual([mine]);
    });

    it('does not list a withdrawn registration', async () => {
      const id = await createEvent(organizer);
      await call('post', `/events/${id}/registrations`, alice).expect(201);
      await call('delete', `/events/${id}/registrations/me`, alice).expect(200);
      const res = await call('get', '/events/mine', alice).expect(200);
      expect(res.body.registered).toEqual([]);
    });
  });
});
