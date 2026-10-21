import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ProfileView from '../views/ProfileView.vue'
import EventsView from '../views/EventsView.vue'
import EventDetailView from '../views/EventDetailView.vue'
import EventFormView from '../views/EventFormView.vue'
import MyEventsView from '../views/MyEventsView.vue'
import EventPeopleView from '../views/EventPeopleView.vue'
import PersonView from '../views/PersonView.vue'
import ContactsView from '../views/ContactsView.vue'
import MembersView from '../views/MembersView.vue'
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

const privateMeta = (title) => ({ title, requiresAuth: true, noindex: true })

routes.push(
  { path: '/events', name: 'events', component: EventsView, meta: privateMeta('Les sorties') },
  { path: '/events/new', name: 'event-new', component: EventFormView, meta: privateMeta('Proposer une sortie') },
  { path: '/events/:id', name: 'event-detail', component: EventDetailView, meta: privateMeta('Détail de la sortie') },
  { path: '/events/:id/edit', name: 'event-edit', component: EventFormView, meta: privateMeta('Modifier la sortie') },
  { path: '/events/:id/people', name: 'event-people', component: EventPeopleView, meta: privateMeta('Les personnes présentes') },
  { path: '/people/:userId', name: 'person', component: PersonView, meta: privateMeta('Profil') },
  { path: '/members', name: 'members', component: MembersView, meta: privateMeta('Les membres') },
  { path: '/contacts', name: 'contacts', component: ContactsView, meta: privateMeta('Mes contacts') },
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

router.afterEach(applyPageMeta)

export default router
