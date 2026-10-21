import { request } from './api'

// Pas de WebSocket : le front interroge régulièrement. Une conversation est identifiée par
// l'autre personne (id de profil, comme GET /v1/profiles/:id), une seule par paire.
//  - message : { id, content, sentAt, fromMe } ; contenu de 1 à 1000 caractères, texte seul (sinon 400) ;
//  - liste : { person { id, displayName, approximateLocation, available }, lastMessage, unreadCount }.

export async function listConversations() {
  const conversations = await request('/v1/conversations')
  // Une personne devenue indisponible n'a plus de nom : on garde une conversation lisible.
  return conversations.map((conversation) => ({
    ...conversation,
    person: { ...conversation.person, displayName: conversation.person.displayName ?? 'Un membre' },
  }))
}

export const getMessages = (personId) => request(`/v1/conversations/with/${personId}/messages`)

export const markRead = (personId) => request(`/v1/conversations/with/${personId}/read`, { method: 'POST' })

export const sendMessage = (personId, content) =>
  request(`/v1/conversations/with/${personId}/messages`, { method: 'POST', body: { content } })

export async function getUnreadCount() {
  return (await request('/v1/conversations/unread-count')).unreadCount
}
