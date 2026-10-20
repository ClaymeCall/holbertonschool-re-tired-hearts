<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'
import AppLogo from './AppLogo.vue'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()

// Sur mobile, la navigation est un menu déroulant ; sur grand écran, elle reste affichée en ligne.
const menuOpen = ref(false)
watch(() => route.fullPath, () => (menuOpen.value = false))

async function logout() {
  await session.logout().catch(() => {})
  router.push({ name: 'home' })
}

const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2'
const ghost = `inline-flex min-h-14 w-full items-center rounded-full px-5 text-lg font-semibold text-ink hover:bg-mist md:min-h-12 md:w-auto ${focus}`
const solid = `inline-flex min-h-14 w-full items-center rounded-full bg-brand px-6 text-lg font-bold text-white hover:bg-brand-dark md:min-h-12 md:w-auto ${focus}`
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-mist-deep bg-paper/95 backdrop-blur" @keydown.esc="menuOpen = false">
    <div class="relative mx-auto flex max-w-6xl items-center justify-between gap-x-6 px-4 py-2 sm:px-6">
      <router-link
        :to="{ name: session.isAuthenticated ? 'events' : 'home' }"
        :aria-label="session.isAuthenticated ? 'Re-Tired Hearts, retour aux sorties' : 'Re-Tired Hearts, retour à l\'accueil'"
        :class="`inline-flex min-h-12 items-center rounded-xl ${focus}`"
      >
        <AppLogo />
      </router-link>

      <button
        type="button"
        class="inline-flex min-h-12 items-center gap-3 rounded-full border-2 border-ink px-5 text-lg font-bold text-ink hover:bg-mist md:hidden"
        :class="focus"
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
        class="absolute left-0 right-0 top-full flex-col gap-1 border-b border-mist-deep bg-paper p-4 shadow-lg md:static md:flex md:flex-row md:flex-wrap md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none"
        :class="menuOpen ? 'flex' : 'hidden'"
      >
        <template v-if="session.isAuthenticated">
          <router-link :to="{ name: 'events' }" :class="ghost">Parcourir les sorties</router-link>
          <router-link :to="{ name: 'my-events' }" :class="ghost">Mes sorties</router-link>
          <router-link :to="{ name: 'members' }" :class="ghost">Membres</router-link>
          <router-link :to="{ name: 'contacts' }" :class="ghost">Contacts</router-link>
          <router-link :to="{ name: 'profile' }" :class="ghost">Mon profil</router-link>
          <button type="button" :class="solid" @click="logout">Se déconnecter</button>
        </template>
        <template v-else>
          <router-link :to="{ name: 'login' }" :class="ghost">Connexion</router-link>
          <router-link :to="{ name: 'register' }" :class="solid">Inscription</router-link>
        </template>
      </nav>
    </div>
  </header>
</template>
