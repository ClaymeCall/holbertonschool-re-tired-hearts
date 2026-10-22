import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import EventPeopleView from '../views/EventPeopleView.vue'
import { ApiError } from '../services/api'
import * as service from '../services/events'
import * as participants from '../services/participants'

vi.mock('../services/events')
vi.mock('../services/participants')

let wrapper
async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/my-events', name: 'my-events', component: { template: '<div />' } },
      { path: '/events/:id/people', name: 'event-people', component: EventPeopleView },
      { path: '/people/:userId', name: 'person', component: { template: '<div />' } },
    ],
  })
  router.push('/events/7/people')
  await router.isReady()
  wrapper = mount(EventPeopleView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

describe('EventPeopleView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    service.getEvent.mockResolvedValue({ id: 7, title: 'Randonnée d’automne' })
    participants.listParticipants.mockResolvedValue([
      { id: 2, displayName: 'Colette', isOrganizer: true },
      { id: 103, displayName: 'Henri', isOrganizer: false },
    ])
  })
  afterEach(() => wrapper?.unmount())

  it('liste les personnes présentes avec un bouton pour voir leur profil', async () => {
    await mountView()
    expect(wrapper.text()).toContain('Randonnée d’automne')
    expect(wrapper.text()).toContain('Organisateur')
    const links = wrapper.findAll('a').filter((a) => a.text().startsWith('Voir le profil'))
    expect(links.map((a) => a.attributes('href'))).toEqual(['/people/2?event=7', '/people/103?event=7'])
  })

  it('indique quand personne d\'autre n\'était présent', async () => {
    participants.listParticipants.mockResolvedValue([])
    await mountView()
    expect(wrapper.text()).toContain('Aucune autre personne')
  })

  it('explique le refus pour quelqu\'un qui n\'était pas inscrit', async () => {
    participants.listParticipants.mockRejectedValue(new ApiError(403, 'x'))
    await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Seuls l’organisateur et les inscrits')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
