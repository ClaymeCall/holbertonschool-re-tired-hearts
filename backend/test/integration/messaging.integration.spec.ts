import * as request from 'supertest';
import { Actor, TestContext, createActor, createTestApp, profileIdOf, resetData } from './test-app';

// Integration tests of the messaging API: real HTTP requests through the whole application
// against a real PostgreSQL test database. A person is always designated by their profile id.
describe('Messaging API (integration)', () => {
  let ctx: TestContext;
  let alice: Actor;
  let bob: Actor;
  let carol: Actor;
  let moderator: Actor;
  let aliceP: number;
  let bobP: number;
  let carolP: number;
  let moderatorP: number;

  function call(method: 'get' | 'post', path: string, actor?: Actor, body?: object) {
    let req = request(ctx.app.getHttpServer())[method](`/v1${path}`);
    if (actor) req = req.set('Cookie', actor.cookie);
    return body ? req.send(body) : req;
  }
  const send = (from: Actor, toProfile: number, content: unknown = 'Bonjour !') =>
    call('post', `/conversations/with/${toProfile}/messages`, from, { content });
  const history = (who: Actor, withProfile: number) => call('get', `/conversations/with/${withProfile}/messages`, who);

  // Gives two members a contact link by registering them to the same published event.
  async function shareAnEvent(organizer: Actor, members: Actor[], eventStatus = 'published'): Promise<number> {
    const [{ id }] = await ctx.dataSource.query(
      `INSERT INTO events (organizer_id, main_interest_id, title, description, approximate_location, starts_at, capacity, status)
       VALUES ($1, 1, 'Sortie', 'd', 'Lyon', now() + interval '2 days', 10, $2::event_status) RETURNING id`,
      [organizer.id, eventStatus],
    );
    for (const member of members) {
      await ctx.dataSource.query(`INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2)`, [id, member.id]);
    }
    return id;
  }
  const countRows = async (table: string): Promise<number> =>
    (await ctx.dataSource.query(`SELECT count(*)::int AS n FROM ${table}`))[0].n;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetData(ctx.dataSource);
    alice = await createActor(ctx);
    bob = await createActor(ctx);
    carol = await createActor(ctx);
    moderator = await createActor(ctx, { isAdmin: true });
    [aliceP, bobP, carolP, moderatorP] = await Promise.all(
      [alice, bob, carol, moderator].map((actor) => profileIdOf(ctx, actor)),
    );
  });

  describe('authentication and restricted members', () => {
    it('refuses an anonymous request on every route', async () => {
      await call('get', '/conversations').expect(401);
      await call('get', '/conversations/unread-count').expect(401);
      await call('get', `/conversations/with/${bobP}/messages`).expect(401);
      await call('post', `/conversations/with/${bobP}/messages`, undefined, { content: 'x' }).expect(401);
      await call('post', `/conversations/with/${bobP}/read`).expect(401);
    });

    it.each([
      ['a suspended account', { accountStatus: 'suspended' as const }],
      ['a pending profile', { profile: 'pending' as const }],
      ['a blocked profile', { profile: 'blocked' as const }],
      ['no profile', { profile: null }],
    ])('refuses %s on every route, even with a valid session', async (_name, options) => {
      const restricted = await createActor(ctx, options);
      await call('get', '/conversations', restricted).expect(403);
      await call('get', '/conversations/unread-count', restricted).expect(403);
      await call('get', `/conversations/with/${bobP}/messages`, restricted).expect(403);
      await call('post', `/conversations/with/${bobP}/read`, restricted).expect(403);
      await send(restricted, bobP).expect(403);
    });
  });

  describe('starting a conversation', () => {
    it('refuses the first message when there is no contact link', async () => {
      await send(alice, bobP).expect(403);
      expect(await countRows('conversations')).toBe(0);
    });

    it('accepts it when both are registered for the same event', async () => {
      await shareAnEvent(carol, [alice, bob]);
      const res = await send(alice, bobP, 'Bonjour Bob').expect(201);
      expect(res.body).toMatchObject({ content: 'Bonjour Bob', fromMe: true });
      expect(await countRows('conversations')).toBe(1);
    });

    it('accepts it between a registered member and the organizer, in both directions', async () => {
      await shareAnEvent(carol, [alice]);
      await send(alice, carolP).expect(201); // the registered member writes first
      await ctx.dataSource.query('TRUNCATE messages, conversations RESTART IDENTITY CASCADE');
      await send(carol, aliceP).expect(201); // the organizer writes first
    });

    it('still accepts it when the shared event is cancelled', async () => {
      await shareAnEvent(carol, [alice, bob], 'cancelled');
      await send(alice, bobP).expect(201);
    });

    it('refuses it when the registration was withdrawn', async () => {
      const eventId = await shareAnEvent(carol, [alice, bob]);
      await ctx.dataSource.query(
        `UPDATE event_registrations SET status = 'withdrawn' WHERE event_id = $1 AND user_id = $2`,
        [eventId, bob.id],
      );
      await send(alice, bobP).expect(403);
    });

    it('lets a moderator write to anyone without a contact link', async () => {
      await send(moderator, carolP).expect(201);
    });

    it("keeps the recipient's conditions even for a moderator", async () => {
      await ctx.dataSource.query(`UPDATE profiles SET messaging_enabled = false WHERE id = $1`, [carolP]);
      await send(moderator, carolP).expect(403);
    });

    it('answers 404 for an unknown person, a pending profile and a suspended recipient', async () => {
      await shareAnEvent(carol, [alice]);
      await send(alice, 99999).expect(404);
      const pending = await createActor(ctx, { profile: 'pending' });
      await send(alice, await profileIdOf(ctx, pending)).expect(404);
      const suspended = await createActor(ctx, { accountStatus: 'suspended' });
      await send(alice, await profileIdOf(ctx, suspended)).expect(404);
    });

    it('answers 400 when writing to oneself and for a non-numeric id', async () => {
      await send(alice, aliceP).expect(400);
      await call('post', '/conversations/with/abc/messages', alice, { content: 'x' }).expect(400);
    });

    it('creates exactly one conversation when both write first at the same instant', async () => {
      await shareAnEvent(carol, [alice, bob]);
      const [fromAlice, fromBob] = await Promise.all([send(alice, bobP, 'Salut'), send(bob, aliceP, 'Coucou')]);
      expect([fromAlice.status, fromBob.status]).toEqual([201, 201]);

      expect(await countRows('conversations')).toBe(1);
      expect(await countRows('messages')).toBe(2);
      const [pair] = await ctx.dataSource.query(`SELECT participant_one_id AS one, participant_two_id AS two FROM conversations`);
      expect(pair.one).toBeLessThan(pair.two);
    });
  });

  describe('privacy switch and restrictions on an existing conversation', () => {
    beforeEach(async () => {
      await shareAnEvent(carol, [alice, bob]);
      await send(alice, bobP, 'Premier message').expect(201);
    });

    it('continues after a withdrawal from the event: no contact link is needed any more', async () => {
      await ctx.dataSource.query(`UPDATE event_registrations SET status = 'withdrawn'`);
      await send(bob, aliceP, 'Toujours là').expect(201);
    });

    it('refuses new messages from both sides when one of them turned messaging off, but keeps the history', async () => {
      await ctx.dataSource.query(`UPDATE profiles SET messaging_enabled = false WHERE id = $1`, [bobP]);
      expect((await send(alice, bobP).expect(403)).body.message).toMatch(/does not accept/);
      expect((await send(bob, aliceP).expect(403)).body.message).toMatch(/turned off/);
      expect((await history(alice, bobP).expect(200)).body).toHaveLength(1);
      expect((await history(bob, aliceP).expect(200)).body).toHaveLength(1);
    });

    it('lets the remaining member read the history when the other account is suspended, and hides account details', async () => {
      await ctx.dataSource.query(`UPDATE users SET account_status = 'suspended', suspended_at = now() WHERE id = $1`, [bob.id]);
      expect((await history(alice, bobP).expect(200)).body).toHaveLength(1);
      await send(alice, bobP).expect(404); // the suspended member is no longer reachable

      const list = (await call('get', '/conversations', alice).expect(200)).body;
      expect(list[0].person).toEqual({ id: bobP, displayName: null, approximateLocation: null, available: false });

      await history(bob, aliceP).expect(403); // the restricted member cannot use messaging
    });
  });

  describe('message content', () => {
    beforeEach(async () => {
      await shareAnEvent(carol, [alice, bob]);
    });

    it.each([
      ['an empty message', ''],
      ['only spaces', '   '],
      ['only a line break and a tab', '\n\t'],
      ['1,001 characters', 'a'.repeat(1001)],
      ['1,001 emojis', '😀'.repeat(1001)],
    ])('refuses %s with 400 and a clear message', async (_name, content) => {
      const res = await send(alice, bobP, content).expect(400);
      expect(JSON.stringify(res.body.message)).toMatch(/empty|longer/);
    });

    it('accepts 1,000 characters, and 1,000 emojis (counted as characters)', async () => {
      await send(alice, bobP, 'a'.repeat(1000)).expect(201);
      await send(alice, bobP, '😀'.repeat(1000)).expect(201);
    });

    it('refuses a missing or non-text content, and any extra field (sender, recipient...)', async () => {
      await call('post', `/conversations/with/${bobP}/messages`, alice, {}).expect(400);
      await send(alice, bobP, 42).expect(400);
      for (const field of ['senderId', 'recipientId', 'fromMe', 'readAt']) {
        await call('post', `/conversations/with/${bobP}/messages`, alice, { content: 'x', [field]: carol.id }).expect(400);
      }
      expect(await countRows('messages')).toBe(0);
    });

    it('trims the message and stores HTML as plain text, unchanged', async () => {
      await send(alice, bobP, '  <script>alert(1)</script>  ').expect(201);
      const [row] = await ctx.dataSource.query(`SELECT content FROM messages`);
      expect(row.content).toBe('<script>alert(1)</script>');
      const res = await history(bob, aliceP).expect(200);
      expect(res.body[0].content).toBe('<script>alert(1)</script>');
      expect(res.headers['content-type']).toMatch(/application\/json/); // never served as HTML
    });

    it('takes the sender from the session: the sender and the recipient see opposite fromMe flags', async () => {
      await send(alice, bobP, 'De la part de Alice').expect(201);
      expect((await history(alice, bobP)).body[0].fromMe).toBe(true);
      expect((await history(bob, aliceP)).body[0].fromMe).toBe(false);
      const [row] = await ctx.dataSource.query(`SELECT sender_id FROM messages`);
      expect(row.sender_id).toBe(alice.id);
    });
  });

  describe('history', () => {
    it('is empty before the first message, even for a person who cannot be written to yet', async () => {
      expect((await history(alice, bobP).expect(200)).body).toEqual([]);
    });

    it('is chronological, and `limit` keeps the most recent messages', async () => {
      await shareAnEvent(carol, [alice, bob]);
      for (const text of ['un', 'deux', 'trois', 'quatre', 'cinq']) {
        await send(text.length % 2 ? alice : bob, text.length % 2 ? bobP : aliceP, text).expect(201);
      }
      const all = (await history(alice, bobP).expect(200)).body;
      expect(all.map((m: { content: string }) => m.content)).toEqual(['un', 'deux', 'trois', 'quatre', 'cinq']);
      const last = (await call('get', `/conversations/with/${bobP}/messages?limit=2`, alice).expect(200)).body;
      expect(last.map((m: { content: string }) => m.content)).toEqual(['quatre', 'cinq']);
      await call('get', `/conversations/with/${bobP}/messages?limit=0`, alice).expect(400);
      await call('get', `/conversations/with/${bobP}/messages?limit=201`, alice).expect(400);
    });

    it('answers 404 for an unknown person and for an unreachable person with no history', async () => {
      await history(alice, 99999).expect(404);
      const suspended = await createActor(ctx, { accountStatus: 'suspended' });
      await history(alice, await profileIdOf(ctx, suspended)).expect(404);
    });
  });

  describe('privacy boundaries', () => {
    beforeEach(async () => {
      await shareAnEvent(carol, [alice, bob]);
      await send(alice, bobP, 'Message privé entre Alice et Bob').expect(201);
    });

    it('never shows a conversation to a third member: every route is "my conversation with X"', async () => {
      expect((await history(carol, aliceP).expect(200)).body).toEqual([]); // carol and alice have no conversation
      expect((await history(carol, bobP).expect(200)).body).toEqual([]);
      expect((await call('get', '/conversations', carol).expect(200)).body).toEqual([]);
    });

    it('gives a moderator no access to other members\' conversations', async () => {
      expect((await history(moderator, aliceP).expect(200)).body).toEqual([]);
      expect((await history(moderator, bobP).expect(200)).body).toEqual([]);
      expect((await call('get', '/conversations', moderator).expect(200)).body).toEqual([]);
    });

    it('has no route addressed by a conversation id, so there is no identifier to change', async () => {
      await call('get', '/conversations/1/messages', carol).expect(404);
      await call('get', '/conversations/1', carol).expect(404);
    });
  });

  describe('conversation list and unread counters', () => {
    beforeEach(async () => {
      await shareAnEvent(carol, [alice, bob]);
    });

    it('lists my conversations, most recent first, with the last message and the unread count', async () => {
      await send(alice, bobP, 'Pour Bob 1').expect(201);
      await send(carol, aliceP, 'De Carol').expect(201); // carol is the organizer: a link exists with alice
      await send(alice, bobP, 'Pour Bob 2').expect(201);

      const list = (await call('get', '/conversations', alice).expect(200)).body;
      expect(list.map((c: { person: { id: number } }) => c.person.id)).toEqual([bobP, carolP]);
      expect(list[0]).toMatchObject({
        person: { id: bobP, displayName: `Member ${bob.id}`, approximateLocation: 'Lyon', available: true },
        lastMessage: { content: 'Pour Bob 2', fromMe: true },
        unreadCount: 0,
      });
      expect(list[1]).toMatchObject({ lastMessage: { content: 'De Carol', fromMe: false }, unreadCount: 1 });
    });

    it('counts unread messages for the recipient only, and marking as read resets them', async () => {
      await send(alice, bobP, 'Un').expect(201);
      await send(alice, bobP, 'Deux').expect(201);

      expect((await call('get', '/conversations/unread-count', bob).expect(200)).body).toEqual({ unreadCount: 2 });
      expect((await call('get', '/conversations/unread-count', alice).expect(200)).body).toEqual({ unreadCount: 0 });
      expect((await call('get', '/conversations', bob).expect(200)).body[0].unreadCount).toBe(2);

      await history(bob, aliceP).expect(200); // reading the history does not mark it as read by itself
      expect((await call('get', '/conversations/unread-count', bob).expect(200)).body.unreadCount).toBe(2);

      await call('post', `/conversations/with/${aliceP}/read`, bob).expect(204);
      expect((await call('get', '/conversations/unread-count', bob).expect(200)).body.unreadCount).toBe(0);

      await send(alice, bobP, 'Trois').expect(201);
      expect((await call('get', '/conversations/unread-count', bob).expect(200)).body.unreadCount).toBe(1);
    });

    it("never reveals read status to the sender and does not touch the sender's own messages", async () => {
      await send(alice, bobP, 'Lu ?').expect(201);
      await call('post', `/conversations/with/${aliceP}/read`, bob).expect(204);
      const res = (await history(alice, bobP).expect(200)).body[0];
      expect(res).not.toHaveProperty('readAt');
      expect(res).not.toHaveProperty('read');
      expect((await call('get', '/conversations/unread-count', alice).expect(200)).body.unreadCount).toBe(0);
    });

    it('marking as read with no conversation is harmless (204)', async () => {
      await call('post', `/conversations/with/${carolP}/read`, alice).expect(204);
    });
  });
});
