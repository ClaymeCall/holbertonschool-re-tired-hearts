import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import RegisterView from '../views/RegisterView.vue'
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
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/profile', name: 'profile', component: { template: '<div />' } },
      { path: '/register', name: 'register', component: RegisterView },
    ],
  })
  const wrapper = mount(RegisterView, { global: { plugins: [pinia, router] }, attachTo: document.body })
  return { wrapper, router }
}

async function fill(wrapper, email, password, confirmPassword = password) {
  await wrapper.get('#email').setValue(email)
  await wrapper.get('#password').setValue(password)
  await wrapper.get('#confirm-password').setValue(confirmPassword)
}

describe('RegisterView', () => {
  beforeEach(() => vi.resetAllMocks())

  it('affiche les erreurs de champ sans appeler le service', async () => {
    const { wrapper, router } = mountView()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Saisissez votre adresse e-mail.')
    expect(wrapper.text()).toContain('Choisissez un mot de passe.')
    expect(wrapper.text()).toContain('Confirmez votre mot de passe.')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('refuse deux mots de passe différents', async () => {
    const { wrapper, router } = mountView()
    await fill(wrapper, 'a@b.fr', 'a-long-password', 'autre-mot-de-passe')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Les deux mots de passe ne correspondent pas.')
    expect(wrapper.get('#confirm-password').attributes('aria-invalid')).toBe('true')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('refuse un mot de passe de moins de 8 caractères', async () => {
    const { wrapper } = mountView()
    await fill(wrapper, 'a@b.fr', 'court')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('au moins 8 caractères')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('crée le compte, ouvre la session et envoie vers le profil', async () => {
    auth.register.mockResolvedValue({ id: 1, email: 'a@b.fr', isAdmin: false, accountStatus: 'active' })
    const { wrapper, router } = mountView()
    await fill(wrapper, 'a@b.fr', 'a-long-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(auth.register).toHaveBeenCalledWith({ email: 'a@b.fr', password: 'a-long-password' })
    expect(router.currentRoute.value.name).toBe('profile')
  })

  it('affiche un message sûr sur 409 sans révéler que l\'e-mail existe', async () => {
    auth.register.mockRejectedValue(new ApiError(409, 'x'))
    const { wrapper, router } = mountView()
    await fill(wrapper, 'a@b.fr', 'a-long-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Impossible de créer ce compte avec ces informations.')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    const { wrapper, router } = mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
