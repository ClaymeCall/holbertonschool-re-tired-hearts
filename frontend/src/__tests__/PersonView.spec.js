import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import PersonView from '../views/PersonView.vue'
import { ApiError } from '../services/api'
import * as service from '../services/people'
import * as chat from '../services/conversations'
import * as myProfile from '../services/profile'
import { createPinia } from 'pinia'

vi.mock('../services/people')
vi.mock('../services/conversations')
vi.mock('../services/profile')

const person = (extra = {}) => ({
  id: 103,
  displayName: 'Henri',
  bio: 'Cycliste du dimanche.',
  approximateLocation: 'Lyon',
  interests: [{ id: 6, name: 'Balade à vélo' }],
  isContact: false,
  ...extra,
})

let wrapper
async function mountAt(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', name: 'contacts', component: { template: '<div />' } },
      { path: '/profile', name: 'profile', component: { template: '<div />' } },
      { path: '/events/:id/people', name: 'event-people', component: { template: '<div />' } },
      { path: '/events/:id', name: 'event-detail', component: { template: '<div />' } },
      { path: '/members', name: 'members', component: { template: '<div />' } },
      { path: '/people/:userId', name: 'person', component: PersonView },
    ],
  })
  router.push(path)
  await router.isReady()
  wrapper = mount(PersonView, { global: { plugins: [router, createPinia()] }, attachTo: document.body })
  await flushPromises()
}
const button = (label) => wrapper.findAll('button').find((el) => el.text() === label)

describe('PersonView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    service.getPerson.mockResolvedValue(person())
    chat.getMessages.mockResolvedValue([])
    chat.markRead.mockResolvedValue()
    chat.listConversations.mockResolvedValue([])
    myProfile.getMyProfile.mockResolvedValue({ messagingEnabled: true })
  })
  afterEach(() => wrapper?.unmount())

  it('affiche le profil de la personne', async () => {
    await mountAt('/people/103?event=7')
    expect(wrapper.get('h1').text()).toBe('Henri')
    expect(wrapper.text()).toContain('Lyon')
    expect(wrapper.text()).toContain('Balade à vélo')
  })

  it('montre la photo de la personne en haut de son profil', async () => {
    await mountAt('/people/2')
    expect(wrapper.get('article img').exists()).toBe(true)
  })

  it('affiche le profil à gauche et la discussion avec la personne à droite', async () => {
    await mountAt('/people/103')
    expect(wrapper.get('article').text()).toContain('Henri')
    expect(wrapper.get('[aria-label="Discussion avec Henri"]').exists()).toBe(true)
    expect(chat.getMessages).toHaveBeenCalledWith(103)
  })

  it('grise la discussion quand la personne n\'accepte pas les messages', async () => {
    service.getPerson.mockResolvedValue(person({ messagingEnabled: false }))
    await mountAt('/people/113')
    expect(wrapper.text()).toContain('Cette personne n’accepte pas les messages pour le moment.')
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()
  })

  it('ramène à la sortie quand on vient du bouton « Contacter l\'organisateur »', async () => {
    await mountAt('/people/2?organizerOf=5')
    expect(wrapper.get('a').attributes('href')).toBe('/events/5')
  })

  it('ramène à la liste des présents quand on vient d\'une sortie, aux contacts sinon', async () => {
    await mountAt('/people/103?event=7')
    expect(wrapper.get('a').attributes('href')).toBe('/events/7/people')
    wrapper.unmount()
    await mountAt('/people/103')
    expect(wrapper.get('a').attributes('href')).toBe('/contacts')
  })

  it('enregistre le profil dans les contacts', async () => {
    service.saveContact.mockResolvedValue(person({ isContact: true }))
    await mountAt('/people/103')
    await button('Enregistrer le profil').trigger('click')
    await flushPromises()
    expect(service.saveContact).toHaveBeenCalledWith(103)
    expect(wrapper.text()).toContain('Henri est dans vos contacts.')
    expect(button('Retirer des contacts')).toBeTruthy()
  })

  it('retire le profil des contacts', async () => {
    service.getPerson.mockResolvedValue(person({ isContact: true }))
    service.removeContact.mockResolvedValue(person())
    await mountAt('/people/103')
    await button('Retirer des contacts').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('retiré(e) de vos contacts')
    expect(button('Enregistrer le profil')).toBeTruthy()
  })

  it('signale un profil introuvable', async () => {
    service.getPerson.mockRejectedValue(new ApiError(404, 'x'))
    await mountAt('/people/9999')
    expect(wrapper.get('[role="alert"]').text()).toContain('introuvable')
  })

  it('ramène à la recherche quand on vient de la liste des membres', async () => {
    await mountAt('/people/103?from=members')
    expect(wrapper.get('a').attributes('href')).toBe('/members')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountAt('/people/103')
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
