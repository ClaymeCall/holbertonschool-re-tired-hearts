<script setup>
import AppHeader from './components/AppHeader.vue'
import TextZoomButton from './components/TextZoomButton.vue'
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
    <main id="main" class="flex flex-1 flex-col [&>*]:w-full">
      <router-view />
    </main>
    <TextZoomButton />
    <footer class="bg-ink px-4 py-3 text-paper sm:px-6">
      <p class="mx-auto max-w-6xl text-base">
        <span class="font-extrabold">Re-Tired Hearts</span> – un service Happy Retired
      </p>
    </footer>
  </div>
</template>
