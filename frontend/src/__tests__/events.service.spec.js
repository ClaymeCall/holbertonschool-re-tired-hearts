import { describe, it, expect } from 'vitest'
import { cancelEvent, createEvent, deleteEvent, listMyEvents, publishEvent, withdrawFromEvent } from '../services/events'

const interest = { mainInterestId: 1, title: 'Marche', description: 'Une marche.', approximateLocation: 'Lyon', startsAt: new Date(Date.now() + 86400000).toISOString(), capacity: 5 }

describe('service des sorties (contrat du backend)', () => {
  it('ne permet pas d\'annuler un brouillon, il se supprime', async () => {
    const draft = await createEvent(interest)
    expect(draft.status).toBe('draft')
    await expect(cancelEvent(draft.id)).rejects.toMatchObject({ status: 409 })
    await expect(deleteEvent(draft.id)).resolves.toBeUndefined()
  })

  it('publie une sortie puis permet de l\'annuler', async () => {
    const event = await createEvent(interest)
    expect((await publishEvent(event.id)).status).toBe('published')
    expect((await cancelEvent(event.id)).status).toBe('cancelled')
  })

  it('répond 409 quand on se désinscrit sans être inscrit', async () => {
    await expect(withdrawFromEvent(1)).rejects.toMatchObject({ status: 409 })
  })

  it('renvoie mes sorties sous la forme { registered, organized } en camelCase', async () => {
    const mine = await listMyEvents()
    expect(Object.keys(mine).sort()).toEqual(['organized', 'registered'])
    expect(mine.registered[0]).toHaveProperty('registeredCount')
    expect(mine.organized[0]).toHaveProperty('isOrganizer', true)
  })
})
