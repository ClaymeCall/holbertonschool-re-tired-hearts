import { PlacesService } from './places.service';

const reply = (body: unknown, init: { ok?: boolean; status?: number } = {}) =>
  ({ ok: init.ok ?? true, status: init.status ?? 200, json: async () => body }) as unknown as Response;

describe('PlacesService', () => {
  let service: PlacesService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    service = new PlacesService();
    fetchMock = jest.spyOn(globalThis, 'fetch');
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('maps municipalities to a name and their first postal code', async () => {
    fetchMock.mockResolvedValue(
      reply([
        { nom: 'Lyon', codesPostaux: ['69001', '69002'], code: '69123', _score: 2.8 },
        { nom: 'Lyons-la-Forêt', codesPostaux: ['27480'] },
      ]),
    );

    await expect(service.search('lyo')).resolves.toEqual({
      available: true,
      suggestions: [
        { name: 'Lyon', postalCode: '69001' },
        { name: 'Lyons-la-Forêt', postalCode: '27480' },
      ],
    });
  });

  it('asks the provider for 8 municipalities, with a timeout', async () => {
    fetchMock.mockResolvedValue(reply([]));

    await service.search('lyo');

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('https://geo.api.gouv.fr/communes?');
    expect(new URL(String(url)).searchParams.get('nom')).toBe('lyo');
    expect(new URL(String(url)).searchParams.get('limit')).toBe('8');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('encodes the typed text instead of injecting it in the url', async () => {
    fetchMock.mockResolvedValue(reply([]));

    await service.search('a&limit=500#');

    const params = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(params.get('nom')).toBe('a&limit=500#');
    expect(params.get('limit')).toBe('8');
  });

  it('answers available with no suggestion when nothing matches', async () => {
    fetchMock.mockResolvedValue(reply([]));

    await expect(service.search('zzzz')).resolves.toEqual({ available: true, suggestions: [] });
  });

  it('skips malformed entries and keeps the valid ones', async () => {
    fetchMock.mockResolvedValue(
      reply([null, { nom: 42 }, { nom: '  ' }, { nom: 'Nice', codesPostaux: 'oops' }, { nom: 'Lille', codesPostaux: [59000] }]),
    );

    await expect(service.search('li')).resolves.toEqual({
      available: true,
      suggestions: [
        { name: 'Nice', postalCode: null },
        { name: 'Lille', postalCode: null },
      ],
    });
  });

  describe('when the provider cannot answer', () => {
    const unavailable = { available: false, suggestions: [] };

    it('falls back on a network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      await expect(service.search('lyo')).resolves.toEqual(unavailable);
    });

    it('falls back on a timeout', async () => {
      fetchMock.mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));

      await expect(service.search('lyo')).resolves.toEqual(unavailable);
    });

    it('falls back on a 5xx answer', async () => {
      // A body that would parse fine: only the status can make this fail.
      fetchMock.mockResolvedValue(reply([{ nom: 'Lyon', codesPostaux: ['69001'] }], { ok: false, status: 503 }));

      await expect(service.search('lyo')).resolves.toEqual(unavailable);
    });

    it('falls back on an answer that is not JSON', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } });

      await expect(service.search('lyo')).resolves.toEqual(unavailable);
    });

    it.each([
      ['an object', { message: 'oops' }],
      ['a string', 'oops'],
      ['null', null],
    ])('falls back on an answer that is %s instead of a list', async (_label, body) => {
      fetchMock.mockResolvedValue(reply(body));

      await expect(service.search('lyo')).resolves.toEqual(unavailable);
    });

    it('does not log the typed text', async () => {
      fetchMock.mockRejectedValue(new Error('boom'));

      await service.search('secret-text');

      expect(JSON.stringify((service['logger'].warn as jest.Mock).mock.calls)).not.toContain('secret-text');
    });
  });

  describe('cache', () => {
    it('serves a repeated search without calling the provider again, whatever the case', async () => {
      fetchMock.mockResolvedValue(reply([{ nom: 'Lyon', codesPostaux: ['69001'] }]));

      await service.search('Lyo');
      const second = await service.search('lyo');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(second.suggestions).toEqual([{ name: 'Lyon', postalCode: '69001' }]);
    });

    it('does not cache a failure: the next search tries again', async () => {
      fetchMock.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(reply([{ nom: 'Lyon', codesPostaux: ['69001'] }]));

      const first = await service.search('lyo');
      const second = await service.search('lyo');

      expect(first.available).toBe(false);
      expect(second.available).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('asks again once an entry has expired', async () => {
      const now = jest.spyOn(Date, 'now');
      fetchMock.mockResolvedValue(reply([]));

      now.mockReturnValue(1_000);
      await service.search('lyo');
      now.mockReturnValue(1_000 + 5 * 60 * 1000 + 1);
      await service.search('lyo');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
