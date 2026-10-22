<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PersonAvatar from '../components/PersonAvatar.vue'
import { listEvents } from '../services/events'
import * as moderation from '../services/moderation'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
const PAGE_SIZE = 50

const tabs = [
  { key: 'pending', label: 'Profils en attente' },
  { key: 'approved', label: 'Profils approuvés' },
  { key: 'blocked', label: 'Profils bloqués' },
  { key: 'events', label: 'Sorties publiées' },
  { key: 'history', label: 'Historique' },
]

const active = ref('pending')
const items = ref([])
const loading = ref(true)
const loadError = ref('')
const working = ref(false)
const feedback = ref({ type: '', text: '' })
const pending = ref(null)

const isProfileTab = computed(() => ['pending', 'approved', 'blocked'].includes(active.value))
const activeLabel = computed(() => tabs.find((tab) => tab.key === active.value).label)

async function load() {
  loading.value = true
  loadError.value = ''
  items.value = []
  try {
    if (isProfileTab.value) items.value = await moderation.listProfilesByStatus(active.value)
    else if (active.value === 'events') items.value = (await listEvents({ page: 1, limit: PAGE_SIZE })).items
    else items.value = await moderation.listActions()
  } catch {
    loadError.value = 'Impossible de charger cette liste pour le moment.'
  } finally {
    loading.value = false
  }
}

function messageFor(error) {
  if (error.status === 409) return 'Action impossible dans l’état actuel (déjà traitée, ou le statut a changé). La liste est rechargée.'
  if (error.status === 403) return 'Action refusée : vous ne pouvez pas modérer votre propre compte ni celui d’un autre modérateur.'
  if (error.status === 404) return 'Cette cible est introuvable.'
  return 'Une erreur est survenue. Réessayez plus tard.'
}

async function run(action, successText) {
  working.value = true
  feedback.value = { type: '', text: '' }
  try {
    await action()
    feedback.value = { type: 'success', text: successText }
  } catch (error) {
    feedback.value = { type: 'error', text: messageFor(error) }
  } finally {
    working.value = false
    await load()
  }
}

const approve = (profile) => run(() => moderation.approveProfile(profile.id), `Le profil de ${profile.displayName} est approuvé.`)
const unblock = (profile) => run(() => moderation.unblockProfile(profile.id), `Le profil de ${profile.displayName} est débloqué.`)

// Les actions destructrices nomment toujours leur cible et demandent une confirmation.
const confirmTexts = {
  block: {
    title: (target) => `Bloquer le profil de ${target.displayName} ?`,
    message: (target) => `Le profil de ${target.displayName} (${target.approximateLocation}) ne sera plus visible des autres membres. Vous pourrez le débloquer ensuite.`,
    label: 'Oui, bloquer le profil',
    run: (target) => run(() => moderation.blockProfile(target.id), `Le profil de ${target.displayName} est bloqué.`),
  },
  cancel: {
    title: (target) => `Annuler la sortie « ${target.title} » ?`,
    message: (target) => `La sortie « ${target.title} » (organisée par ${target.organizer.displayName ?? 'un membre'}, ${target.registeredCount} inscrit(s)) sera annulée. Cette action est définitive.`,
    label: 'Oui, annuler la sortie',
    run: (target) => run(() => moderation.cancelEventAsModerator(target.id), `La sortie « ${target.title} » est annulée.`),
  },
}

function confirm() {
  const { kind, target } = pending.value
  pending.value = null
  return confirmTexts[kind].run(target)
}

const ACTION_LABELS = {
  approve_profile: 'Profil approuvé',
  block_profile: 'Profil bloqué',
  unblock_profile: 'Profil débloqué',
  suspend_account: 'Compte suspendu',
  reactivate_account: 'Compte réactivé',
  cancel_event: 'Sortie annulée',
}
const TARGET_LABELS = { profile: 'Profil', user_account: 'Compte', event: 'Sortie' }

function onTabKey(event, index) {
  const keys = { ArrowRight: 1, ArrowLeft: -1 }
  if (!(event.key in keys)) return
  event.preventDefault()
  const next = (index + keys[event.key] + tabs.length) % tabs.length
  active.value = tabs[next].key
  document.getElementById(`tab-${active.value}`)?.focus()
}

