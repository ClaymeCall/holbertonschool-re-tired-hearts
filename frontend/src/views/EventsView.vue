<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
import EventCard from '../components/EventCard.vue'
import FormField from '../components/FormField.vue'
import PaginationBar from '../components/PaginationBar.vue'
import SelectField from '../components/SelectField.vue'
import { listEvents, listInterests } from '../services/events'
import { formatEventDate, placesLabel } from '../utils/events'
import { totalPagesFor } from '../utils/pagination'

const LIMIT = 12

const filters = reactive({ interest: '', location: '' })
const interests = ref([])
const events = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref('')
const selected = ref(null)
const top = ref(null)

const totalPages = computed(() => totalPagesFor(total.value, LIMIT))

// Pagination côté API : une page de 12 sorties à la fois (page et limit).
async function load(target = 1) {
  loading.value = true
  error.value = ''
  try {
    const result = await listEvents({ interest: filters.interest, location: filters.location, page: target, limit: LIMIT })
    events.value = result.items
    total.value = result.total
    page.value = target
  } catch {
    error.value = 'Impossible de charger les sorties pour le moment.'
  } finally {
    loading.value = false
  }
  await nextTick()
  if (target > 1) top.value?.scrollIntoView?.({ block: 'start' })
}

function reset() {
  filters.interest = ''
  filters.location = ''
  load(1)
}

onMounted(async () => {
  try {
    interests.value = (await listInterests()).map((interest) => ({ value: interest.id, label: interest.name }))
  } catch {
    // Le filtre par centre d'intérêt reste simplement indisponible.
  }
  load(1)
})
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <h1 class="text-4xl font-extrabold tracking-tight text-ink">Les sorties</h1>
      <BaseButton :to="{ name: 'event-new' }">Proposer une sortie</BaseButton>
    </div>

    <form class="mt-6 grid gap-4 rounded-3xl border border-mist-deep bg-white p-6 md:grid-cols-[1fr_1fr_auto] md:items-end" @submit.prevent="load(1)">
      <SelectField id="filter-interest" v-model="filters.interest" label="Centre d’intérêt" :options="interests" placeholder="Tous les centres d’intérêt" />
      <FormField id="filter-location" v-model="filters.location" label="Ville ou secteur" autocomplete="address-level2" />
      <div class="flex gap-3">
        <BaseButton type="submit">Filtrer</BaseButton>
        <BaseButton variant="secondary" @click="reset">Effacer</BaseButton>
      </div>
    </form>

    <div class="mt-8">
      <p v-if="loading" role="status" class="text-xl text-muted">Chargement des sorties…</p>

      <div v-else-if="error">
        <AlertMessage>{{ error }}</AlertMessage>
        <div class="mt-4"><BaseButton variant="secondary" @click="load(page)">Réessayer</BaseButton></div>
      </div>

      <div v-else-if="total === 0" class="rounded-3xl bg-mist p-8 text-center">
        <p class="text-xl font-bold text-ink">Aucune sortie ne correspond à votre recherche.</p>
        <p class="mt-2 text-lg text-muted">Essayez un autre centre d’intérêt, une autre ville, ou proposez vous-même une sortie.</p>
      </div>

      <template v-else>
        <p ref="top" class="mb-4 text-lg font-semibold text-muted" aria-live="polite">{{ total }} {{ total > 1 ? 'sorties' : 'sortie' }}</p>
        <ul class="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="event in events" :key="event.id" class="h-[20rem]">
            <EventCard :event="event" @select="selected = event" />
          </li>
        </ul>
        <PaginationBar :page="page" :total-pages="totalPages" :total="total" noun="sorties" @change="load" />
      </template>
    </div>
    <BaseModal :open="Boolean(selected)" labelledby="event-modal-title" @close="selected = null">
      <div v-if="selected" class="p-6 sm:p-8">
        <p v-if="selected.mainInterest?.name" class="text-base font-bold uppercase tracking-wide text-accent">{{ selected.mainInterest.name }}</p>
        <h2 id="event-modal-title" class="mt-1 text-3xl font-extrabold tracking-tight text-ink">{{ selected.title }}</h2>
        <p class="mt-2 text-xl font-semibold text-ink first-letter:uppercase">{{ formatEventDate(selected.startsAt) }}</p>
        <p class="text-lg text-muted">{{ selected.approximateLocation }} · organisée par {{ selected.organizer?.displayName ?? 'un membre' }}</p>
        <p class="mt-3 text-lg font-medium" :class="selected.registeredCount >= selected.capacity ? 'text-danger' : 'text-success'">{{ placesLabel(selected) }}</p>
        <p v-if="selected.description" class="mt-4 line-clamp-6 whitespace-pre-line text-lg text-ink">{{ selected.description }}</p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <BaseButton variant="secondary" data-close @click="selected = null">Fermer</BaseButton>
          <BaseButton :to="{ name: 'event-detail', params: { id: selected.id } }">Voir la sortie et s’inscrire</BaseButton>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
