import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '../router'
import * as auth from '../services/auth'
import { initTextZoom, useTextZoom } from '../composables/useTextZoom'

vi.mock('../services/auth')

const html = () => document.documentElement.dataset.zoom

describe('agrandissement du texte entre les pages', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
    auth.fetchCurrentUser.mockResolvedValue({ id: 1, isAdmin: true, accountStatus: 'active' })
    initTextZoom()
    await router.push('/events')
  })

  it('garde l\'agrandissement d\'une page à l\'autre, sauf sur la modération qui reste à taille normale', async () => {
    const { toggle, zoomed } = useTextZoom()
    if (zoomed.value) toggle()
    toggle() // on agrandit sur les sorties
    expect(html()).toBe('on')

    await router.push('/contacts')
    expect(html()).toBe('on') // les autres pages restent agrandies

    await router.push('/moderation')
    expect(router.currentRoute.value.name).toBe('moderation')
    expect(html()).toBe('off') // la modération n'est jamais agrandie
    expect(zoomed.value).toBe(true) // mais le choix est conservé

    await router.push('/events')
    expect(html()).toBe('on') // on retrouve l'état agrandi
    await router.push('/my-events')
    expect(html()).toBe('on')
    toggle()
    expect(html()).toBe('off')
  })

  it('un agrandissement activé pendant la modération s\'appliquera au retour sur les autres pages', async () => {
    const { toggle, zoomed } = useTextZoom()
    if (zoomed.value) toggle()
    await router.push('/moderation')
    toggle() // le bouton n'est pas affiché ici, mais le choix reste cohérent s'il est changé
    expect(html()).toBe('off')
    await router.push('/events')
    expect(html()).toBe('on')
    toggle()
  })
})
