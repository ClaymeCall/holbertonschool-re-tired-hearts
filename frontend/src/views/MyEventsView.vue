<script setup>
import { computed, onMounted, ref } from 'vue'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import EventRow from '../components/EventRow.vue'
import { cancelEvent, deleteEvent, listMyEvents, withdrawFromEvent } from '../services/events'

const registered = ref([])
const organized = ref([])
const loading = ref(true)
const loadError = ref('')
const feedback = ref({ type: '', text: '' })
const working = ref(false)
const active = ref('upcoming')
const pending = ref(null)

const isPast = (event) => event.status === 'completed' || new Date(event.startsAt) < new Date()
// Une sortie « faite » a eu lieu : terminée, ou publiée et déjà passée. Une sortie annulée n'a pas eu lieu.
const held = (event) => event.status === 'completed' || (event.status === 'published' && new Date(event.startsAt) < new Date())
const byDate = (a, b) => a.startsAt.localeCompare(b.startsAt)

const upcoming = computed(() => registered.value.filter((event) => !isPast(event) && event.status === 'published').sort(byDate))
// Sorties passées : celles où j'étais inscrit(e) et celles que j'ai organisées, de la plus récente à la plus ancienne.
const past = computed(() => [...registered.value.filter(held), ...organized.value.filter(held)].sort((a, b) => byDate(b, a)))
const organizedList = computed(() => organized.value.filter((event) => !held(event)).sort(byDate))

const tabs = computed(() => [
  { key: 'upcoming', label: 'Mes inscriptions', count: upcoming.value.length },
  { key: 'organized', label: 'Mes sorties organisées', count: organizedList.value.length },
  { key: 'past', label: 'Déjà participé(e)', count: past.value.length },
])

const canDelete = (event) => event.status === 'draft' && event.registeredCount === 0
const canCancel = (event) => event.status === 'published' && !isPast(event)
const canEdit = (event) => (event.status === 'draft' || event.status === 'published') && !isPast(event)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await listMyEvents()
    registered.value = result.registered
    organized.value = result.organized
  } catch {
    loadError.value = 'Impossible de charger vos sorties pour le moment.'
  } finally {
    loading.value = false
  }
}

function messageFor(error) {
  if (error.status === 409) return 'Action impossible : la sortie a peut-être changé. Rechargez la page.'
  if (error.status === 403) return 'Vous n’avez pas le droit d’effectuer cette action.'
  if (error.status === 404) return 'Cette sortie est introuvable.'
  return 'Une erreur est survenue. Réessayez plus tard.'
}

async function run(action, successText) {
  working.value = true
  feedback.value = { type: '', text: '' }
  try {
    await action()
    feedback.value = { type: 'success', text: successText }
    await load()
  } catch (error) {
    feedback.value = { type: 'error', text: messageFor(error) }
  } finally {
    working.value = false
  }
}

const withdraw = (event) => run(() => withdrawFromEvent(event.id), `Votre inscription à « ${event.title} » est annulée. Votre place est libérée.`)

async function confirm() {
  const { action, event } = pending.value
  pending.value = null
  if (action === 'delete') await run(() => deleteEvent(event.id), `Le brouillon « ${event.title} » est supprimé.`)
  if (action === 'cancel') await run(() => cancelEvent(event.id), `La sortie « ${event.title} » est annulée.`)
}

const confirmTexts = {
  delete: { title: 'Supprimer ce brouillon ?', label: 'Oui, supprimer', message: (event) => `Le brouillon « ${event.title} » sera supprimé définitivement.` },
  cancel: {
    title: 'Annuler cette sortie ?',
    label: 'Oui, annuler la sortie',
    message: (event) => `Vous allez annuler « ${event.title} ». Les inscrits verront qu’elle est annulée. Cette action est définitive.`,
  },
}

function onTabKey(event, index) {
  const keys = { ArrowRight: 1, ArrowLeft: -1 }
  if (!(event.key in keys)) return
  event.preventDefault()
  const next = (index + keys[event.key] + tabs.value.length) % tabs.value.length
  active.value = tabs.value[next].key
  document.getElementById(`tab-${active.value}`)?.focus()
}

onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <h1 class="text-4xl font-extrabold tracking-tight text-ink">Mes sorties</h1>
      <BaseButton :to="{ name: 'event-new' }">Proposer une sortie</BaseButton>
    </div>

    <p v-if="loading" role="status" class="mt-8 text-xl text-muted">Chargement de vos sorties…</p>

    <div v-else-if="loadError" class="mt-8">
      <AlertMessage>{{ loadError }}</AlertMessage>
      <div class="mt-4"><BaseButton variant="secondary" @click="load">Réessayer</BaseButton></div>
    </div>

    <template v-else>
      <div class="mt-6" aria-live="polite">
        <AlertMessage v-if="feedback.text" :variant="feedback.type === 'success' ? 'success' : 'error'">{{ feedback.text }}</AlertMessage>
      </div>

      <div role="tablist" aria-label="Mes sorties" class="mt-6 flex flex-wrap gap-x-2 border-b-2 border-ink">
        <button
          v-for="(tab, index) in tabs"
          :id="`tab-${tab.key}`"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="active === tab.key"
          :aria-controls="`panel-${tab.key}`"
          :tabindex="active === tab.key ? 0 : -1"
          class="-mb-0.5 min-h-12 border-b-4 px-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand"
          :class="active === tab.key ? 'border-brand text-brand' : 'border-transparent text-ink hover:border-mist-deep'"
          @click="active = tab.key"
          @keydown="onTabKey($event, index)"
        >
          {{ tab.label }} ({{ tab.count }})
        </button>
      </div>

      <!-- Mes inscriptions à venir -->
      <div v-if="active === 'upcoming'" id="panel-upcoming" role="tabpanel" aria-labelledby="tab-upcoming" class="mt-6 space-y-4">
        <p v-if="upcoming.length === 0" class="rounded-lg bg-mist p-6 text-lg text-ink">
          Vous n’êtes inscrit(e) à aucune sortie à venir.
          <router-link :to="{ name: 'events' }" class="font-bold text-brand underline">Voir les sorties</router-link>
        </p>
        <EventRow v-for="event in upcoming" :key="event.id" :event="event">
          <template #actions>
            <BaseButton variant="secondary" :loading="working" @click="withdraw(event)">Me désinscrire</BaseButton>
          </template>
        </EventRow>
      </div>

      <!-- Sorties que j'organise -->
      <div v-else-if="active === 'organized'" id="panel-organized" role="tabpanel" aria-labelledby="tab-organized" class="mt-6 space-y-4">
        <p v-if="organizedList.length === 0" class="rounded-lg bg-mist p-6 text-lg text-ink">
          Vous n’organisez aucune sortie.
          <router-link :to="{ name: 'event-new' }" class="font-bold text-brand underline">Proposer une sortie</router-link>
        </p>
        <EventRow v-for="event in organizedList" :key="event.id" :event="event" show-status>
          <template #actions>
            <BaseButton v-if="canEdit(event)" variant="secondary" :to="{ name: 'event-edit', params: { id: event.id } }">Modifier</BaseButton>
            <BaseButton v-if="canDelete(event)" variant="secondary" @click="pending = { action: 'delete', event }">Supprimer</BaseButton>
            <BaseButton v-if="canCancel(event)" variant="secondary" @click="pending = { action: 'cancel', event }">Annuler la sortie</BaseButton>
          </template>
        </EventRow>
      </div>

      <!-- Sorties auxquelles j'ai participé -->
      <div v-else id="panel-past" role="tabpanel" aria-labelledby="tab-past" class="mt-6 space-y-4">
        <p v-if="past.length === 0" class="rounded-lg bg-mist p-6 text-lg text-ink">Vous n’avez encore participé à aucune sortie.</p>
        <EventRow v-for="event in past" :key="event.id" :event="event" :note="event.isOrganizer ? 'Vous organisiez cette sortie' : ''">
          <template #actions>
            <BaseButton :to="{ name: 'event-people', params: { id: event.id } }">Voir les personnes présentes</BaseButton>
          </template>
        </EventRow>
      </div>
    </template>

    <ConfirmDialog
      v-if="pending"
      open
      :title="confirmTexts[pending.action].title"
      :message="confirmTexts[pending.action].message(pending.event)"
      :confirm-label="confirmTexts[pending.action].label"
      danger
      @confirm="confirm"
      @cancel="pending = null"
    />
  </section>
</template>
