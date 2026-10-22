import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import ContactsView from '../views/ContactsView.vue'
import { ApiError } from '../services/api'
import * as people from '../services/people'
import * as chat from '../services/conversations'

vi.mock('../services/people')
vi.mock('../services/conversations')

const colette = { id: 2, displayName: 'Colette', approximateLocation: 'Lyon' }
const pierre = { id: 105, displayName: 'Pierre', approximateLocation: 'Annecy' }
const conversation = (person, unreadCount) => ({ person, unreadCount, lastMessage: { id: 1, content: 'Bonjour', sentAt: new Date().toISOString(), fromMe: false } })

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
  wrapper = mount(ContactsView, { global: { plugins: [router, createPinia()] }, attachTo: document.body })
  await flushPromises()
}
const row = (name) => wrapper.findAll('li').find((li) => li.text().includes(name))

describe('ContactsView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    people.listContacts.mockResolvedValue([colette])
    chat.listConversations.mockResolvedValue([conversation(colette, 1), conversation(pierre, 1)])
  })
  afterEach(() => wrapper?.unmount())

  it('liste les contacts enregistrés', async () => {
    chat.listConversations.mockResolvedValue([])
    await mountView()
    expect(wrapper.text()).toContain('Colette')
    expect(wrapper.findAll('a').find((a) => a.text().startsWith('Ouvrir la discussion')).attributes('href')).toBe('/people/2')
  })

  it('montre la photo de chaque contact', async () => {
    await mountView()
    const photos = wrapper.findAll('li img')
    expect(photos.length).toBeGreaterThanOrEqual(2)
    expect(row('Colette').find('img').exists()).toBe(true)
  })

  it('pagine les contacts par 12 au maximum', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: 200 + i, displayName: `Contact ${i + 1}`, approximateLocation: 'Lyon' }))
    people.listContacts.mockResolvedValue(many)
    chat.listConversations.mockResolvedValue([])
    await mountView()
    const rows = () => wrapper.get('ul.divide-y').findAll(':scope > li')
    expect(rows()).toHaveLength(12)
    expect(wrapper.text()).toContain('Page 1 sur 3 · 30 contacts')
    await wrapper.get('button[aria-label="Page 3"]').trigger('click')
    expect(rows()).toHaveLength(6)
  })

  it('met une puce rouge avec le nombre de messages non lus sur le contact concerné', async () => {
    await mountView()
    const badge = row('Colette').find('.bg-red-600')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('1 message non lu')
  })

  it('ajoute à mes contacts une personne non enregistrée qui m\'a écrit', async () => {
    await mountView()
    expect(row('Pierre')).toBeTruthy()
    expect(row('Pierre').text()).toContain('Pas encore enregistré(e)')
    expect(row('Colette').text()).not.toContain('Pas encore enregistré(e)')
    expect(row('Pierre').find('a').attributes('href')).toBe('/people/105')
  })

  it('n\'affiche pas de puce quand tout est lu', async () => {
    chat.listConversations.mockResolvedValue([conversation(colette, 0)])
    await mountView()
    expect(wrapper.find('.bg-red-600').exists()).toBe(false)
  })

  it('met les contacts avec des messages non lus en premier', async () => {
    people.listContacts.mockResolvedValue([colette, { id: 3, displayName: 'Albert', approximateLocation: 'Lyon' }])
    chat.listConversations.mockResolvedValue([conversation(colette, 2)])
    await mountView()
    const names = wrapper.findAll('li').map((li) => li.text())
    expect(names[0]).toContain('Colette')
  })

  it('explique où retrouver des personnes quand il n\'y a aucun contact', async () => {
    people.listContacts.mockResolvedValue([])
    chat.listConversations.mockResolvedValue([])
    await mountView()
    expect(wrapper.text()).toContain('aucun contact')
  })

  it('explique qu\'il faut un profil approuvé quand l\'API répond 403', async () => {
    chat.listConversations.mockRejectedValue(new ApiError(403, 'x'))
    await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('approuvé votre profil')
    expect(wrapper.findAll('button').find((b) => b.text().includes('Réessayer'))).toBeUndefined()
  })

  it('propose de réessayer en cas d\'erreur', async () => {
    people.listContacts.mockRejectedValue(new Error('x'))
    await mountView()
    expect(wrapper.get('[role="alert"]').text()).toContain('Impossible de charger')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
