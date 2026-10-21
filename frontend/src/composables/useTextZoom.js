import { ref } from 'vue'

const STORAGE_KEY = 'text-zoom'
const zoomed = ref(false)

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
  document.documentElement.dataset.zoom = zoomed.value ? 'on' : 'off'
}

export function initTextZoom() {
  zoomed.value = readPreference()
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
  return { zoomed, toggle }
}
