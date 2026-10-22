<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePolling } from '../composables/usePolling'
import { useTextZoom } from '../composables/useTextZoom'
import { useSessionStore } from '../stores/session'
import { useUnreadStore } from '../stores/unread'
import UnreadBadge from './UnreadBadge.vue'
import AppLogo from './AppLogo.vue'

const session = useSessionStore()
const router = useRouter()
const unread = useUnreadStore()
const route = useRoute()
const { zoomed } = useTextZoom()

// Sur mobile, la navigation est un menu déroulant ; sur grand écran, elle reste affichée en ligne.
const menuOpen = ref(false)
watch(() => route.fullPath, () => (menuOpen.value = false))

// Messages non lus : rafraîchis toutes les 30 secondes tant que le membre est connecté (pas de WebSocket).
watch(() => session.isAuthenticated, (connected) => (connected ? unread.refresh() : unread.reset()), { immediate: true })
usePolling(() => session.isAuthenticated && unread.refresh(), 30000)

async function logout() {
  await session.logout().catch(() => {})
  router.push({ name: 'home' })
}

const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2'

// Toute la barre tient sur une seule ligne : la navigation n'est affichée en ligne que quand il y a la place
// (à partir de `xl`, ou de `2xl` quand le texte est agrandi), sinon c'est le menu déroulant.
const LAYOUTS = {
  xl: {
    container: 'xl:grid xl:grid-cols-[1fr_auto_1fr]',
    nav: 'xl:contents',
    center: 'xl:col-start-2 xl:flex xl:flex-row xl:items-center xl:justify-center xl:gap-1',
    right: 'xl:col-start-3 xl:flex xl:flex-row xl:items-center xl:justify-end xl:gap-1',
    menuButton: 'xl:hidden',
    ghost: 'xl:min-h-11 xl:w-auto xl:whitespace-nowrap xl:px-3 xl:text-base',
    solid: 'xl:min-h-11 xl:w-auto xl:whitespace-nowrap xl:px-4 xl:text-base',
  },
  '2xl': {
    container: '2xl:grid 2xl:grid-cols-[1fr_auto_1fr]',
    nav: '2xl:contents',
    center: '2xl:col-start-2 2xl:flex 2xl:flex-row 2xl:items-center 2xl:justify-center 2xl:gap-1',
    right: '2xl:col-start-3 2xl:flex 2xl:flex-row 2xl:items-center 2xl:justify-end 2xl:gap-1',
    menuButton: '2xl:hidden',
    ghost: '2xl:min-h-11 2xl:w-auto 2xl:whitespace-nowrap 2xl:px-3 2xl:text-base',
    solid: '2xl:min-h-11 2xl:w-auto 2xl:whitespace-nowrap 2xl:px-4 2xl:text-base',
  },
}
// Grande barre : logo à gauche, liens principaux au centre, compte (profil, déconnexion) à droite.
const layout = computed(() => LAYOUTS[zoomed.value ? '2xl' : 'xl'])
const ghost = computed(
  () => `inline-flex min-h-14 w-full items-center rounded-full px-5 text-lg font-semibold text-ink hover:bg-mist ${layout.value.ghost} ${focus}`,
)
const solid = computed(
  () => `inline-flex min-h-14 w-full items-center rounded-full bg-brand px-6 text-lg font-bold text-white hover:bg-brand-dark ${layout.value.solid} ${focus}`,
)
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-mist-deep bg-paper/95 backdrop-blur" @keydown.esc="menuOpen = false">
    <div class="relative mx-auto flex max-w-7xl items-center justify-between gap-x-4 px-4 py-2 sm:px-6" :class="layout.container">
      <router-link
        :to="{ name: session.isAuthenticated ? 'events' : 'home' }"
        :aria-label="session.isAuthenticated ? 'Re-Tired Hearts, retour aux sorties' : 'Re-Tired Hearts, retour à l\'accueil'"
        :class="`inline-flex min-h-12 items-center rounded-xl ${focus}`"
      >
        <AppLogo />
      </router-link>

      <button
        type="button"
        class="inline-flex min-h-12 items-center gap-3 rounded-full border-2 border-ink px-5 text-lg font-bold text-ink hover:bg-mist"
        :class="[focus, layout.menuButton]"
        :aria-expanded="menuOpen"
        aria-controls="main-nav"
        @click="menuOpen = !menuOpen"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current" stroke-width="2.75" stroke-linecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        Menu
      </button>

      <nav
        id="main-nav"
        aria-label="Navigation principale"
        class="absolute left-0 right-0 top-full flex-col gap-1 border-b border-mist-deep bg-paper p-4 shadow-lg"
        :class="[layout.nav, menuOpen ? 'flex' : 'hidden']"
      >
        <template v-if="session.isAuthenticated">
          <div class="flex flex-col gap-1" :class="layout.center">
            <router-link :to="{ name: 'events' }" :class="ghost">Sorties</router-link>
            <router-link :to="{ name: 'my-events' }" :class="ghost">Mes sorties</router-link>
            <router-link :to="{ name: 'members' }" :class="ghost">Membres</router-link>
            <router-link :to="{ name: 'contacts' }" :class="[ghost, 'gap-2']">
              Contacts
              <UnreadBadge :count="unread.total" />
            </router-link>
          </div>
          <div class="flex flex-col gap-1" :class="layout.right">
            <router-link v-if="session.user?.isAdmin" :to="{ name: 'moderation' }" :class="ghost">Modération</router-link>
            <router-link :to="{ name: 'profile' }" :class="ghost">Mon profil</router-link>
            <button type="button" :class="solid" @click="logout">Se déconnecter</button>
          </div>
        </template>
        <div v-else class="flex flex-col gap-1" :class="layout.right">
          <router-link :to="{ name: 'login' }" :class="ghost">Connexion</router-link>
          <router-link :to="{ name: 'register' }" :class="solid">Inscription</router-link>
        </div>
      </nav>

    </div>
  </header>
</template>
