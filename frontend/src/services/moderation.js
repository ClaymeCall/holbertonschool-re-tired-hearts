import { request } from './api'

// Routes réservées aux modérateurs (`/v1/moderation/*`). Le motif est facultatif et jamais exigé.
// Les routes de profil prennent un id de profil ; suspendre / réactiver prennent un id de compte
// (`userId` dans la liste des profils) ; annuler une sortie prend un id de sortie.

export const listProfilesByStatus = (status) => request(`/v1/moderation/profiles?status=${status}`)
export const listActions = () => request('/v1/moderation/actions')

const act = (path) => request(`/v1/moderation/${path}`, { method: 'POST', body: {} })

export const approveProfile = (profileId) => act(`profiles/${profileId}/approve`)
export const blockProfile = (profileId) => act(`profiles/${profileId}/block`)
export const unblockProfile = (profileId) => act(`profiles/${profileId}/unblock`)
export const suspendAccount = (userId) => act(`users/${userId}/suspend`)
export const reactivateAccount = (userId) => act(`users/${userId}/reactivate`)
export const cancelEventAsModerator = (eventId) => act(`events/${eventId}/cancel`)
