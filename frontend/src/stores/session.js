import { defineStore } from 'pinia'
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../services/auth'

// La session vit dans un cookie httpOnly posé par l'API : on ne garde ici que l'utilisateur
// courant (jamais de jeton ni de mot de passe côté navigateur).
export const useSessionStore = defineStore('session', {
  state: () => ({ user: null, ready: false }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
  },
  actions: {
    // Retrouve la session après un rechargement de page.
    async init() {
      if (this.ready) return
      try {
        this.user = await fetchCurrentUser()
      } catch {
        this.user = null
      }
      this.ready = true
    },
    async login(credentials) {
      this.user = await loginRequest(credentials)
    },
    // L'inscription ouvre directement une session.
    async register(credentials) {
      this.user = await registerRequest(credentials)
    },
    async logout() {
      try {
        await logoutRequest()
      } finally {
        this.user = null
      }
    },
    expire() {
      this.user = null
    },
  },
})
