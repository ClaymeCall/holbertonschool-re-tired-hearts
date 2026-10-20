import { ApiError } from './api'

// Simulation : GET/PATCH /v1/profiles/me ne sont pas encore implémentées.
// Comme la vraie API (PR #108), GET répond 404 tant que le profil n'a jamais été enregistré,
// et PATCH crée le profil au premier envoi.
// Champs issus de docs/data-model.md (Profile). Les intérêts viendront avec GET /v1/interests.
let current = null

const delay = () => new Promise((resolve) => setTimeout(resolve, 400))

export async function getMyProfile() {
  await delay()
  if (!current) throw new ApiError(404, 'Profil pas encore créé.')
  return { ...current }
}

export async function updateMyProfile(data) {
  await delay()
  current = { display_name: '', bio: '', approximate_location: '', ...current, ...data }
  return { ...current }
}
