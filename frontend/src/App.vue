<script setup>
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import TextZoomButton from './components/TextZoomButton.vue'

const route = useRoute()
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-lg focus:font-semibold focus:text-ink focus:outline-none focus:ring-4 focus:ring-brand focus:ring-offset-2"
    >
      Aller au contenu principal
    </a>
    <AppHeader />
    <main id="main" class="flex-1">
      <router-view />
    </main>
    <!-- La page de modération est pour les modérateurs, pas pour le public senior : pas de bouton d'agrandissement. -->
    <TextZoomButton v-if="!route.meta.hideTextZoom" />
    <footer class="bg-ink px-4 py-3 text-paper sm:px-6">
      <p class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 text-base">
        <span><span class="font-extrabold">Re-Tired Hearts</span> – un service Happy Retired</span>
        <router-link :to="{ name: 'privacy' }" class="font-semibold underline">Mentions légales et confidentialité</router-link>
      </p>
    </footer>
  </div>
</template>
