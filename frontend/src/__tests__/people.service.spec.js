import { describe, it, expect } from 'vitest'
import { getPerson, listContacts, removeContact, saveContact, searchPeople } from '../services/people'
import { listParticipants } from '../services/events'

describe('profils et recherche de membres (règles simulées)', () => {
  it('donne le profil de n\'importe quel membre, même jamais rencontré', async () => {
    const person = await getPerson(107)
    expect(person).toHaveProperty('displayName', 'Lucien')
    expect(person).toHaveProperty('approximateLocation')
    expect(Array.isArray(person.interests)).toBe(true)
  })

  it('répond 404 pour un profil inexistant', async () => {
    await expect(getPerson(9999)).rejects.toMatchObject({ status: 404 })
  })

  it('autorise à écrire seulement après une sortie en commun ou à un organisateur', async () => {
    const met = await listParticipants(33) // sortie passée où j'étais inscrit(e)
    expect((await getPerson(met[1].id)).canMessage).toBe(true)
    expect((await getPerson(2)).canMessage).toBe(true) // organisatrice de sorties
    expect((await getPerson(107)).canMessage).toBe(false) // jamais rencontré
  })

  it('indique si la personne accepte les messages', async () => {
    expect((await getPerson(113)).acceptsMessages).toBe(false)
    expect((await getPerson(103)).acceptsMessages).toBe(true)
  })

  it('recherche par prénom ou ville, sans tenir compte des accents ni de la casse', async () => {
    expect((await searchPeople({ search: 'gerard' })).map((p) => p.displayName)).toEqual(['Gérard'])
    const lyon = await searchPeople({ search: 'LYON' })
    expect(lyon.length).toBeGreaterThan(1)
    expect(lyon.every((p) => p.approximateLocation === 'Lyon' || p.displayName.toLowerCase().includes('lyon'))).toBe(true)
  })

  it('filtre par centre d\'intérêt et renvoie tout le monde sans critère', async () => {
    const all = await searchPeople()
    const bikers = await searchPeople({ interest: '6' })
    expect(bikers.length).toBeGreaterThan(0)
    expect(bikers.length).toBeLessThan(all.length)
    expect(bikers.every((p) => p.interests.some((i) => i.id === 6))).toBe(true)
  })

  it('enregistre puis retire un profil des contacts', async () => {
    expect((await saveContact(107)).isContact).toBe(true)
    expect((await listContacts()).map((c) => c.id)).toContain(107)
    expect((await removeContact(107)).isContact).toBe(false)
    expect((await listContacts()).map((c) => c.id)).not.toContain(107)
  })

  it('refuse d\'enregistrer un profil inexistant', async () => {
    await expect(saveContact(9999)).rejects.toMatchObject({ status: 404 })
  })

  it('réserve la liste des présents à l\'organisateur et aux inscrits', async () => {
    await expect(listParticipants(2)).rejects.toMatchObject({ status: 403 })
  })
})
