import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  cancelEvent, createEvent, deleteEvent, listEvents, listMyEvents, publishEvent, registerToEvent, withdrawFromEvent,
} from '../services/events'

function stubFetch(status = 200, body = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
const lastCall = (fetchMock) => ({ url: fetchMock.mock.calls[0][0], init: fetchMock.mock.calls[0][1] })

afterEach(() => vi.unstubAllGlobals())

describe('service des sorties (routes /v1/events)', () => {
  it('liste avec filtres et pagination', async () => {
    const fetchMock = stubFetch(200, { items: [], total: 0, page: 2, limit: 12 })
    await listEvents({ interest: 3, location: ' Lyon ', page: 2 })
    const { url } = lastCall(fetchMock)
    expect(url).toContain('/v1/events?')
    expect(url).toContain('page=2')
    expect(url).toContain('interest=3')
    expect(url).toContain('location=Lyon')
  })

  it('crée une sortie avec POST /v1/events', async () => {
    const fetchMock = stubFetch(201, { id: 9 })
    await createEvent({ title: 'Marche' })
    const { url, init } = lastCall(fetchMock)
    expect(url).toMatch(/\/v1\/events$/)
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ title: 'Marche' }) })
  })

  it('utilise les routes de cycle de vie, d\'inscription et de désinscription', async () => {
    for (const [call, path, method] of [
      [() => publishEvent(4), '/v1/events/4/publish', 'POST'],
      [() => cancelEvent(4), '/v1/events/4/cancel', 'POST'],
      [() => registerToEvent(4), '/v1/events/4/registrations', 'POST'],
      [() => withdrawFromEvent(4), '/v1/events/4/registrations/me', 'DELETE'],
      [() => listMyEvents(), '/v1/events/mine', 'GET'],
    ]) {
      const fetchMock = stubFetch()
      await call()
      expect(lastCall(fetchMock).url).toMatch(new RegExp(`${path}$`))
      expect(lastCall(fetchMock).init.method).toBe(method)
    }
  })

  it('supprime un brouillon (204 sans contenu)', async () => {
    stubFetch(204)
    await expect(deleteEvent(4)).resolves.toBeNull()
  })

  it('propage le statut 409 du serveur', async () => {
    stubFetch(409)
    await expect(withdrawFromEvent(1)).rejects.toMatchObject({ status: 409 })
  })
})
