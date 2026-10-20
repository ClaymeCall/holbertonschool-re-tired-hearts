<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import EventCard from '../components/EventCard.vue'
import FormField from '../components/FormField.vue'
import SelectField from '../components/SelectField.vue'
import { listEvents, listInterests } from '../services/events'
import { CARD_REM, GAP_REM, columnsFor, computeWindow } from '../utils/virtualWindow'

const LIMIT = 12

const filters = reactive({ interest: '', location: '' })
const interests = ref([])
const total = ref(0)
const pages = reactive({})
const loading = ref(true)
const error = ref('')
const pageError = ref(false)
const listEl = ref(null)
const view = ref({ rows: 0, startRow: 0, endRow: -1, start: 0, end: 0 })
const columns = ref(columnsFor(window.innerWidth))

let generation = 0
const inflight = new Set()
let frame = null

const rowPx = () => (CARD_REM + GAP_REM) * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16)
const indexes = computed(() => Array.from({ length: view.value.end - view.value.start }, (_, i) => view.value.start + i))
const paddingTop = computed(() => `${view.value.startRow * rowPx()}px`)
const paddingBottom = computed(() => `${Math.max(view.value.rows - 1 - view.value.endRow, 0) * rowPx()}px`)
const atEnd = computed(() => total.value > 0 && view.value.end >= total.value)

const itemAt = (index) => pages[Math.floor(index / LIMIT) + 1]?.[index % LIMIT] ?? null

async function fetchPage(page) {
  const current = generation
  inflight.add(page)
  try {
    const result = await listEvents({ interest: filters.interest, location: filters.location, page, limit: LIMIT })
    if (current !== generation) return
    pages[page] = result.items
    total.value = result.total
  } catch {
    if (current === generation) pageError.value = true
  } finally {
    inflight.delete(page)
  }
}

// Charge à la demande les pages de 12 correspondant aux cartes à afficher.
function ensurePages(from, to) {
  if (to <= from) return
  const wanted = []
  for (let page = Math.floor(from / LIMIT) + 1; page <= Math.floor((to - 1) / LIMIT) + 1; page += 1) {
    if (!pages[page] && !inflight.has(page)) wanted.push(page)
  }
  wanted.forEach(fetchPage)
}

function updateWindow() {
  frame = null
  if (!listEl.value) return
  columns.value = columnsFor(window.innerWidth)
  view.value = computeWindow({
    top: listEl.value.getBoundingClientRect().top,
    viewportHeight: window.innerHeight,
    rowHeight: rowPx(),
    columns: columns.value,
    total: total.value,
    bufferCards: 3,
  })
  ensurePages(view.value.start, view.value.end)
}

function scheduleUpdate() {
  if (frame === null) frame = requestAnimationFrame(updateWindow)
}

async function load() {
  generation += 1
  Object.keys(pages).forEach((key) => delete pages[key])
  inflight.clear()
  total.value = 0
  view.value = { rows: 0, startRow: 0, endRow: -1, start: 0, end: 0 }
  loading.value = true
  error.value = ''
  pageError.value = false
  const current = generation
  try {
    const result = await listEvents({ interest: filters.interest, location: filters.location, page: 1, limit: LIMIT })
    if (current !== generation) return
    pages[1] = result.items
    total.value = result.total
  } catch {
    if (current === generation) error.value = 'Impossible de charger les sorties pour le moment.'
  } finally {
    if (current === generation) loading.value = false
  }
  await nextTick()
  updateWindow()
}

function retryPages() {
  pageError.value = false
  updateWindow()
}

function reset() {
  filters.interest = ''
  filters.location = ''
  load()
}

onMounted(async () => {
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate)
  try {
    interests.value = (await listInterests()).map((interest) => ({ value: interest.id, label: interest.name }))
  } catch {
    // Le filtre par centre d'intérêt reste simplement indisponible.
  }
  load()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleUpdate)
  window.removeEventListener('resize', scheduleUpdate)
  if (frame !== null) cancelAnimationFrame(frame)
})
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <h1 class="text-4xl font-extrabold tracking-tight text-ink">Les sorties</h1>
      <BaseButton :to="{ name: 'event-new' }">Proposer une sortie</BaseButton>
    </div>

    <form class="mt-6 grid gap-4 rounded-3xl border border-mist-deep bg-white p-6 md:grid-cols-[1fr_1fr_auto] md:items-end" @submit.prevent="load">
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
        <div class="mt-4"><BaseButton variant="secondary" @click="load">Réessayer</BaseButton></div>
      </div>

      <div v-else-if="total === 0" class="rounded-3xl bg-mist p-8 text-center">
        <p class="text-xl font-bold text-ink">Aucune sortie ne correspond à votre recherche.</p>
        <p class="mt-2 text-lg text-muted">Essayez un autre centre d’intérêt, une autre ville, ou proposez vous-même une sortie.</p>
      </div>

      <template v-else>
        <p class="mb-4 text-lg font-semibold text-muted" aria-live="polite">{{ total }} {{ total > 1 ? 'sorties' : 'sortie' }}</p>

        <div v-if="pageError" class="mb-4 space-y-3">
          <AlertMessage>Impossible de charger une partie des sorties.</AlertMessage>
          <BaseButton variant="secondary" @click="retryPages">Réessayer</BaseButton>
        </div>

        <!-- Seules les cartes proches de l'écran existent dans la page : la liste reste légère. -->
        <ul
          ref="listEl"
          class="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"
          :style="{ paddingTop, paddingBottom }"
        >
          <li v-for="index in indexes" :key="index" class="h-[20rem]" :aria-posinset="index + 1" :aria-setsize="total">
            <EventCard v-if="itemAt(index)" :event="itemAt(index)" />
            <div v-else class="flex h-full items-center justify-center rounded-3xl bg-mist text-lg font-semibold text-muted" role="status">
              Chargement…
            </div>
          </li>
        </ul>

        <p v-if="atEnd" class="mt-10 text-center text-lg font-bold text-ink">Vous avez tout vu : {{ total }} {{ total > 1 ? 'sorties' : 'sortie' }}.</p>
      </template>
    </div>
  </section>
</template>
