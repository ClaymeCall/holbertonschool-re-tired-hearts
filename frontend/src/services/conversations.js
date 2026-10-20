import { ApiError } from './api'
import { findPerson } from './directory'
import { refusesMessages, getPerson } from './people'
import { isMessagingEnabled } from './profile'

// Simulation : les routes de messagerie n'existent pas encore côté API, et il n'y a pas de WebSocket :
// le front interroge régulièrement. Hypothèses à confirmer avec le backend :
//  - une conversation est identifiée par l'autre personne (une seule conversation par paire) ;
//  - on ne peut écrire qu'à une personne rencontrée lors d'une sortie ou à un organisateur (sinon 404) ;
//  - si l'un des deux a désactivé les messages, l'envoi est refusé (403) ; l'historique reste lisible ;
//  - message : { id, content, sentAt, fromMe } ; contenu de 1 à 1000 caractères, texte seul (sinon 400) ;
//  - liste des conversations : { person { id, displayName, approximateLocation }, lastMessage, unreadCount }.

const delay = () => new Promise((resolve) => setTimeout(resolve, 250))
const MAX_LENGTH = 1000
const REPLIES = ['Avec plaisir !', 'Merci pour votre message, à très bientôt.', 'Bonne idée, on s’organise ça ?']

let nextId = 1
const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString()
const message = (content, minutes, fromMe, read = true) => ({ id: nextId++, content, sentAt: ago(minutes), fromMe, read })

// Conversations d'exemple : une avec un contact enregistré (message non lu), une avec une personne
// pas encore enregistrée qui m'a écrit (elle doit apparaître dans mes contacts).
const threads = new Map([
  [2, [
    message('Bonjour ! Ravie de vous avoir croisé à la balade.', 180, false),
    message('Moi de même, merci pour l’organisation.', 170, true),
    message('On se retrouve à la prochaine sortie ?', 12, false, false),
  ]],
  [105, [message('Bonjour, c’est Pierre, de l’atelier poterie. Je voulais vous demander le nom de la céramiste.', 45, false, false)]],
])

const publicMessage = ({ id, content, sentAt, fromMe }) => ({ id, content, sentAt, fromMe })

async function ensureReachable(personId) {
  const person = await getPerson(personId) // 404 si le profil n'est pas accessible
  return person
}

export async function listConversations() {
  await delay()
  return [...threads.entries()]
    .map(([personId, messages]) => {
      const person = findPerson(personId)
      const last = messages[messages.length - 1]
      return {
        person: { id: person.id, displayName: person.displayName, approximateLocation: person.approximateLocation },
        lastMessage: publicMessage(last),
        unreadCount: messages.filter((item) => !item.fromMe && !item.read).length,
      }
    })
    .sort((a, b) => b.lastMessage.sentAt.localeCompare(a.lastMessage.sentAt))
}

export async function getMessages(personId) {
  await delay()
  await ensureReachable(personId)
  return (threads.get(Number(personId)) ?? []).map(publicMessage)
}

export async function markRead(personId) {
  await delay()
  ;(threads.get(Number(personId)) ?? []).forEach((item) => {
    item.read = true
  })
}

export async function sendMessage(personId, content) {
  await delay()
  const id = Number(personId)
  const text = typeof content === 'string' ? content.trim() : ''
  if (text.length < 1 || text.length > MAX_LENGTH) throw new ApiError(400, 'Message invalide.')
  await ensureReachable(id)
  if (!isMessagingEnabled() || refusesMessages(id)) throw new ApiError(403, 'Messages désactivés.')
  const thread = threads.get(id) ?? []
  const sent = message(text, 0, true)
  threads.set(id, [...thread, sent])
  // Réponse simulée quelques secondes plus tard, pour voir arriver un message sans WebSocket.
  setTimeout(() => {
    if (!isMessagingEnabled()) return
    threads.set(id, [...threads.get(id), message(REPLIES[sent.id % REPLIES.length], 0, false, false)])
  }, 6000)
  return publicMessage(sent)
}
