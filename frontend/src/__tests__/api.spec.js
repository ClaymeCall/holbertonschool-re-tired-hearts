import { describe, it, expect, vi, afterEach } from 'vitest'
import { request, ApiError, setUnauthorizedHandler } from '../services/api'

afterEach(() => {
  vi.unstubAllGlobals()
  setUnauthorizedHandler(null)
})

describe('request', () => {
  it('retourne le JSON en cas de succès', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: 1 }) }))
    expect(await request('/x')).toEqual({ ok: 1 })
  })

  it('lève une ApiError sans détail technique sur erreur HTTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(request('/x')).rejects.toMatchObject({ status: 500, message: 'La requête a échoué.' })
  })

  it('lève une ApiError si le réseau échoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
    await expect(request('/x')).rejects.toBeInstanceOf(ApiError)
  })

  it('envoie le cookie de session avec chaque requête', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)
    await request('/v1/auth/logout', { method: 'POST' })
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/auth/logout'), expect.objectContaining({ credentials: 'include', method: 'POST' }))
  })

  it('prévient l\'application quand une route protégée répond 401', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(request('/v1/events')).rejects.toMatchObject({ status: 401 })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ne considère pas un 401 d\'identifiants invalides comme une session expirée', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(request('/v1/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 401 })
    expect(handler).not.toHaveBeenCalled()
  })
})
