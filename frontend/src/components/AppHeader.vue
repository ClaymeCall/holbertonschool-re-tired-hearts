<script setup>
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'
import AppLogo from './AppLogo.vue'

const session = useSessionStore()
const router = useRouter()

async function logout() {
  await session.logout().catch(() => {})
  router.push({ name: 'home' })
}

const focus = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2'
const ghost = `inline-flex min-h-12 items-center rounded-full px-5 text-lg font-semibold text-ink hover:bg-mist ${focus}`
const solid = `inline-flex min-h-12 items-center rounded-full bg-brand px-6 text-lg font-bold text-white hover:bg-brand-dark ${focus}`
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-mist-deep bg-paper/95 backdrop-blur">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
      <router-link
        :to="{ name: session.isAuthenticated ? 'events' : 'home' }"
        :aria-label="session.isAuthenticated ? 'Re-Tired Hearts, retour aux sorties' : 'Re-Tired Hearts, retour à l\'accueil'"
        :class="`inline-flex min-h-12 items-center rounded-xl ${focus}`"
      >
        <AppLogo />
      </router-link>
      <nav aria-label="Navigation principale" class="flex flex-wrap items-center gap-2">
        <template v-if="session.isAuthenticated">
          <router-link :to="{ name: 'events' }" :class="ghost">Parcourir les sorties</router-link>
          <router-link :to="{ name: 'event-new' }" :class="ghost">Proposer une sortie</router-link>
          <router-link :to="{ name: 'my-events' }" :class="ghost">Mes sorties</router-link>
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
