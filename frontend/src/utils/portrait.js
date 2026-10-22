import { defaultPortrait, portraitsByName } from '../assets/members'
import { normalizeName } from './name'

// Portrait d'un membre sans photo de profil : celui qui lui est attribué (membres de la démonstration), sinon la
// photo par défaut.
export const portraitFor = (displayName) => portraitsByName[normalizeName(displayName)] ?? defaultPortrait
