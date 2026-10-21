import { onBeforeUnmount, onMounted } from 'vue'

// Appelle `callback` à intervalle régulier tant que le composant existe et que l'onglet est visible.
// Sans WebSocket, c'est ainsi que les nouveaux messages arrivent.
export function usePolling(callback, intervalMs) {
  let timer = null

  const tick = () => {
    if (document.visibilityState !== 'hidden') callback()
  }

  onMounted(() => {
    timer = setInterval(tick, intervalMs)
  })
  onBeforeUnmount(() => clearInterval(timer))
}
