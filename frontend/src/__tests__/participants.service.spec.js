import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listParticipants } from '../services/participants'
import * as events from '../services/events'
import * as people from '../services/people'
import * as profile from '../services/profile'

vi.mock('../services/events')
vi.mock('../services/people')
vi.mock('../services/profile')

const event = (extra) => ({ id: 7, registeredCount: 3, isOrganizer: false, myRegistration: 'registered', organizer: { id: 2, displayName: 'Colette' }, ...extra })

describe('participants (simulés à partir des vrais profils)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    profile.getMyProfile.mockResolvedValue({ id: 1 })
    people.searchPeople.mockResolvedValue([1, 2, 103, 104, 105].map((id) => ({ id, displayName: `P${id}` })))
  })

  it('réserve la liste à l\'organisateur et aux inscrits', async () => {
    events.getEvent.mockResolvedValue(event({ myRegistration: null }))
    await expect(listParticipants(7)).rejects.toMatchObject({ status: 403 })
  })

  it('place l\'organisateur en tête et exclut l\'organisateur et moi du reste', async () => {
    events.getEvent.mockResolvedValue(event())
    const list = await listParticipants(7)
    expect(list[0]).toMatchObject({ id: 2, isOrganizer: true })
    expect(list).toHaveLength(3) // organisateur + 3 inscrits dont moi
    expect(list.slice(1).map((p) => p.id)).not.toContain(1)
    expect(list.slice(1).map((p) => p.id)).not.toContain(2)
  })
})
