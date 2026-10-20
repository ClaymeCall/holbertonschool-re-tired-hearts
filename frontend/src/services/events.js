import { ApiError } from './api'

// Simulation : les routes /v1/events ne sont pas encore implémentées (phase 2).
// Le contrat suit docs/api-conventions.md et les précisions de N-Haitu31 (backend) :
//  - tout est en camelCase : startsAt, approximateLocation, mainInterest { id, name },
//    organizer { id, displayName }, registeredCount, isOrganizer,
//    myRegistration ('registered' | 'withdrawn' | null)
//  - liste : { items, total, page, limit } (paramètres : interest, location, page, limit)
//  - publier : POST /v1/events/:id/publish (pas de PATCH sur le statut)
//  - annuler : seulement une sortie publiée ; un brouillon se supprime
//  - mes sorties : GET /v1/events/mine -> { registered, organized }
//  - se désinscrire sans être inscrit : 409 (et non 404)

const delay = () => new Promise((resolve) => setTimeout(resolve, 300))
const inDays = (days, hour = 10) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const interests = [
  { id: 1, name: 'Randonnée' },
  { id: 2, name: 'Yoga' },
  { id: 3, name: 'Poterie' },
  { id: 4, name: 'Danse' },
  { id: 5, name: 'Jardinage' },
  { id: 6, name: 'Balade à vélo' },
]
const me = { id: 1, displayName: 'Vous' }

const sample = (id, interestId, title, location, days, capacity, registered, extra = {}) => ({
  id,
  title,
  description: 'Une sortie conviviale ouverte à tous. Venez comme vous êtes, nous prendrons le temps de faire connaissance.',
  approximateLocation: location,
  startsAt: inDays(days),
  capacity,
  status: 'published',
  mainInterest: interests.find((interest) => interest.id === interestId),
  organizer: { id: 2, displayName: 'Colette' },
  registeredCount: registered,
  isOrganizer: false,
  myRegistration: null,
  ...extra,
})

let events = [
  sample(1, 1, 'Randonnée dans les collines', 'Lyon', 3, 12, 7),
  sample(2, 2, 'Séance de yoga en plein air', 'Lyon', 5, 10, 10),
  sample(3, 3, 'Atelier poterie', 'Villeurbanne', 8, 8, 3, { myRegistration: 'registered' }),
  sample(4, 4, 'Après-midi dansante', 'Grenoble', 10, 30, 12),
  sample(5, 5, 'Troc de plantes et jardinage', 'Lyon', 12, 15, 4),
  sample(6, 6, 'Balade à vélo au bord du fleuve', 'Valence', 15, 14, 6),
  sample(7, 1, 'Marche douce du dimanche', 'Annecy', 18, 20, 9),
  sample(8, 3, 'Poterie : cuisson et finitions', 'Lyon', 21, 6, 0, {
    organizer: me,
    isOrganizer: true,
    status: 'draft',
  }),
]
// Jeu d'exemple plus long pour voir le chargement progressif (12 par 12).
const cities = ['Lyon', 'Grenoble', 'Annecy', 'Valence', 'Villeurbanne']
for (let i = 0; i < 24; i += 1) {
  const interestId = (i % interests.length) + 1
  events.push(
    sample(9 + i, interestId, `${interests[interestId - 1].name} n°${i + 1}`, cities[i % cities.length], 22 + i, 8 + (i % 10), i % 8),
  )
}
// Sorties passées : trois où j'étais inscrit(e), une que j'ai organisée.
events.push(
  sample(33, 1, 'Randonnée d’automne', 'Lyon', -20, 12, 9, { status: 'completed', myRegistration: 'registered' }),
  sample(34, 3, 'Atelier poterie découverte', 'Villeurbanne', -35, 8, 8, { status: 'completed', myRegistration: 'registered' }),
  sample(35, 6, 'Balade à vélo de rentrée', 'Valence', -50, 14, 11, { status: 'completed', myRegistration: 'registered' }),
  sample(36, 5, 'Troc de plantes d’automne', 'Lyon', -28, 15, 6, { organizer: me, isOrganizer: true, status: 'completed' }),
)
let nextId = 37

