import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '../router'
import * as auth from '../services/auth'
import { ApiError } from '../services/api'

vi.mock('../services/auth')

const member = { id: 1, email: 'a@b.fr', accountStatus: 'active' }

describe('navigation', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    auth.fetchCurrentUser.mockRejectedValue(new ApiError(401, 'x'))
    await router.push('/login')
  })

  it('affiche la page de présentation à un visiteur', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('renvoie un visiteur vers la connexion pour une page privée', async () => {
    await router.push('/events')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('retrouve la session au chargement et laisse passer un membre connecté', async () => {
    setActivePinia(createPinia())
    auth.fetchCurrentUser.mockResolvedValue(member)
    await router.push('/profile')
    expect(router.currentRoute.value.name).toBe('profile')
  })

  it('renvoie un membre connecté vers les sorties quand il va sur l\'accueil', async () => {
    setActivePinia(createPinia())
    auth.fetchCurrentUser.mockResolvedValue(member)
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('events')
  })
})
