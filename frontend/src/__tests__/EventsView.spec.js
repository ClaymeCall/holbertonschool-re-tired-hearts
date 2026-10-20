import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import EventsView from '../views/EventsView.vue'
import * as service from '../services/events'

vi.mock('../services/events')

const event = (id, extra = {}) => ({
  id,
  title: `Sortie ${id}`,
  approximateLocation: 'Lyon',
  startsAt: new Date(Date.now() + 86400000).toISOString(),
  capacity: 10,
  registeredCount: 3,
  status: 'published',
  mainInterest: { id: 1, name: 'Randonnée' },
  myRegistration: null,
  ...extra,
})

let wrapper
const button = (label) => wrapper.findAll('button').find((el) => el.text() === label)
async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events', name: 'events', component: EventsView },
      { path: '/events/new', name: 'event-new', component: { template: '<div />' } },
      { path: '/events/:id', name: 'event-detail', component: { template: '<div />' } },
    ],
  })
  wrapper = mount(EventsView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('EventsView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    service.listInterests.mockResolvedValue([{ id: 1, name: 'Randonnée' }])
    service.listEvents.mockResolvedValue({ items: [event(1), event(2)], total: 2, page: 1, limit: 12 })
  })
  afterEach(() => wrapper?.unmount())

  it('affiche les sorties et leur nombre', async () => {
    await mountView()
    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(wrapper.text()).toContain('2 sorties')
    expect(wrapper.text()).toContain('Vous avez tout vu')
  })

  it('affiche un message quand aucune sortie ne correspond', async () => {
    service.listEvents.mockResolvedValue({ items: [], total: 0, page: 1, limit: 12 })
    await mountView()
    expect(wrapper.text()).toContain('Aucune sortie ne correspond')
  })

  it('propose de réessayer en cas d\'erreur', async () => {
    service.listEvents.mockRejectedValueOnce(new Error('x'))
    await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de charger')
    const retry = wrapper.findAll('button').find((button) => button.text() === 'Réessayer')
    await retry.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('article')).toHaveLength(2)
  })

  it('applique les filtres', async () => {
    await mountView()
    await wrapper.get('#filter-interest').setValue('1')
    await wrapper.get('#filter-location').setValue('Lyon')
    await wrapper.get('form').trigger('submit')
    expect(service.listEvents).toHaveBeenLastCalledWith({ interest: '1', location: 'Lyon', page: 1, limit: 12 })
  })

  it('ne garde dans la page que les cartes proches de l\'écran', async () => {
    service.listEvents.mockImplementation(async ({ page }) => ({
      items: Array.from({ length: 12 }, (_, i) => event((page - 1) * 12 + i + 1)),
      total: 200,
      page,
      limit: 12,
    }))
    await mountView()
    expect(wrapper.text()).toContain('200 sorties')
    expect(wrapper.findAll('li').length).toBeLessThanOrEqual(15)
    expect(wrapper.get('li').attributes('aria-setsize')).toBe('200')
    expect(wrapper.get('li').attributes('aria-posinset')).toBe('1')
  })

  it('charge à la demande les pages atteintes en descendant et retire les anciennes cartes', async () => {
    service.listEvents.mockImplementation(async ({ page }) => ({
      items: Array.from({ length: 12 }, (_, i) => event((page - 1) * 12 + i + 1)),
      total: 200,
      page,
      limit: 12,
    }))
    await mountView()
    const list = wrapper.get('ul').element
    list.getBoundingClientRect = () => ({ top: -10500 }) // environ la sortie n°100
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 60))
    await flushPromises()
    expect(service.listEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 9 }))
    const posinsets = wrapper.findAll('li').map((li) => Number(li.attributes('aria-posinset')))
    expect(posinsets.length).toBeLessThanOrEqual(18)
    expect(Math.min(...posinsets)).toBeGreaterThan(80)
    expect(wrapper.text()).toContain('Sortie 97')
  })

  it('propose de réessayer si des pages ne se chargent pas', async () => {
    service.listEvents
      .mockResolvedValueOnce({ items: Array.from({ length: 12 }, (_, i) => event(i + 1)), total: 50, page: 1, limit: 12 })
      .mockRejectedValue(new Error('x'))
    await mountView()
    wrapper.get('ul').element.getBoundingClientRect = () => ({ top: -3000 })
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 60))
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('une partie des sorties')
    expect(button('Réessayer')).toBeTruthy()
  })

  it('affiche la photo générique quand une sortie n\'a pas de centre d\'intérêt', async () => {
    service.listEvents.mockResolvedValue({ items: [event(1, { mainInterest: null }), event(2, { mainInterest: { id: 9, name: 'Autre' } })], total: 2, page: 1, limit: 12 })
    await mountView()
    const sources = wrapper.findAll('article img').map((img) => img.attributes('src'))
    expect(sources).toHaveLength(2)
    expect(sources[0]).toBe(sources[1])
    expect(sources[0]).toContain('generic')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