const find = (id) => events.find((event) => event.id === Number(id))
const copy = (event) => ({ ...event, organizer: { ...event.organizer }, mainInterest: { ...event.mainInterest } })
const notFound = () => new ApiError(404, 'Introuvable.')

export async function listInterests() {
  await delay()
  return interests.map((interest) => ({ ...interest }))
}

export async function listEvents({ interest = '', location = '', page = 1, limit = 12 } = {}) {
  await delay()
  const wanted = location.trim().toLowerCase()
  const matching = events
    .filter((event) => event.status === 'published')
    .filter((event) => !interest || event.mainInterest.id === Number(interest))
    .filter((event) => !wanted || event.approximateLocation.toLowerCase().includes(wanted))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const start = (page - 1) * limit
  return { items: matching.slice(start, start + limit).map(copy), total: matching.length, page, limit }
}

export async function getEvent(id) {
  await delay()
  const event = find(id)
  if (!event) throw notFound()
  return copy(event)
}

export async function createEvent(data) {
  await delay()
  const event = {
    ...data,
    id: nextId++,
    status: 'draft',
    mainInterest: interests.find((interest) => interest.id === Number(data.mainInterestId)),
    organizer: me,
    registeredCount: 0,
    isOrganizer: true,
    myRegistration: null,
  }
  events = [...events, event]
  return copy(event)
}

export async function updateEvent(id, data) {
  await delay()
  const event = find(id)
  if (!event) throw notFound()
  if (!event.isOrganizer) throw new ApiError(403, 'Interdit.')
  if (data.capacity !== undefined && Number(data.capacity) < event.registeredCount) {
    throw new ApiError(409, 'Capacité inférieure au nombre d’inscrits.')
  }
  Object.assign(event, data)
  if (data.mainInterestId) event.mainInterest = interests.find((interest) => interest.id === Number(data.mainInterestId))
  return copy(event)
}

async function transition(id, from, to) {
  await delay()
  const event = find(id)
  if (!event) throw notFound()
  if (!event.isOrganizer) throw new ApiError(403, 'Interdit.')
  if (!from.includes(event.status)) throw new ApiError(409, 'Action impossible dans cet état.')
  event.status = to
  return copy(event)
}

export const publishEvent = (id) => transition(id, ['draft'], 'published')
export const cancelEvent = (id) => transition(id, ['published'], 'cancelled')
export const completeEvent = (id) => transition(id, ['published'], 'completed')

export async function deleteEvent(id) {
  await delay()
  const event = find(id)
  if (!event) throw notFound()
  if (!event.isOrganizer) throw new ApiError(403, 'Interdit.')
  if (event.status !== 'draft' || event.registeredCount > 0) throw new ApiError(409, 'Suppression impossible.')
  events = events.filter((item) => item.id !== event.id)
}

export async function registerToEvent(id) {
  await delay()
  const event = find(id)
  if (!event) throw notFound()
  if (event.isOrganizer) throw new ApiError(403, 'Interdit.')
  const full = event.registeredCount >= event.capacity
  const past = new Date(event.startsAt) < new Date()
  if (event.status !== 'published' || full || past || event.myRegistration === 'registered') {
    throw new ApiError(409, 'Inscription impossible.')
  }
  event.registeredCount += 1
  event.myRegistration = 'registered'
  return copy(event)
}

export async function withdrawFromEvent(id) {
  await delay()
  const event = find(id)
  if (!event) throw notFound()
  if (event.myRegistration !== 'registered') throw new ApiError(409, 'Pas d’inscription active.')
  event.registeredCount -= 1
  event.myRegistration = 'withdrawn'
  return copy(event)
}

// Mes sorties : celles où je suis inscrit(e) et celles que j'organise (tous statuts).
export async function listMyEvents() {
  await delay()
  return {
    registered: events.filter((event) => event.myRegistration === 'registered').map(copy),
    organized: events.filter((event) => event.isOrganizer).map(copy),
  }
}
