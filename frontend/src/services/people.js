import { ApiError } from './api'
import { findPerson } from './directory'
import { listMetPersonIds, listOrganizerIds } from './events'

// Simulation : ces routes n'existent pas encore côté API. Hypothèses à confirmer avec le backend :
//  - un profil n'est visible que pour une personne rencontrée lors d'une sortie (ou un organisateur) ;
//    sinon 404, comme un profil inexistant ;
//  - profil : { id, displayName, bio, approximateLocation, interests [{ id, name }], isContact } ;
//  - contacts : enregistrer / retirer un profil, et lister mes contacts enregistrés.

const delay = () => new Promise((resolve) => setTimeout(resolve, 250))
const saved = new Set([2])
const notFound = () => new ApiError(404, 'Introuvable.')

function visiblePerson(userId) {
  const id = Number(userId)
  const person = findPerson(id)
  const reachable = new Set([...listMetPersonIds(), ...listOrganizerIds()])
  if (!person || !reachable.has(id)) throw notFound()
  return person
}

const present = (person) => ({ ...person, interests: person.interests.map((interest) => ({ ...interest })), isContact: saved.has(person.id) })

export async function getPerson(userId) {
  await delay()
  return present(visiblePerson(userId))
}

export async function listContacts() {
  await delay()
  return [...saved].map((id) => findPerson(id)).filter(Boolean).map(present)
}

export async function saveContact(userId) {
  await delay()
  const person = visiblePerson(userId)
  saved.add(person.id)
  return present(person)
}

export async function removeContact(userId) {
  await delay()
  const person = visiblePerson(userId)
  saved.delete(person.id)
  return present(person)
}
