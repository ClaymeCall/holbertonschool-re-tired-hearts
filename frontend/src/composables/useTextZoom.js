import { computed, ref } from 'vue'

const STORAGE_KEY = 'text-zoom'
const zoomed = ref(false) // le choix de la personne : il se garde d'une page à l'autre
const suspended = ref(false) // page qui ne se zoome jamais (modération) : le choix n'est que mis de côté
const active = computed(() => zoomed.value && !suspended.value)

// Le choix est un confort propre à chaque navigateur : si le stockage est indisponible, on s'en passe.
function readPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

// Le grossissement passe par un attribut sur <html> : la taille de base change, donc tout le texte suit.
function apply() {
  document.documentElement.dataset.zoom = active.value ? 'on' : 'off'
}

export function initTextZoom() {
  zoomed.value = readPreference()
  apply()
}

// Appelé à chaque changement de page : la modération s'affiche toujours à taille normale, sans toucher au choix.
export function setZoomSuspended(value) {
  suspended.value = value
  apply()
}

export function useTextZoom() {
  function toggle() {
    zoomed.value = !zoomed.value
    apply()
    try {
      localStorage.setItem(STORAGE_KEY, zoomed.value ? 'on' : 'off')
    } catch {
      // Préférence non mémorisée.
    }
  }
  return { zoomed, active, toggle }
}
