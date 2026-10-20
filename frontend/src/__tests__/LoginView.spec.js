import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import LoginView from '../views/LoginView.vue'
import { ApiError } from '../services/api'
import * as auth from '../services/auth'

vi.mock('../services/auth')

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: LoginView },
      { path: '/register', name: 'register', component: { template: '<div />' } },
    ],
  })
  const wrapper = mount(LoginView, { global: { plugins: [pinia, router] }, attachTo: document.body })
  return { wrapper, router }
}

async function fill(wrapper, email, password) {
  await wrapper.get('#email').setValue(email)
  await wrapper.get('#password').setValue(password)
}

describe('LoginView', () => {
  beforeEach(() => vi.resetAllMocks())

  it('affiche les erreurs de champ sans appeler le service', async () => {
    const { wrapper } = mountView()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Saisissez votre adresse e-mail.')
    expect(wrapper.text()).toContain('Saisissez votre mot de passe.')
    expect(wrapper.get('#email').attributes('aria-invalid')).toBe('true')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('refuse une adresse e-mail invalide', async () => {
    const { wrapper } = mountView()
    await fill(wrapper, 'pas-un-email', 'secret')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('adresse e-mail valide')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('connecte et redirige vers l\'accueil en cas de succès', async () => {
    auth.login.mockResolvedValue({ id: 1, email: 'a@b.fr', isAdmin: false, accountStatus: 'active' })
    const { wrapper, router } = mountView()
    await fill(wrapper, ' a@b.fr ', 'secret')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(auth.login).toHaveBeenCalledWith({ email: 'a@b.fr', password: 'secret' })
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('affiche un message générique sur 401', async () => {
    auth.login.mockRejectedValue(new ApiError(401, 'x'))
    const { wrapper } = mountView()
    await fill(wrapper, 'a@b.fr', 'mauvais')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Adresse e-mail ou mot de passe incorrect.')
  })

  it('désactive le bouton pendant le chargement', async () => {
    auth.login.mockReturnValue(new Promise(() => {}))
    const { wrapper } = mountView()
    await fill(wrapper, 'a@b.fr', 'secret')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    const { wrapper } = mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
