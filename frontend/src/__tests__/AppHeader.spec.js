import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import AppHeader from '../components/AppHeader.vue'
import { useTextZoom } from '../composables/useTextZoom'
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
    routes: ['home', 'login', 'register', 'profile', 'events', 'event-new', 'my-events', 'contacts', 'members', 'moderation'].map((name) => ({ path: name === 'home' ? '/' : `/${name}`, name, component: stub })),
  })
  currentRouter = router
  mounted = mount(AppHeader, { global: { plugins: [pinia, router] }, attachTo: document.body })
  return mounted
}

describe('AppHeader', () => {
  beforeEach(() => {
    chat.getUnreadCount.mockResolvedValue(0)
  })

  it('montre le lien Modération aux modérateurs seulement', async () => {
    const wrapper = mountHeader()
    useSessionStore().user = { id: 1, isAdmin: false }
    await flushPromises()
    expect(wrapper.text()).not.toContain('Modération')
    useSessionStore().user = { id: 1, isAdmin: true }
    await flushPromises()
    expect(wrapper.text()).toContain('Modération')
  })

  it('tient sur une seule ligne : liens principaux au centre, profil et déconnexion à droite', async () => {
    const wrapper = mountHeader()
    useSessionStore().user = { id: 1 }
    await flushPromises()
    const nav = wrapper.get('nav')
    expect(nav.classes()).toContain('xl:contents')
    const [center, right] = nav.findAll(':scope > div')
    expect(center.classes()).toEqual(expect.arrayContaining(['xl:col-start-2', 'xl:justify-center']))
    expect(right.classes()).toEqual(expect.arrayContaining(['xl:col-start-3', 'xl:justify-end']))
    expect(center.findAll('a').map((a) => a.text().replace(/\s+/g, ' ').trim())).toEqual(['Sorties', 'Mes sorties', 'Membres', 'Contacts'])
    expect(right.findAll('a, button').map((el) => el.text())).toEqual(['Mon profil', 'Se déconnecter'])
    const items = nav.findAll('a, button')
    expect(items.every((item) => item.classes().includes('xl:whitespace-nowrap'))).toBe(true)
  })

  it('ne passe en ligne qu\'à partir d\'un écran plus large quand le texte est agrandi (sinon menu déroulant)', async () => {
    const { zoomed } = useTextZoom()
    zoomed.value = true
    const wrapper = mountHeader()
    useSessionStore().user = { id: 1 }
    await flushPromises()
    expect(wrapper.get('nav').classes()).toContain('2xl:contents')
    expect(wrapper.get('nav').classes()).not.toContain('xl:contents')
    zoomed.value = false
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
    expect(wrapper.text()).toContain('Sorties')
    expect(wrapper.findAll('a').find((a) => a.text() === 'Sorties').attributes('href')).toBe('/events')
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
    chat.getUnreadCount.mockResolvedValue(3)
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
