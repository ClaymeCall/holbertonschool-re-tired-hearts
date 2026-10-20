import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './services/api'
import { useSessionStore } from './stores/session'

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)

// Session expirée pendant la navigation : retour à la connexion.
setUnauthorizedHandler(() => {
  useSessionStore(pinia).expire()
  router.push({ name: 'login' })
})

app.mount('#app')
