// Portraits génériques de seniors (Pexels, licence Pexels : usage libre, sans attribution obligatoire).
// Ce sont des photos de banque d'images : elles ne représentent pas les membres, elles illustrent seulement
// les profils tant que l'API n'a pas de photo de profil.
import women01 from './women-01.webp'
import women02 from './women-02.webp'
import women03 from './women-03.webp'
import women04 from './women-04.webp'
import women05 from './women-05.webp'
import women06 from './women-06.webp'
import women07 from './women-07.webp'
import women08 from './women-08.webp'
import women09 from './women-09.webp'
import women10 from './women-10.webp'
import men01 from './men-01.webp'
import men02 from './men-02.webp'
import men03 from './men-03.webp'
import men04 from './men-04.webp'
import men05 from './men-05.webp'
import men06 from './men-06.webp'
import men07 from './men-07.webp'
import men08 from './men-08.webp'
import men09 from './men-09.webp'
import men10 from './men-10.webp'

// Portraits attribués aux membres de la seed (nom affiché sans accents, en minuscules) : chaque membre
// visible de la démonstration a une photo différente. Les autres profils reçoivent une photo du même genre.
export const portraitsByName = {
  'alice moreau': women01,
  'emma bernard': women02,
  'colette dubois': women03,
  'francoise garnier': women04,
  'monique fontaine': women05,
  'odile perrin': women06,
  'josette faure': women07,
  'nicole andre': women08,
  'christiane blanc': women09,
  'denise lemoine': women10,
  'bob laurent': men01,
  'dave robert': men02,
  'farid haddad': men03,
  'gerard lefebvre': men04,
  'jacques moreau': men05,
  'henri vidal': men06,
  'michel giraud': men08,
  'bernard roche': men09,
  'pierre mercier': men10,
}

// Photo par défaut : celle de tout membre qui n'a pas choisi de photo (par exemple un compte créé pendant une
// présentation). Elle n'est pas attribuée à un membre de la seed.
export const defaultPortrait = men07
