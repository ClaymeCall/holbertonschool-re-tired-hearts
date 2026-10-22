import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '../stores/session'
import { getPerson, listContacts, removeContact, saveContact, searchPeople } from '../services/people'

const profiles = [
  { id: 2, displayName: 'Colette', approximateLocation: 'Lyon', bio: null, interests: [{ id: 1, name: 'Randonnée' }] },
  { id: 105, displayName: 'Gérard', approximateLocation: 'Annecy', bio: null, interests: [{ id: 5, name: 'Jardinage' }] },
]

function stubProfiles() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const id = Number(String(url).split('/').pop())
      if (/\/v1\/profiles$/.test(url)) return { ok: true, status: 200, json: async () => profiles }
      const profile = profiles.find((item) => item.id === id)
      return profile ? { ok: true, status: 200, json: async () => profile } : { ok: false, status: 404 }
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  useSessionStore().user = { id: 1 }
  stubProfiles()
})
afterEach(() => vi.unstubAllGlobals())

describe('profils et recherche de membres', () => {
  it('donne le profil d\'un membre et répond 404 s\'il n\'existe pas', async () => {
    expect(await getPerson(2)).toMatchObject({ displayName: 'Colette', isContact: false })
    await expect(getPerson(9999)).rejects.toMatchObject({ status: 404 })
  })

  it('recherche par prénom ou ville, sans tenir compte des accents ni de la casse', async () => {
    expect((await searchPeople({ search: 'gerard' })).map((p) => p.displayName)).toEqual(['Gérard'])
    expect((await searchPeople({ search: 'LYON' })).map((p) => p.displayName)).toEqual(['Colette'])
  })

  it('filtre par centre d\'intérêt et renvoie tout le monde sans critère', async () => {
    expect((await searchPeople({ interest: 5 })).map((p) => p.id)).toEqual([105])
    expect(await searchPeople()).toHaveLength(2)
  })

  it('enregistre puis retire un profil des contacts (gardé dans le navigateur)', async () => {
    expect(await listContacts()).toEqual([])
    expect((await saveContact(2)).isContact).toBe(true)
    expect((await listContacts()).map((p) => p.id)).toEqual([2])
    expect((await getPerson(2)).isContact).toBe(true)
    expect((await removeContact(2)).isContact).toBe(false)
    expect(await listContacts()).toEqual([])
  })

  it('garde les contacts séparés par compte sur un même navigateur', async () => {
    await saveContact(2)
    const session = useSessionStore()
    session.user = { id: 7 }
    expect(await listContacts()).toEqual([])
    session.user = { id: 1 }
    expect((await listContacts()).map((p) => p.id)).toEqual([2])
  })

  it('refuse d\'enregistrer un profil inexistant', async () => {
    await expect(saveContact(9999)).rejects.toMatchObject({ status: 404 })
  })
})
