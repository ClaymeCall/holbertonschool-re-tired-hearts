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
const MAX_PAGES = 40

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
const search = ref('')

const normalize = (text) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
// Filtre côté interface : nom, ville, présentation pour un profil ; titre, ville, organisateur pour une sortie.
const filtered = computed(() => {
  const wanted = normalize(search.value.trim())
  if (!wanted) return items.value
  const fields = (item) =>
    isProfileTab.value
      ? [item.displayName, item.approximateLocation, item.bio]
      : active.value === 'events'
        ? [item.title, item.approximateLocation, item.organizer?.displayName]
        : [ACTION_LABELS[item.action], TARGET_LABELS[item.targetType], item.targetId, item.reason]
  return items.value.filter((item) => normalize(fields(item).join(' ')).includes(wanted))
})

const isProfileTab = computed(() => ['pending', 'approved', 'blocked'].includes(active.value))
const activeLabel = computed(() => tabs.find((tab) => tab.key === active.value).label)

// La recherche porte sur toutes les sorties publiées : on charge toutes les pages (50 par 50).
async function listAllEvents() {
  const all = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await listEvents({ page, limit: PAGE_SIZE })
    all.push(...result.items)
    if (all.length >= result.total || result.items.length === 0) break
  }
  return all
}

async function load() {
  loading.value = true
  loadError.value = ''
  items.value = []
  try {
    if (isProfileTab.value) items.value = await moderation.listProfilesByStatus(active.value)
    else if (active.value === 'events') items.value = await listAllEvents()
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
const reactivate = (profile) => run(() => moderation.reactivateAccount(profile.userId), `Le compte de ${profile.displayName} est réactivé.`)
const unblock = (profile) => run(() => moderation.unblockProfile(profile.id), `Le profil de ${profile.displayName} est débloqué.`)

// Les actions destructrices nomment toujours leur cible et demandent une confirmation.
const confirmTexts = {
  block: {
    title: (target) => `Bloquer le profil de ${target.displayName} ?`,
    message: (target) => `Le profil de ${target.displayName} (${target.approximateLocation}) ne sera plus visible des autres membres. Vous pourrez le débloquer ensuite.`,
    label: 'Oui, bloquer le profil',
    run: (target) => run(() => moderation.blockProfile(target.id), `Le profil de ${target.displayName} est bloqué.`),
  },
  suspend: {
    title: (target) => `Suspendre le compte de ${target.displayName} ?`,
    message: (target) => `${target.displayName} ne pourra plus se connecter ni utiliser le service tant que son compte est suspendu. Vous pourrez le réactiver ensuite.`,
    label: 'Oui, suspendre le compte',
    run: (target) => run(() => moderation.suspendAccount(target.userId), `Le compte de ${target.displayName} est suspendu.`),
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
  search.value = ''
  feedback.value = { type: '', text: '' }
  load()
})
onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-5xl px-4 py-6 text-base sm:px-6">
    <h1 class="text-2xl font-extrabold tracking-tight text-ink">Modération</h1>
    <p class="mt-1 text-base text-muted">Réservé aux modérateurs. Chaque action est enregistrée dans l’historique.</p>

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
        class="-mb-0.5 min-h-10 border-b-4 px-3 text-base font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand"
        :class="active === tab.key ? 'border-brand text-brand' : 'border-transparent text-ink hover:border-mist-deep'"
        @click="active = tab.key"
        @keydown="onTabKey($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="mt-4">
      <label for="mod-search" class="block text-sm font-semibold text-ink">Rechercher dans « {{ activeLabel }} »</label>
      <input
        id="mod-search"
        v-model="search"
        type="search"
        autocomplete="off"
        :placeholder="isProfileTab ? 'Nom, ville ou présentation' : active === 'events' ? 'Titre, ville ou organisateur' : 'Action, cible ou motif'"
        class="mt-1 block min-h-10 w-full max-w-md rounded-lg border-2 border-line bg-white px-3 py-1.5 text-base text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2"
      />
      <p v-if="search.trim() && !loading" class="mt-1 text-sm text-muted" aria-live="polite">{{ filtered.length }} résultat(s)</p>
    </div>

    <div class="mt-4" aria-live="polite">
      <AlertMessage v-if="feedback.text" :variant="feedback.type === 'success' ? 'success' : 'error'">{{ feedback.text }}</AlertMessage>
    </div>

    <div :id="`panel-${active}`" role="tabpanel" :aria-labelledby="`tab-${active}`" class="mt-4">
      <p v-if="loading" role="status" class="text-base text-muted">Chargement…</p>

      <div v-else-if="loadError">
        <AlertMessage>{{ loadError }}</AlertMessage>
        <div class="mt-4"><BaseButton small variant="secondary" @click="load">Réessayer</BaseButton></div>
      </div>

      <p v-else-if="items.length === 0" class="rounded-lg bg-mist p-4 text-base text-ink">Rien à afficher dans « {{ activeLabel }} ».</p>

      <p v-else-if="filtered.length === 0" class="rounded-lg bg-mist p-4 text-base text-ink">Aucun résultat pour « {{ search.trim() }} ».</p>

      <!-- Profils -->
      <ul v-else-if="isProfileTab" class="divide-y divide-mist-deep rounded-lg border border-line bg-white">
        <li v-for="profile in filtered" :key="profile.id" class="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <PersonAvatar :name="profile.displayName" />
            <div>
              <p class="text-base font-bold text-ink">{{ profile.displayName }}</p>
              <p class="text-sm text-muted">{{ profile.approximateLocation }}</p>
              <p v-if="profile.accountStatus === 'suspended'" class="text-sm font-bold text-danger">Compte suspendu</p>
              <p v-else-if="profile.accountStatus === 'self_deleted'" class="text-sm font-bold text-muted">Compte supprimé par son propriétaire</p>
              <p v-if="profile.bio" class="max-w-xl text-sm text-ink">{{ profile.bio }}</p>
            </div>
          </div>
          <div class="grid w-full gap-2 sm:grid-cols-2 lg:w-[22rem] lg:shrink-0">
            <BaseButton small v-if="active === 'pending'" block :loading="working" @click="approve(profile)">Approuver le profil</BaseButton>
            <BaseButton small v-if="active === 'blocked'" block :loading="working" @click="unblock(profile)">Débloquer le profil</BaseButton>
            <BaseButton small v-if="active === 'approved'" block variant="danger" :disabled="working" @click="pending = { kind: 'block', target: profile }">
              Bloquer le profil
            </BaseButton>
            <BaseButton small v-if="profile.accountStatus === 'active'" block variant="secondary" :disabled="working" @click="pending = { kind: 'suspend', target: profile }">
              Suspendre le compte
            </BaseButton>
            <BaseButton small v-else-if="profile.accountStatus === 'suspended'" block variant="secondary" :loading="working" @click="reactivate(profile)">
              Réactiver le compte
            </BaseButton>
          </div>
        </li>
      </ul>

      <!-- Sorties publiées -->
      <ul v-else-if="active === 'events'" class="divide-y divide-mist-deep rounded-lg border border-line bg-white">
        <li v-for="event in filtered" :key="event.id" class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-base font-bold text-ink">{{ event.title }}</p>
            <p class="text-sm text-muted">
              {{ dateFormat.format(new Date(event.startsAt)) }} · {{ event.approximateLocation }} · organisée par {{ event.organizer.displayName ?? 'un membre' }}
            </p>
          </div>
          <BaseButton small variant="danger" :disabled="working" @click="pending = { kind: 'cancel', target: event }">Annuler la sortie</BaseButton>
        </li>
      </ul>

      <!-- Historique -->
      <ul v-else class="divide-y divide-mist-deep rounded-lg border border-line bg-white">
        <li v-for="entry in filtered" :key="entry.id" class="p-4">
          <p class="text-base font-bold text-ink">{{ ACTION_LABELS[entry.action] ?? entry.action }}</p>
          <p class="text-sm text-muted">
            {{ TARGET_LABELS[entry.targetType] ?? entry.targetType }} n° {{ entry.targetId }} · par le modérateur n° {{ entry.moderatorId }} ·
            {{ dateFormat.format(new Date(entry.createdAt)) }}
          </p>
          <p v-if="entry.reason" class="text-sm text-ink">Motif : {{ entry.reason }}</p>
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
