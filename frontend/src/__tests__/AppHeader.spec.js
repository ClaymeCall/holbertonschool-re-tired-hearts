import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import AppHeader from '../components/AppHeader.vue'
import { useSessionStore } from '../stores/session'
import * as auth from '../services/auth'
import * as chat from '../services/conversations'

vi.mock('../services/auth')
vi.mock('../services/conversations')

let mounted

afterEach(() => mounted?.unmount())

let currentRouter

function mountHeader() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['home', 'login', 'register', 'profile', 'events', 'event-new', 'my-events', 'contacts', 'members'].map((name) => ({ path: name === 'home' ? '/' : `/${name}`, name, component: stub })),
  })
  currentRouter = router
  mounted = mount(AppHeader, { global: { plugins: [pinia, router] }, attachTo: document.body })
  return mounted
}

describe('AppHeader', () => {
  beforeEach(() => {
    chat.listConversations.mockResolvedValue([])
  })

  it('propose connexion et inscription aux visiteurs', () => {
    const wrapper = mountHeader()
    expect(wrapper.text()).toContain('Connexion')
    expect(wrapper.text()).toContain('Inscription')
    expect(wrapper.text()).not.toContain('Mon profil')
    expect(wrapper.get('a[aria-label]').attributes('href')).toBe('/')
  })

  it('propose profil et déconnexion aux membres connectés, puis déconnecte', async () => {
    const wrapper = mountHeader()
    auth.logout.mockResolvedValue(null)
    useSessionStore().user = { id: 1 }
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Mon profil')
    expect(wrapper.text()).toContain('Parcourir les sorties')
    expect(wrapper.findAll('a').find((a) => a.text() === 'Parcourir les sorties').attributes('href')).toBe('/events')
    expect(wrapper.text()).not.toContain('Proposer une sortie')
    expect(wrapper.text()).toContain('Mes sorties')
    expect(wrapper.text()).toContain('Contacts')
    expect(wrapper.text()).toContain('Membres')
    expect(wrapper.get('a[aria-label]').attributes('href')).toBe('/events')
    await wrapper.findAll('button').find((b) => b.text() === 'Se déconnecter').trigger('click')
    await flushPromises()
    expect(useSessionStore().isAuthenticated).toBe(false)
    expect(auth.logout).toHaveBeenCalled()
  })

  it('met une puce rouge sur Contacts quand des messages ne sont pas lus', async () => {
    chat.listConversations.mockResolvedValue([
      { person: { id: 2 }, unreadCount: 2, lastMessage: {} },
      { person: { id: 105 }, unreadCount: 1, lastMessage: {} },
    ])
    const wrapper = mountHeader()
    useSessionStore().user = { id: 1 }
    await flushPromises()
    const link = wrapper.findAll('a').find((a) => a.text().startsWith('Contacts'))
    expect(link.text()).toContain('3 messages non lus')
    expect(link.find('.bg-red-600').exists()).toBe(true)
  })

  it('n\'affiche aucune puce quand tout est lu', async () => {
    const wrapper = mountHeader()
    useSessionStore().user = { id: 1 }
    await flushPromises()
    expect(wrapper.find('.bg-red-600').exists()).toBe(false)
  })

  it('propose un menu déroulant sur mobile qui s\'ouvre et se ferme', async () => {
    const wrapper = mountHeader()
    const toggle = wrapper.get('button[aria-controls="main-nav"]')
    const nav = wrapper.get('#main-nav')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(nav.classes()).toContain('hidden')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(nav.classes()).toContain('flex')
    await toggle.trigger('click')
    expect(nav.classes()).toContain('hidden')
  })

  it('ferme le menu avec Échap et après un changement de page', async () => {
    const wrapper = mountHeader()
    const toggle = wrapper.get('button[aria-controls="main-nav"]')
    await toggle.trigger('click')
    await wrapper.get('header').trigger('keydown', { key: 'Escape' })
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    await currentRouter.push('/login')
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    const wrapper = mountHeader()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
