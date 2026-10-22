import { request } from './api'

// Contrat : docs/api-conventions.md et Swagger (/v1). Tout est en camelCase :
//  - liste : { items, total, page, limit } (paramètres : interest, location, page, limit)
//  - mes sorties : GET /v1/events/mine -> { registered, organized }
//  - se désinscrire sans être inscrit : 409

export const listInterests = () => request('/v1/interests')

export function listEvents({ interest = '', location = '', page = 1, limit = 12 } = {}) {
  const query = new URLSearchParams({ page, limit })
  if (interest) query.set('interest', interest)
  if (location.trim()) query.set('location', location.trim())
  return request(`/v1/events?${query}`)
}

export const getEvent = (id) => request(`/v1/events/${id}`)
export const createEvent = (data) => request('/v1/events', { method: 'POST', body: data })
export const updateEvent = (id, data) => request(`/v1/events/${id}`, { method: 'PATCH', body: data })

export const publishEvent = (id) => request(`/v1/events/${id}/publish`, { method: 'POST' })
export const cancelEvent = (id) => request(`/v1/events/${id}/cancel`, { method: 'POST' })
export const completeEvent = (id) => request(`/v1/events/${id}/complete`, { method: 'POST' })
export const deleteEvent = (id) => request(`/v1/events/${id}`, { method: 'DELETE' })

export const registerToEvent = (id) => request(`/v1/events/${id}/registrations`, { method: 'POST' })
export const withdrawFromEvent = (id) => request(`/v1/events/${id}/registrations/me`, { method: 'DELETE' })

// Mes sorties : celles où je suis inscrit(e) et celles que j'organise (tous statuts).
export const listMyEvents = () => request('/v1/events/mine')
