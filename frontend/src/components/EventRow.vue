<script setup>
import { computed } from 'vue'
import { eventPhotos } from '../assets/events'
import { eventDateParts, eventKind, formatEventDate } from '../utils/events'
import EventStatusBadge from './EventStatusBadge.vue'

const props = defineProps({
  event: { type: Object, required: true },
  showStatus: { type: Boolean, default: false },
  note: { type: String, default: '' },
})

const photo = computed(() => eventPhotos[eventKind(props.event.mainInterest?.name)])
const date = computed(() => eventDateParts(props.event.startsAt))
</script>

<template>
  <article class="grid overflow-hidden rounded-lg border border-line bg-white sm:grid-cols-[11rem_1fr]">
    <img
      :src="photo.src"
      alt=""
      width="640"
      height="427"
      loading="lazy"
      decoding="async"
      class="h-32 w-full object-cover sm:h-full"
      :class="photo.position"
    />
    <div class="flex flex-col gap-3 p-4">
      <div>
        <div v-if="showStatus" class="mb-2"><EventStatusBadge :status="event.status" /></div>
        <h2 class="text-xl font-extrabold leading-snug tracking-tight text-ink">
          <router-link :to="{ name: 'event-detail', params: { id: event.id } }" class="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand">
            {{ event.title }}
          </router-link>
        </h2>
        <p class="text-lg text-ink first-letter:uppercase">{{ formatEventDate(event.startsAt) }}</p>
        <p class="text-lg text-muted">{{ event.approximateLocation }} · {{ event.registeredCount }}/{{ event.capacity }} inscrit(s)</p>
        <p v-if="note" class="text-lg font-medium text-brand">{{ note }}</p>
      </div>
      <div class="flex flex-wrap gap-3"><slot name="actions" /></div>
    </div>
  </article>
</template>
