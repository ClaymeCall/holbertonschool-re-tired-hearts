import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import EventDetailView from '../views/EventDetailView.vue'
import { ApiError } from '../services/api'
import * as service from '../services/events'

vi.mock('../services/events')

const baseEvent = {
  id: 5,
  title: 'Randonnée du dimanche',
  description: 'Une belle balade.',
  approximateLocation: 'Lyon',
  startsAt: new Date(Date.now() + 86400000).toISOString(),
  capacity: 10,
  registeredCount: 4,
  status: 'published',
  mainInterest: { id: 1, name: 'Randonnée' },
  organizer: { id: 2, displayName: 'Marie' },
  isOrganizer: false,
  myRegistration: null,
}

let wrapper
async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events', name: 'events', component: { template: '<div />' } },
      { path: '/events/:id', name: 'event-detail', component: EventDetailView },
      { path: '/events/:id/edit', name: 'event-edit', component: { template: '<div />' } },
      { path: '/people/:userId', name: 'person', component: { template: '<div />' } },
    ],
  })
  router.push('/events/5')
  await router.isReady()
  wrapper = mount(EventDetailView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

const button = (label) => wrapper.findAll('button, a').find((el) => el.text().includes(label))

describe('EventDetailView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    service.getEvent.mockResolvedValue({ ...baseEvent })
  })
  afterEach(() => wrapper?.unmount())

  it('affiche le détail de la sortie', async () => {
    await mountView()
    expect(wrapper.get('h1').text()).toBe('Randonnée du dimanche')
    expect(wrapper.text()).toContain('Marie')
    expect(wrapper.text()).toContain('4 inscrit(s) sur 10')
  })

  it('propose d\'écrire à l\'organisateur, à droite du bouton d\'inscription', async () => {
    await mountView()
    const contact = button('Contacter l’organisateur')
    expect(contact.attributes('href')).toBe('/people/2?organizerOf=5')
    const register = button('Je m’inscris')
    expect(register.element.parentElement).toBe(contact.element.parentElement)
  })

  it('ne propose pas de se contacter soi-même sur sa propre sortie', async () => {
    service.getEvent.mockResolvedValue({ ...baseEvent, isOrganizer: true })
    await mountView()
    expect(button('Contacter l’organisateur')).toBeUndefined()
  })

  it('inscrit le membre et confirme', async () => {
    service.registerToEvent.mockResolvedValue({ ...baseEvent, registeredCount: 5, myRegistration: 'registered' })
    await mountView()
    await button('Je m’inscris').trigger('click')
    await flushPromises()
    expect(service.registerToEvent).toHaveBeenCalledWith(5)
    expect(wrapper.text()).toContain('Vous êtes inscrit(e) à cette sortie.')
    expect(button('Me désinscrire')).toBeTruthy()
  })

  it('désinscrit le membre', async () => {
    service.getEvent.mockResolvedValue({ ...baseEvent, myRegistration: 'registered' })
    service.withdrawFromEvent.mockResolvedValue({ ...baseEvent, registeredCount: 3, myRegistration: 'withdrawn' })
    await mountView()
    await button('Me désinscrire').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Votre place est libérée')
  })

  it.each(['cancelled', 'completed'])('masque « Me désinscrire » sur une sortie %s', async (status) => {
    service.getEvent.mockResolvedValue({ ...baseEvent, status, myRegistration: 'registered' })
    await mountView()
    expect(button('Me désinscrire')).toBeUndefined()
    expect(wrapper.text()).toMatch(/annulée|terminée/)
  })

  it('organisateur : « Marquer comme terminée » seulement une fois la date passée', async () => {
    service.getEvent.mockResolvedValue({ ...baseEvent, isOrganizer: true })
    await mountView()
    expect(button('Marquer comme terminée')).toBeUndefined()
    wrapper.unmount()
    service.getEvent.mockResolvedValue({ ...baseEvent, isOrganizer: true, startsAt: new Date(Date.now() - 86400000).toISOString() })
    await mountView()
    expect(button('Marquer comme terminée')).toBeTruthy()
  })

  it('organisateur : pas de publication d\'un brouillon dont la date est passée', async () => {
    service.getEvent.mockResolvedValue({ ...baseEvent, isOrganizer: true, status: 'draft', startsAt: new Date(Date.now() - 86400000).toISOString() })
    await mountView()
    expect(button('Publier la sortie')).toBeUndefined()
    expect(wrapper.text()).toContain('modifiez la date')
  })

  it('refuse l\'inscription à une sortie complète', async () => {
    service.getEvent.mockResolvedValue({ ...baseEvent, registeredCount: 10 })
    await mountView()
    expect(button('Je m’inscris')).toBeUndefined()
    expect(wrapper.text()).toContain('Cette sortie est complète.')
  })

  it('affiche une erreur claire si l\'inscription échoue (409)', async () => {
    service.registerToEvent.mockRejectedValue(new ApiError(409, 'x'))
    await mountView()
    await button('Je m’inscris').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Action impossible')
  })

  it('affiche un message si la sortie est introuvable', async () => {
    service.getEvent.mockRejectedValue(new ApiError(404, 'x'))
    await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('introuvable')
  })

  it('demande confirmation en nommant la sortie avant de l\'annuler', async () => {
    service.getEvent.mockResolvedValue({ ...baseEvent, isOrganizer: true })
    service.cancelEvent.mockResolvedValue({ ...baseEvent, isOrganizer: true, status: 'cancelled' })
    await mountView()
    await button('Annuler la sortie').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('Randonnée du dimanche')
    expect(service.cancelEvent).not.toHaveBeenCalled()
    await button('Oui, annuler la sortie').trigger('click')
    await flushPromises()
    expect(service.cancelEvent).toHaveBeenCalledWith(5)
    expect(wrapper.text()).toContain('Annulée')
  })

  it('ne supprime pas sans confirmation et permet de revenir en arrière', async () => {
    service.getEvent.mockResolvedValue({ ...baseEvent, isOrganizer: true, status: 'draft', registeredCount: 0 })
    await mountView()
    await button('Supprimer le brouillon').trigger('click')
    await button('Retour').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(service.deleteEvent).not.toHaveBeenCalled()
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
