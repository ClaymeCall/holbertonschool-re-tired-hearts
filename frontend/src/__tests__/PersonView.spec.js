import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import PersonView from '../views/PersonView.vue'
import { ApiError } from '../services/api'
import * as service from '../services/people'

vi.mock('../services/people')

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
      { path: '/events/:id/people', name: 'event-people', component: { template: '<div />' } },
      { path: '/people/:userId', name: 'person', component: PersonView },
    ],
  })
  router.push(path)
  await router.isReady()
  wrapper = mount(PersonView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}
const button = (label) => wrapper.findAll('button').find((el) => el.text() === label)

describe('PersonView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    service.getPerson.mockResolvedValue(person())
  })
  afterEach(() => wrapper?.unmount())

  it('affiche le profil de la personne', async () => {
    await mountAt('/people/103?event=7')
    expect(wrapper.get('h1').text()).toBe('Henri')
    expect(wrapper.text()).toContain('Lyon')
    expect(wrapper.text()).toContain('Balade à vélo')
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

  it('explique que le profil n\'est visible qu\'après une sortie en commun', async () => {
    service.getPerson.mockRejectedValue(new ApiError(404, 'x'))
    await mountAt('/people/9999')
    expect(wrapper.get('[role="alert"]').text()).toContain('après une sortie en commun')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountAt('/people/103')
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
