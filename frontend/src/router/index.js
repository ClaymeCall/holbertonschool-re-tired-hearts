import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ProfileView from '../views/ProfileView.vue'
import EventsView from '../views/EventsView.vue'
import EventDetailView from '../views/EventDetailView.vue'
import EventFormView from '../views/EventFormView.vue'
import MyEventsView from '../views/MyEventsView.vue'
import { useSessionStore } from '../stores/session'

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: 'Accueil' } },
  { path: '/login', name: 'login', component: LoginView, meta: { title: 'Connexion', guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: 'Inscription', guestOnly: true } },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { title: 'Mon profil', requiresAuth: true } },
]

const privateMeta = (title) => ({ title, requiresAuth: true, noindex: true })

routes.push(
  { path: '/events', name: 'events', component: EventsView, meta: privateMeta('Les sorties') },
  { path: '/events/new', name: 'event-new', component: EventFormView, meta: privateMeta('Proposer une sortie') },
  { path: '/events/:id', name: 'event-detail', component: EventDetailView, meta: privateMeta('Détail de la sortie') },
  { path: '/events/:id/edit', name: 'event-edit', component: EventFormView, meta: privateMeta('Modifier la sortie') },
  { path: '/my-events', name: 'my-events', component: MyEventsView, meta: privateMeta('Mes sorties') },
)

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
  // Une fois connecté, l'accueil de présentation laisse place à la liste des sorties.
  if (to.name === 'home' && session.isAuthenticated) return { name: 'events' }
  if (to.meta.requiresAuth && !session.isAuthenticated) return { name: 'login' }
})

router.afterEach((to) => {
  document.title = `${to.meta.title} – Re-Tired Hearts`
})

export default router
