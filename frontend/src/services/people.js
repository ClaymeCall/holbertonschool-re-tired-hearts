import { request } from './api'

// Profils des membres : GET /v1/profiles (profils approuvés) et GET /v1/profiles/:id.
// La route de liste n'a pas de paramètres : la recherche (nom ou ville) et le filtre par centre
// d'intérêt se font ici. « Contacts » n'a pas de route côté API : la liste est gardée dans le navigateur.

const CONTACTS_KEY = 'retired-hearts:contacts'

function savedIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(CONTACTS_KEY) ?? '[]')
    return new Set(Array.isArray(ids) ? ids.filter(Number.isInteger) : [])
  } catch {
    return new Set()
  }
}

function persist(ids) {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify([...ids]))
  } catch {
    // Stockage indisponible (navigation privée) : les contacts ne sont pas conservés.
  }
}

const present = (person) => ({ ...person, isContact: savedIds().has(person.id) })

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export async function getPerson(userId) {
  return present(await request(`/v1/profiles/${userId}`))
}

export async function searchPeople({ search = '', interest = '' } = {}) {
  const wanted = normalize(search.trim())
  const profiles = await request('/v1/profiles')
  return profiles
    .filter((person) => !wanted || normalize(person.displayName).includes(wanted) || normalize(person.approximateLocation).includes(wanted))
    .filter((person) => !interest || person.interests.some((item) => item.id === Number(interest)))
    .map(present)
}

export async function listContacts() {
  const people = await Promise.all(
    [...savedIds()].map((id) => getPerson(id).catch(() => null)), // profil devenu indisponible : ignoré
  )
  return people.filter(Boolean)
}

export async function saveContact(userId) {
  const person = await getPerson(userId)
  persist(new Set([...savedIds(), person.id]))
  return { ...person, isContact: true }
}

export async function removeContact(userId) {
  const person = await getPerson(userId)
  const ids = savedIds()
  ids.delete(person.id)
  persist(ids)
  return { ...person, isContact: false }
}
