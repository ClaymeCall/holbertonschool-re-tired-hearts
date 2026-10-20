<script setup>
import { computed } from 'vue'
import { eventPhotos } from '../assets/events'
import { eventDateParts, eventKind, formatEventDate, placesLabel } from '../utils/events'

const props = defineProps({ event: { type: Object, required: true } })

const date = computed(() => eventDateParts(props.event.startsAt))
const photo = computed(() => eventPhotos[eventKind(props.event.mainInterest?.name)])
const full = computed(() => props.event.registeredCount >= props.event.capacity)
</script>

<template>
  <article
    class="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white transition-shadow focus-within:ring-4 focus-within:ring-brand hover:shadow-xl motion-reduce:transition-none"
  >
    <!-- Photo décorative selon le type de sortie ; la date complète est dans le texte pour les lecteurs d'écran. -->
    <div class="relative h-[9.5rem] shrink-0 overflow-hidden bg-mist" aria-hidden="true">
      <img
        :src="photo.src"
        alt=""
        width="640"
        height="427"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        :class="photo.position"
      />
      <div class="absolute bottom-0 left-0 flex items-baseline gap-2 bg-white px-3 py-1">
        <span class="text-2xl font-extrabold leading-none text-ink">{{ date.day }}</span>
        <span class="text-base font-bold uppercase leading-none text-accent">{{ date.month }}</span>
      </div>
    </div>

    <div class="flex flex-1 flex-col px-4 pb-3 pt-3">
      <p v-if="event.mainInterest?.name" class="text-base font-bold uppercase tracking-wide text-accent">{{ event.mainInterest.name }}</p>
      <h2 class="mt-0.5 line-clamp-2 text-xl font-extrabold leading-snug tracking-tight text-ink">
        <router-link
          :to="{ name: 'event-detail', params: { id: event.id } }"
          class="after:absolute after:inset-0 focus-visible:outline-none"
        >
          {{ event.title }}
        </router-link>
      </h2>
      <p class="sr-only">{{ formatEventDate(event.startsAt) }}</p>
      <p class="mt-1 text-lg font-semibold text-ink first-letter:uppercase" aria-hidden="true">{{ date.weekday }} · {{ date.time }}</p>
      <p class="text-lg text-muted">{{ event.approximateLocation }}</p>

      <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2">
        <span class="text-lg font-medium" :class="full ? 'text-danger' : 'text-success'">{{ placesLabel(event) }}</span>
        <span v-if="event.myRegistration === 'registered'" class="text-lg font-medium text-brand">✓ Inscrit(e)</span>
      </div>
    </div>
  </article>
</template>
