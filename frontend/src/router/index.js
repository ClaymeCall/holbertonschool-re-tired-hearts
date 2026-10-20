import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ProfileView from '../views/ProfileView.vue'
import { useSessionStore } from '../stores/session'
import { applyPageMeta } from './meta'

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: 'Sorties entre seniors' } },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { title: 'Connexion', description: 'Connectez-vous pour retrouver vos sorties et vos conversations.', guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
    meta: { title: 'Inscription', description: 'Créez votre compte pour rejoindre des sorties entre seniors près de chez vous.', guestOnly: true },
  },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { title: 'Mon profil', requiresAuth: true, noindex: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Garde d'interface seulement : l'API doit refuser elle-même toute requête non authentifiée.
router.beforeEach(async (to) => {
  const session = useSessionStore()
  await session.init()
  // Un membre déjà connecté n'a rien à faire sur la connexion ou l'inscription.
  if (to.meta.guestOnly && session.isAuthenticated) return { name: 'home' }
  if (to.meta.requiresAuth && !session.isAuthenticated) return { name: 'login' }
})

router.afterEach(applyPageMeta)

export default router
