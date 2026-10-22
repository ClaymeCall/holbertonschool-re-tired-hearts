import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import EventsView from '../views/EventsView.vue'
import * as service from '../services/events'

vi.mock('../services/events')
vi.mock('../services/places', () => ({ searchPlaces: vi.fn().mockResolvedValue({ available: true, suggestions: [] }) }))

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

  it('charge une page de 12 sorties et propose des pages numérotées', async () => {
    service.listEvents.mockImplementation(async ({ page }) => ({
      items: Array.from({ length: 12 }, (_, i) => event((page - 1) * 12 + i + 1)),
      total: 30,
      page,
      limit: 12,
    }))
    await mountView()
    expect(service.listEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 12 }))
    expect(wrapper.findAll('article')).toHaveLength(12)
    expect(wrapper.text()).toContain('Page 1 sur 3 · 30 sorties')
    await wrapper.get('button[aria-label="Page 3"]').trigger('click')
    await flushPromises()
    expect(service.listEvents).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }))
    expect(wrapper.get('[aria-current="page"]').text()).toBe('3')
    expect(wrapper.text()).toContain('Sortie 25')
  })

  it('ne charge que la page affichée et ses deux voisines, puis sert les pages déjà chargées sans nouvel appel', async () => {
    service.listEvents.mockImplementation(async ({ page }) => ({ items: [event(page)], total: 60, page, limit: 12 }))
    await mountView()
    // page 1 affichée : la page 2 est préchargée, rien d'autre
    expect(service.listEvents.mock.calls.map(([args]) => args.page).sort()).toEqual([1, 2])
    service.listEvents.mockClear()
    await wrapper.get('button[aria-label="Page 2"]').trigger('click')
    await flushPromises()
    // la page 2 vient du cache (pas d'appel) ; on précharge la 3 (la 1 est déjà là)
    expect(service.listEvents.mock.calls.map(([args]) => args.page)).toEqual([3])
    expect(wrapper.get('[aria-current="page"]').text()).toBe('2')
  })

  it('revient à la page 1 quand on applique un filtre', async () => {
    service.listEvents.mockImplementation(async ({ page }) => ({ items: [event(page)], total: 30, page, limit: 12 }))
    await mountView()
    await wrapper.get('button[aria-label="Page 2"]').trigger('click')
    await flushPromises()
    await wrapper.get('#filter-location').setValue('Lyon')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(service.listEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 1, location: 'Lyon' }))
  })

  it('ouvre une modale d\'aperçu avec un lien vers la sortie, et la ferme', async () => {
    await mountView()
    await wrapper.findAll('article button')[1].trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('Sortie 2')
    expect(dialog.text()).toContain('places restantes')
    expect(dialog.findAll('a').find((a) => a.text().includes('Voir la sortie')).attributes('href')).toBe('/events/2')
    await dialog.get('[data-close]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
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
