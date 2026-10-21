import { defineStore } from 'pinia'
import { listConversations } from '../services/conversations'

// Nombre de messages non lus, affiché sur « Contacts » dans l'en-tête.
export const useUnreadStore = defineStore('unread', {
  state: () => ({ total: 0 }),
  actions: {
    async refresh() {
      try {
        const conversations = await listConversations()
        this.total = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0)
      } catch {
        // On garde la dernière valeur connue : un échec ponctuel ne doit rien afficher d'alarmant.
      }
    },
    reset() {
      this.total = 0
    },
  },
})
