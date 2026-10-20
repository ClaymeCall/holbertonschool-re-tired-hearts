import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './services/api'
import { useSessionStore } from './stores/session'
import { initTextZoom } from './composables/useTextZoom'

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)

// Session expirée pendant la navigation : retour à la connexion.
setUnauthorizedHandler(() => {
  useSessionStore(pinia).expire()
  router.push({ name: 'login' })
})

initTextZoom()
app.mount('#app')
