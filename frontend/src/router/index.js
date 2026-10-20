import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ProfileView from '../views/ProfileView.vue'
import { useSessionStore } from '../stores/session'

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: 'Accueil' } },
  { path: '/login', name: 'login', component: LoginView, meta: { title: 'Connexion' } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: 'Inscription' } },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { title: 'Mon profil', requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Garde d'interface seulement : l'API doit refuser elle-même toute requête non authentifiée.
router.beforeEach(async (to) => {
  const session = useSessionStore()
  await session.init()
  if (to.meta.requiresAuth && !session.isAuthenticated) return { name: 'login' }
})

router.afterEach((to) => {
  document.title = `${to.meta.title} – Re-Tired Hearts`
})

export default router
