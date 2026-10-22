import { describe, it, expect, vi, afterEach } from 'vitest'
import * as moderation from '../services/moderation'

function stubFetch(body = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('service de modération (routes /v1/moderation)', () => {
  it('liste les profils d\'un statut et l\'historique', async () => {
    let fetchMock = stubFetch([])
    await moderation.listProfilesByStatus('pending')
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/v1\/moderation\/profiles\?status=pending$/)
    fetchMock = stubFetch([])
    await moderation.listActions()
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/v1\/moderation\/actions$/)
  })

  it('appelle la bonne route pour chaque action, en POST', async () => {
    for (const [call, path] of [
      [() => moderation.approveProfile(3), '/profiles/3/approve'],
      [() => moderation.blockProfile(3), '/profiles/3/block'],
      [() => moderation.unblockProfile(3), '/profiles/3/unblock'],
      [() => moderation.cancelEventAsModerator(5), '/events/5/cancel'],
    ]) {
      const fetchMock = stubFetch()
      await call()
      expect(fetchMock.mock.calls[0][0]).toMatch(new RegExp(`/v1/moderation${path}$`))
      expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    }
  })
})
