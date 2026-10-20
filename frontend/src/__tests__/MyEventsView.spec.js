import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import MyEventsView from '../views/MyEventsView.vue'
import * as service from '../services/events'

vi.mock('../services/events')

const day = 86400000
const event = (id, extra = {}) => ({
  id,
  title: `Sortie ${id}`,
  approximateLocation: 'Lyon',
  startsAt: new Date(Date.now() + 5 * day).toISOString(),
  capacity: 10,
  registeredCount: 3,
  status: 'published',
  mainInterest: { id: 1, name: 'Randonnée' },
  isOrganizer: false,
  myRegistration: null,
  ...extra,
})

let wrapper
async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['events', 'event-new', 'my-events'].map((name) => ({ path: `/${name}`, name, component: { template: '<div />' } })).concat([
      { path: '/events/:id', name: 'event-detail', component: { template: '<div />' } },
      { path: '/events/:id/edit', name: 'event-edit', component: { template: '<div />' } },
    ]),
  })
  wrapper = mount(MyEventsView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

const control = (label) => wrapper.findAll('button, a').find((el) => el.text().includes(label))
const openTab = async (label) => {
  await wrapper.findAll('[role="tab"]').find((tab) => tab.text().includes(label)).trigger('click')
}

describe('MyEventsView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    service.listMyEvents.mockResolvedValue({
      registered: [
        event(1, { myRegistration: 'registered' }),
        event(2, { myRegistration: 'registered', status: 'completed', startsAt: new Date(Date.now() - 20 * day).toISOString() }),
      ],
      organized: [
        event(3, { isOrganizer: true, status: 'draft', registeredCount: 0 }),
        event(4, { isOrganizer: true }),
        event(5, { isOrganizer: true, status: 'completed', startsAt: new Date(Date.now() - 9 * day).toISOString() }),
      ],
    })
  })
  afterEach(() => wrapper?.unmount())

  it('sépare les inscriptions à venir, les sorties organisées et celles déjà faites', async () => {
    await mountView()
    const tabs = wrapper.findAll('[role="tab"]').map((tab) => tab.text())
    expect(tabs).toEqual(['Mes inscriptions (1)', 'Mes sorties organisées (2)', 'Déjà participé(e) (2)'])
    expect(wrapper.text()).toContain('Sortie 1')
  })

  it('désinscrit le membre depuis ses inscriptions', async () => {
    service.withdrawFromEvent.mockResolvedValue({})
    await mountView()
    await control('Me désinscrire').trigger('click')
    await flushPromises()
    expect(service.withdrawFromEvent).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Votre place est libérée')
  })

  it('propose Modifier, Supprimer (brouillon) et Annuler (publiée) pour mes sorties', async () => {
    await mountView()
    await openTab('organisées')
    expect(wrapper.findAll('a').filter((a) => a.text().startsWith('Modifier'))).toHaveLength(2)
    expect(control('Supprimer')).toBeTruthy()
    expect(control('Annuler la sortie')).toBeTruthy()
  })

  it('demande confirmation en nommant la sortie avant de supprimer un brouillon', async () => {
    service.deleteEvent.mockResolvedValue()
    await mountView()
    await openTab('organisées')
    await control('Supprimer').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Sortie 3')
    expect(service.deleteEvent).not.toHaveBeenCalled()
    await control('Oui, supprimer').trigger('click')
    await flushPromises()
    expect(service.deleteEvent).toHaveBeenCalledWith(3)
  })

  it('place une sortie organisée et terminée dans les sorties passées, plus dans mes sorties organisées', async () => {
    await mountView()
    await openTab('organisées')
    expect(wrapper.text()).not.toContain('Sortie 5')
    await openTab('Déjà participé')
    expect(wrapper.text()).toContain('Sortie 5')
    expect(wrapper.text()).toContain('Vous organisiez cette sortie')
  })

  it('liste les sorties déjà faites sans action', async () => {
    await mountView()
    await openTab('Déjà participé')
    expect(wrapper.text()).toContain('Sortie 2')
    expect(wrapper.findAll('button').filter((b) => b.attributes('role') !== 'tab')).toHaveLength(0)
  })

  it('propose de réessayer si le chargement échoue', async () => {
    service.listMyEvents.mockRejectedValueOnce(new Error('x'))
    await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de charger')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
