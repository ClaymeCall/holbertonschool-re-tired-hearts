// Annuaire de démonstration pour les services simulés (aucune donnée réelle).
// Les profils ne sont accessibles qu'après une sortie en commun : voir people.js.
export const PEOPLE = [
  { id: 2, displayName: 'Colette', approximateLocation: 'Lyon', bio: 'Organisatrice de balades et de sorties nature. J’aime les chemins tranquilles et les pique-niques.', interests: [{ id: 1, name: 'Randonnée' }, { id: 5, name: 'Jardinage' }] },
  { id: 101, displayName: 'Marie', approximateLocation: 'Lyon', bio: 'Retraitée depuis un an, je découvre la poterie et le yoga doux.', interests: [{ id: 3, name: 'Poterie' }, { id: 2, name: 'Yoga' }] },
  { id: 102, displayName: 'Jean-Paul', approximateLocation: 'Villeurbanne', bio: 'Ancien professeur, toujours partant pour une marche suivie d’un café.', interests: [{ id: 1, name: 'Randonnée' }] },
  { id: 103, displayName: 'Henri', approximateLocation: 'Lyon', bio: 'Cycliste du dimanche, j’aime rouler au bord du fleuve.', interests: [{ id: 6, name: 'Balade à vélo' }] },
  { id: 104, displayName: 'Odile', approximateLocation: 'Grenoble', bio: 'Danse de salon depuis toujours, je cherche des partenaires de valse.', interests: [{ id: 4, name: 'Danse' }] },
  { id: 105, displayName: 'Pierre', approximateLocation: 'Annecy', bio: 'Jardinier passionné, j’échange volontiers des plants.', interests: [{ id: 5, name: 'Jardinage' }, { id: 1, name: 'Randonnée' }] },
  { id: 106, displayName: 'Simone', approximateLocation: 'Valence', bio: 'Curieuse de tout : ateliers, balades, rencontres.', interests: [{ id: 3, name: 'Poterie' }] },
  { id: 107, displayName: 'Lucien', approximateLocation: 'Lyon', bio: 'Randonneur patient, je préfère les petits groupes.', interests: [{ id: 1, name: 'Randonnée' }, { id: 6, name: 'Balade à vélo' }] },
  { id: 108, displayName: 'Monique', approximateLocation: 'Villeurbanne', bio: 'Yoga le matin, poterie l’après-midi.', interests: [{ id: 2, name: 'Yoga' }, { id: 3, name: 'Poterie' }] },
  { id: 109, displayName: 'Gérard', approximateLocation: 'Lyon', bio: 'Je cherche des compagnons de marche pour l’automne.', interests: [{ id: 1, name: 'Randonnée' }] },
  { id: 110, displayName: 'Josette', approximateLocation: 'Annecy', bio: 'Danse et jardin, deux façons de rester active.', interests: [{ id: 4, name: 'Danse' }, { id: 5, name: 'Jardinage' }] },
  { id: 111, displayName: 'Michel', approximateLocation: 'Grenoble', bio: 'Photographe amateur, j’aime les sorties en pleine nature.', interests: [{ id: 1, name: 'Randonnée' }] },
  { id: 112, displayName: 'Nicole', approximateLocation: 'Valence', bio: 'Je me suis mise au vélo à la retraite, et je ne regrette rien.', interests: [{ id: 6, name: 'Balade à vélo' }] },
  { id: 113, displayName: 'Daniel', approximateLocation: 'Lyon', bio: 'Toujours un petit mot gentil pour le groupe.', interests: [{ id: 2, name: 'Yoga' }, { id: 4, name: 'Danse' }] },
]

// Personnes qui participent aux sorties d'exemple (hors organisateur).
export const MEMBER_POOL = PEOPLE.filter((person) => person.id >= 100)
export const findPerson = (id) => PEOPLE.find((person) => person.id === Number(id)) ?? null
