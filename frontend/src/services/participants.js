import { ApiError } from './api'
import { getEvent } from './events'
import { searchPeople } from './people'
import { getMyProfile } from './profile'

// Simulation : il n'existe pas encore de route pour les personnes présentes à une sortie.
// L'organisateur et le nombre d'inscrits viennent de l'API ; les participants sont tirés parmi les
// vrais profils (pour que « Voir le profil » fonctionne). Réservé à l'organisateur et aux inscrits.
export async function listParticipants(id) {
  const event = await getEvent(id)
  if (!event.isOrganizer && event.myRegistration !== 'registered') throw new ApiError(403, 'Interdit.')

  const mine = await getMyProfile().catch(() => null)
  const pool = (await searchPeople()).filter((person) => person.id !== event.organizer.id && person.id !== mine?.id)
  const others = Math.min(Math.max(event.registeredCount - (event.myRegistration === 'registered' ? 1 : 0), 0), pool.length)
  const members = Array.from({ length: others }, (_, i) => pool[(event.id + i) % pool.length])
  const people = members.map((person) => ({ id: person.id, displayName: person.displayName, isOrganizer: false }))
  return event.isOrganizer ? people : [{ id: event.organizer.id, displayName: event.organizer.displayName ?? 'Un membre', isOrganizer: true }, ...people]
}