watch(active, () => {
  feedback.value = { type: '', text: '' }
  load()
})
onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <h1 class="text-4xl font-extrabold tracking-tight text-ink">Modération</h1>
    <p class="mt-2 text-xl text-muted">Réservé aux modérateurs. Chaque action est enregistrée dans l’historique.</p>

    <div role="tablist" aria-label="Modération" class="mt-6 flex flex-wrap gap-x-2 border-b-2 border-ink">
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
        {{ tab.label }}
      </button>
    </div>

    <div class="mt-6" aria-live="polite">
      <AlertMessage v-if="feedback.text" :variant="feedback.type === 'success' ? 'success' : 'error'">{{ feedback.text }}</AlertMessage>
    </div>

    <div :id="`panel-${active}`" role="tabpanel" :aria-labelledby="`tab-${active}`" class="mt-4">
      <p v-if="loading" role="status" class="text-xl text-muted">Chargement…</p>

      <div v-else-if="loadError">
        <AlertMessage>{{ loadError }}</AlertMessage>
        <div class="mt-4"><BaseButton variant="secondary" @click="load">Réessayer</BaseButton></div>
      </div>

      <p v-else-if="items.length === 0" class="rounded-lg bg-mist p-6 text-lg text-ink">Rien à afficher dans « {{ activeLabel }} ».</p>

      <!-- Profils -->
      <ul v-else-if="isProfileTab" class="divide-y divide-mist-deep rounded-lg border border-line bg-white">
        <li v-for="profile in items" :key="profile.id" class="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <PersonAvatar :name="profile.displayName" />
            <div>
              <p class="text-xl font-bold text-ink">{{ profile.displayName }}</p>
              <p class="text-lg text-muted">{{ profile.approximateLocation }}</p>
              <p v-if="profile.bio" class="max-w-xl text-lg text-ink">{{ profile.bio }}</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <BaseButton v-if="active === 'pending'" :loading="working" @click="approve(profile)">Approuver le profil</BaseButton>
            <BaseButton v-if="active === 'blocked'" :loading="working" @click="unblock(profile)">Débloquer le profil</BaseButton>
            <BaseButton v-if="active === 'approved'" variant="danger" :disabled="working" @click="pending = { kind: 'block', target: profile }">
              Bloquer le profil
            </BaseButton>
          </div>
        </li>
      </ul>

      <!-- Sorties publiées -->
      <ul v-else-if="active === 'events'" class="divide-y divide-mist-deep rounded-lg border border-line bg-white">
        <li v-for="event in items" :key="event.id" class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xl font-bold text-ink">{{ event.title }}</p>
            <p class="text-lg text-muted">
              {{ dateFormat.format(new Date(event.startsAt)) }} · {{ event.approximateLocation }} · organisée par {{ event.organizer.displayName ?? 'un membre' }}
            </p>
          </div>
          <BaseButton variant="danger" :disabled="working" @click="pending = { kind: 'cancel', target: event }">Annuler la sortie</BaseButton>
        </li>
      </ul>

      <!-- Historique -->
      <ul v-else class="divide-y divide-mist-deep rounded-lg border border-line bg-white">
        <li v-for="entry in items" :key="entry.id" class="p-4">
          <p class="text-lg font-bold text-ink">{{ ACTION_LABELS[entry.action] ?? entry.action }}</p>
          <p class="text-lg text-muted">
            {{ TARGET_LABELS[entry.targetType] ?? entry.targetType }} n° {{ entry.targetId }} · par le modérateur n° {{ entry.moderatorId }} ·
            {{ dateFormat.format(new Date(entry.createdAt)) }}
          </p>
          <p v-if="entry.reason" class="text-lg text-ink">Motif : {{ entry.reason }}</p>
        </li>
      </ul>
    </div>

    <ConfirmDialog
      v-if="pending"
      open
      :title="confirmTexts[pending.kind].title(pending.target)"
      :message="confirmTexts[pending.kind].message(pending.target)"
      :confirm-label="confirmTexts[pending.kind].label"
      danger
      @confirm="confirm"
      @cancel="pending = null"
    />
  </section>
</template>
