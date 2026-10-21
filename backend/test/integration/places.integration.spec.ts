import * as request from 'supertest';
import { Actor, TestContext, createActor, createTestApp, resetData } from './test-app';

// Integration tests of the places API through the whole application. The external provider is
// replaced (fetch is stubbed): no test depends on the network.
describe('Places API (integration)', () => {
  let ctx: TestContext;
  let member: Actor;
  let fetchMock: jest.SpyInstance;

  const search = (q?: string, actor?: Actor) => {
    let req = request(ctx.app.getHttpServer()).get('/v1/places/search').query(q === undefined ? {} : { q });
    if (actor) req = req.set('Cookie', actor.cookie);
    return req;
  };
  const reply = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as unknown as Response;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetData(ctx.dataSource);
    member = await createActor(ctx, { profile: null });
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());

  it('refuses an anonymous request, without calling the provider', async () => {
    await search('lyon').expect(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([['missing', undefined], ['too short', 'l'], ['too long', 'a'.repeat(61)]])(
    'answers 400 when the text is %s, without calling the provider',
    async (_label, q) => {
      await search(q, member).expect(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('returns the suggestions of the provider', async () => {
    fetchMock.mockResolvedValue(reply([{ nom: 'Lyon', codesPostaux: ['69001', '69002'] }]));

    const res = await search('lyo', member).expect(200);

    expect(res.body).toEqual({ available: true, suggestions: [{ name: 'Lyon', postalCode: '69001' }] });
  });

  it('still answers 200 with available false when the provider is down', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const res = await search('nice', member).expect(200);

    expect(res.body).toEqual({ available: false, suggestions: [] });
  });

  it('still answers 200 with available false when the provider answers an error', async () => {
    fetchMock.mockResolvedValue(reply([{ nom: 'Paris', codesPostaux: ['75001'] }], false, 503));

    const res = await search('paris', member).expect(200);

    expect(res.body).toEqual({ available: false, suggestions: [] });
  });
});
