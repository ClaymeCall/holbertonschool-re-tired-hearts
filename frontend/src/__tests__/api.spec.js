import { describe, it, expect, vi, afterEach } from 'vitest'
import { request, ApiError } from '../services/api'

afterEach(() => vi.unstubAllGlobals())

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
})
