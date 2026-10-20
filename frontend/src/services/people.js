import { ApiError } from './api'
import { PEOPLE, findPerson } from './directory'
import { listMetPersonIds, listOrganizerIds } from './events'

// Simulation : ces routes n'existent pas encore côté API (la PR #108 apporte les profils). Hypothèses à confirmer :
//  - tous les profils approuvés se voient et se recherchent, sans condition (un profil inexistant : 404) ;
//  - recherche : paramètres `search` (nom ou ville) et `interest` ;
//  - profil : { id, displayName, bio, approximateLocation, interests [{ id, name }], isContact,
//    canMessage, acceptsMessages } ;
//  - `canMessage` est calculé côté serveur : on ne peut écrire qu'à une personne avec qui on a partagé une
//    sortie, ou à l'organisateur d'une sortie (docs/messaging-rules.md) ;
//  - contacts : enregistrer / retirer un profil, et lister mes contacts enregistrés.

const delay = () => new Promise((resolve) => setTimeout(resolve, 250))
const saved = new Set([2])
const NO_MESSAGES = new Set([113]) // personnes qui ont désactivé les messages
export const refusesMessages = (id) => NO_MESSAGES.has(Number(id))
const notFound = () => new ApiError(404, 'Introuvable.')

function existingPerson(userId) {
  const person = findPerson(userId)
  if (!person) throw notFound()
  return person
}

// Lien de contact : une sortie partagée, ou l'organisateur d'une sortie.
export function canMessagePerson(userId) {
  const id = Number(userId)
  return listMetPersonIds().has(id) || listOrganizerIds().has(id)
}

const present = (person) => ({
  ...person,
  interests: person.interests.map((interest) => ({ ...interest })),
  isContact: saved.has(person.id),
  canMessage: canMessagePerson(person.id),
  acceptsMessages: !NO_MESSAGES.has(person.id),
})

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export async function getPerson(userId) {
  await delay()
  return present(existingPerson(userId))
}

// Recherche de membres : nom ou ville, et centre d'intérêt.
export async function searchPeople({ search = '', interest = '' } = {}) {
  await delay()
  const wanted = normalize(search.trim())
  return PEOPLE.filter((person) => !wanted || normalize(person.displayName).includes(wanted) || normalize(person.approximateLocation).includes(wanted))
    .filter((person) => !interest || person.interests.some((item) => item.id === Number(interest)))
    .map(present)
}

export async function listContacts() {
  await delay()
  return [...saved].map((id) => findPerson(id)).filter(Boolean).map(present)
}

export async function saveContact(userId) {
  await delay()
  const person = existingPerson(userId)
  saved.add(person.id)
  return present(person)
}

export async function removeContact(userId) {
  await delay()
  const person = existingPerson(userId)
  saved.delete(person.id)
  return present(person)
}
