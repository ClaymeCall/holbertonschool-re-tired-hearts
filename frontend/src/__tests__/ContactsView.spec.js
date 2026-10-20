import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import ContactsView from '../views/ContactsView.vue'
import * as service from '../services/people'

vi.mock('../services/people')

let wrapper
async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', name: 'contacts', component: ContactsView },
      { path: '/my-events', name: 'my-events', component: { template: '<div />' } },
      { path: '/people/:userId', name: 'person', component: { template: '<div />' } },
    ],
  })
  wrapper = mount(ContactsView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

describe('ContactsView', () => {
  beforeEach(() => vi.resetAllMocks())
  afterEach(() => wrapper?.unmount())

  it('liste les contacts enregistrés', async () => {
    service.listContacts.mockResolvedValue([{ id: 2, displayName: 'Colette', approximateLocation: 'Lyon' }])
    await mountView()
    expect(wrapper.text()).toContain('Colette')
    expect(wrapper.findAll('a').find((a) => a.text().startsWith('Ouvrir le profil')).attributes('href')).toBe('/people/2')
  })

  it('explique où retrouver des personnes quand il n\'y a aucun contact', async () => {
    service.listContacts.mockResolvedValue([])
    await mountView()
    expect(wrapper.text()).toContain('aucun contact')
  })

  it('propose de réessayer en cas d\'erreur', async () => {
    service.listContacts.mockRejectedValue(new Error('x'))
    await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de charger')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    service.listContacts.mockResolvedValue([{ id: 2, displayName: 'Colette', approximateLocation: 'Lyon' }])
    await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
