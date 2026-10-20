<script setup>
import { useTextZoom } from '../composables/useTextZoom'

const { zoomed, toggle } = useTextZoom()
</script>

<template>
  <button
    type="button"
    :aria-pressed="zoomed"
    aria-label="Agrandir le texte"
    title="Agrandir le texte"
    class="fixed bottom-4 right-4 z-30 inline-flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-xl transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none"
    :class="zoomed ? 'border-brand bg-brand text-white hover:bg-brand-dark' : 'border-ink bg-white text-ink hover:bg-mist'"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" class="h-9 w-9 fill-none stroke-current" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" />
      <path d="m15 15 6 6M7.5 10h5M10 7.5v5" />
    </svg>
  </button>
</template>
