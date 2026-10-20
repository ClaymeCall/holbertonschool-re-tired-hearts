import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import EventFormView from '../views/EventFormView.vue'
import * as service from '../services/events'

vi.mock('../services/events')

let wrapper
let router
async function mountView(path) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events', name: 'events', component: { template: '<div />' } },
      { path: '/events/new', name: 'event-new', component: EventFormView },
      { path: '/events/:id', name: 'event-detail', component: { template: '<div />' } },
      { path: '/events/:id/edit', name: 'event-edit', component: EventFormView },
    ],
  })
  router.push(path)
  await router.isReady()
  wrapper = mount(EventFormView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

async function fillAll() {
  await wrapper.get('#title').setValue('Marche douce')
  await wrapper.get('#description').setValue('Une marche tranquille.')
  await wrapper.get('#mainInterestId').setValue('1')
  await wrapper.get('#approximateLocation').setValue('Annecy')
  await wrapper.get('#startsAt').setValue('2030-05-01T10:00')
  await wrapper.get('#capacity').setValue('12')
}

describe('EventFormView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    service.listInterests.mockResolvedValue([{ id: 1, name: 'Randonnée' }])
  })
  afterEach(() => wrapper?.unmount())

  it('affiche les erreurs de champ sans appeler le service', async () => {
    await mountView('/events/new')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Donnez un titre')
    expect(wrapper.text()).toContain('Choisissez un centre d’intérêt')
    expect(wrapper.text()).toContain('nombre de places')
    expect(service.createEvent).not.toHaveBeenCalled()
  })

  it('crée le brouillon puis ouvre la sortie', async () => {
    service.createEvent.mockResolvedValue({ id: 9 })
    await mountView('/events/new')
    await fillAll()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(service.createEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Marche douce', mainInterestId: 1, capacity: 12 }))
    expect(router.currentRoute.value.name).toBe('event-detail')
  })

  it('refuse une capacité inférieure au nombre d\'inscrits en modification', async () => {
    service.getEvent.mockResolvedValue({
      id: 3,
      title: 'Poterie',
      description: 'Atelier',
      approximateLocation: 'Lyon',
      startsAt: '2030-05-01T10:00:00.000Z',
      capacity: 10,
      registeredCount: 6,
      isOrganizer: true,
      mainInterest: { id: 1, name: 'Randonnée' },
    })
    await mountView('/events/3/edit')
    await wrapper.get('#capacity').setValue('4')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('6 inscrit(s)')
    expect(service.updateEvent).not.toHaveBeenCalled()
  })

  it('bloque la modification par un autre membre', async () => {
    service.getEvent.mockResolvedValue({ id: 3, isOrganizer: false })
    await mountView('/events/3/edit')
    expect(wrapper.get('[role="alert"]').text()).toContain('Seul l’organisateur')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountView('/events/new')
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
