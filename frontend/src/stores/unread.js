import { defineStore } from 'pinia'
import { getUnreadCount } from '../services/conversations'

// Nombre de messages non lus, affiché sur « Contacts » dans l'en-tête.
export const useUnreadStore = defineStore('unread', {
  state: () => ({ total: 0 }),
  actions: {
    async refresh() {
      try {
        this.total = await getUnreadCount()
      } catch {
        // On garde la dernière valeur connue : un échec ponctuel ne doit rien afficher d'alarmant.
      }
    },
    reset() {
      this.total = 0
    },
  },
})
