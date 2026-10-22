import { request } from './api'

// GET répond 404 tant que le profil n'a jamais été enregistré ; PATCH le crée au premier envoi.
export const getMyProfile = () => request('/v1/profiles/me')

export const updateMyProfile = (data) => request('/v1/profiles/me', { method: 'PATCH', body: data })
