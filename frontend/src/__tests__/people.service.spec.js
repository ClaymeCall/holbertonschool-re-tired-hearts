import { describe, it, expect } from 'vitest'
import { getPerson, listContacts, removeContact, saveContact } from '../services/people'
import { listParticipants } from '../services/events'

describe('profils des personnes rencontrées (règles simulées)', () => {
  it('donne le profil d\'une personne présente à une sortie passée', async () => {
    const people = await listParticipants(33) // sortie passée où j'étais inscrit(e)
    const person = await getPerson(people[1].id)
    expect(person).toHaveProperty('displayName')
    expect(person).toHaveProperty('approximateLocation')
    expect(Array.isArray(person.interests)).toBe(true)
  })

  it('indique si la personne accepte les messages', async () => {
    const people = await listParticipants(33)
    const daniel = people.find((person) => person.id === 113)
    expect(daniel).toBeTruthy()
    expect((await getPerson(113)).acceptsMessages).toBe(false)
    expect((await getPerson(people[1].id)).acceptsMessages).toBe(true)
  })

  it('cache le profil d\'une personne jamais rencontrée, comme s\'il n\'existait pas', async () => {
    await expect(getPerson(9999)).rejects.toMatchObject({ status: 404 })
  })

  it('enregistre puis retire un profil des contacts', async () => {
    const [, other] = await listParticipants(33)
    expect((await saveContact(other.id)).isContact).toBe(true)
    expect((await listContacts()).map((c) => c.id)).toContain(other.id)
    expect((await removeContact(other.id)).isContact).toBe(false)
    expect((await listContacts()).map((c) => c.id)).not.toContain(other.id)
  })

  it('refuse d\'enregistrer un profil inaccessible', async () => {
    await expect(saveContact(9999)).rejects.toMatchObject({ status: 404 })
  })

  it('réserve la liste des présents à l\'organisateur et aux inscrits', async () => {
    await expect(listParticipants(2)).rejects.toMatchObject({ status: 403 })
  })
})
