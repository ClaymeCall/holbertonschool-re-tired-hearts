// Pour choisir une photo de banque d'images qui ne contredise pas le prénom, en attendant de vraies photos de profil.
// L'API ne stocke aucun genre : on ne devine que pour des prénoms français courants et sans ambiguïté.
// Un prénom inconnu, mixte (Camille, Dominique, Claude…) ou absent ne reçoit AUCUNE photo de personne.
const FEMININE = [
  'alice', 'agnes', 'andree', 'anne', 'annie', 'antoinette', 'brigitte', 'carol', 'carole', 'catherine', 'cecile', 'chantal', 'christiane',
  'christine', 'claudine', 'colette', 'corinne', 'danielle', 'denise', 'dominique-anne', 'dorothee', 'edith', 'eliane', 'elisabeth', 'emilie',
  'eva', 'evelyne', 'francoise', 'genevieve', 'georgette', 'ginette', 'helene', 'huguette', 'irene', 'isabelle', 'jacqueline', 'jane', 'jeanne',
  'jeannine', 'josette', 'josiane', 'julie', 'laure', 'laurence', 'lea', 'liliane', 'louise', 'lucette', 'lucie', 'lydie', 'madeleine',
  'marguerite', 'marie', 'marie-claude', 'marie-france', 'marie-therese', 'marthe', 'martine', 'mathilde', 'micheline', 'monique', 'nadine',
  'nathalie', 'nicole', 'odette', 'odile', 'paulette', 'pauline', 'raymonde', 'renee', 'rose', 'sandrine', 'sylvie', 'simone', 'solange',
  'suzanne', 'sophie', 'therese', 'valerie', 'veronique', 'yvette', 'yvonne',
]
const MASCULINE = [
  'adrien', 'alain', 'albert', 'andre', 'antoine', 'armand', 'bernard', 'bob', 'bruno', 'christian', 'christophe', 'claude-henri', 'daniel', 'dave',
  'david', 'denis', 'didier', 'dominique-pierre', 'edouard', 'emile', 'eric', 'etienne', 'eugene', 'fernand', 'francois', 'frederic', 'gaston',
  'georges', 'gerard', 'gilbert', 'gilles', 'guy', 'henri', 'hubert', 'jacques', 'jean', 'jean-claude', 'jean-francois', 'jean-jacques',
  'jean-louis', 'jean-marc', 'jean-michel', 'jean-paul', 'jean-pierre', 'joseph', 'julien', 'laurent', 'leon', 'lionel', 'louis', 'lucien', 'marc',
  'marcel', 'maurice', 'max', 'michel', 'nicolas', 'noel', 'olivier', 'patrick', 'paul', 'philippe', 'pierre', 'raymond', 'rene', 'robert', 'roger',
  'roland', 'serge', 'stephane', 'sylvain', 'thierry', 'victor', 'vincent', 'yves',
]

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// 'feminine', 'masculine' ou null quand on ne sait pas : on ne devine jamais.
export function guessGender(displayName) {
  const first = normalize(String(displayName ?? '')).split(/\s+/)[0]
  if (!first) return null
  const feminine = FEMININE.includes(first)
  const masculine = MASCULINE.includes(first)
  if (feminine === masculine) return null // inconnu (ou présent dans les deux listes)
  return feminine ? 'feminine' : 'masculine'
}
