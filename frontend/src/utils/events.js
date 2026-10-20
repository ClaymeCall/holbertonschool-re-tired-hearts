const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export const STATUS_LABELS = {
  draft: 'Brouillon',
  published: 'Ouverte aux inscriptions',
  cancelled: 'Annulée',
  completed: 'Terminée',
}

export function formatEventDate(iso) {
  return dateFormat.format(new Date(iso))
}

export function availablePlaces(event) {
  return Math.max(event.capacity - event.registeredCount, 0)
}

export function placesLabel(event) {
  const places = availablePlaces(event)
  if (places === 0) return 'Complet'
  return places === 1 ? '1 place restante' : `${places} places restantes`
}

// Règles d'inscription (docs/requirements.md, phase 2) : seule une sortie publiée, à venir
// et non complète accepte des inscriptions, jamais pour son organisateur.
export function registrationState(event, now = new Date()) {
  if (event.isOrganizer) return { allowed: false, reason: 'Vous organisez cette sortie.' }
  if (event.status === 'cancelled') return { allowed: false, reason: 'Cette sortie est annulée.' }
  if (event.status === 'completed') return { allowed: false, reason: 'Cette sortie est terminée.' }
  if (event.status !== 'published') return { allowed: false, reason: 'Cette sortie n’est pas encore ouverte.' }
  if (new Date(event.startsAt) < now) return { allowed: false, reason: 'Cette sortie a déjà eu lieu.' }
  if (availablePlaces(event) === 0) return { allowed: false, reason: 'Cette sortie est complète.' }
  return { allowed: true, reason: '' }
}

// Valeur attendue par <input type="datetime-local"> (heure locale).
export function toLocalInput(iso) {
  const date = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Date en morceaux pour la pastille « calendrier » de la carte.
export function eventDateParts(iso) {
  const date = new Date(iso)
  return {
    day: date.getDate(),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', ''),
    weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date),
    time: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date),
  }
}

// Type de sortie d'après le centre d'intérêt principal (nom fourni par l'API) : on reconnaît des
// mots-clés. Sans centre d'intérêt, ou avec « Autre » ou tout nom inconnu, on garde la photo générique.
const KEYWORDS = [
  ['cycling', /v[ée]lo|cycl|bike/i],
  ['hiking', /rando|marche|balade|hik|walk|nature/i],
  ['yoga', /yoga|gym|d[ée]tente|stretch/i],
  ['pottery', /poter|c[ée]ram|atelier|peinture|craft|\barts?\b/i],
  ['dance', /dans|danc|music|chant|chor/i],
  ['garden', /jardin|plante|potager|garden/i],
]

export function eventKind(interestName) {
  const name = typeof interestName === 'string' ? interestName : ''
  const found = KEYWORDS.find(([, pattern]) => pattern.test(name))
  return found ? found[0] : 'generic'
}
