<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import EventStatusBadge from '../components/EventStatusBadge.vue'
import {
  cancelEvent,
  completeEvent,
  deleteEvent,
  getEvent,
  publishEvent,
  registerToEvent,
  withdrawFromEvent,
} from '../services/events'
import { eventPhotos } from '../assets/events'
import { availablePlaces, eventKind, formatEventDate, registrationState } from '../utils/events'

const route = useRoute()
const router = useRouter()

const event = ref(null)
const loading = ref(true)
const loadError = ref('')
const feedback = ref({ type: '', text: '' })
const working = ref(false)
const pending = ref('')

const registration = computed(() => (event.value ? registrationState(event.value) : { allowed: false, reason: '' }))
const photo = computed(() => (event.value ? eventPhotos[eventKind(event.value.mainInterest?.name)] : null))
const registered = computed(() => event.value?.myRegistration === 'registered')
const canWithdraw = computed(() => registered.value && event.value.status === 'published' && new Date(event.value.startsAt) >= new Date())
const canDelete = computed(() => event.value?.status === 'draft' && event.value.registeredCount === 0)

const confirmations = {
  cancel: {
    title: 'Annuler cette sortie ?',
    message: () => `Vous allez annuler « ${event.value.title} ». Les inscrits verront qu’elle est annulée. Cette action est définitive.`,
    label: 'Oui, annuler la sortie',
    danger: true,
  },
  complete: {
    title: 'Marquer cette sortie comme terminée ?',
    message: () => `« ${event.value.title} » sera marquée comme terminée et fermée aux inscriptions.`,
    label: 'Oui, la marquer terminée',
    danger: false,
  },
  delete: {
    title: 'Supprimer ce brouillon ?',
    message: () => `Le brouillon « ${event.value.title} » sera supprimé définitivement.`,
    label: 'Oui, supprimer',
    danger: true,
  },
}

function messageFor(error) {
  if (error.status === 409) return 'Action impossible : la sortie a peut-être changé (complète, fermée ou déjà inscrit). Rechargez la page.'
  if (error.status === 403) return 'Vous n’avez pas le droit d’effectuer cette action.'
  if (error.status === 404) return 'Cette sortie est introuvable ou n’est plus accessible.'
  return 'Une erreur est survenue. Réessayez plus tard.'
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    event.value = await getEvent(route.params.id)
  } catch (error) {
    loadError.value = messageFor(error)
  } finally {
    loading.value = false
  }
}

async function run(action, successText) {
  working.value = true
  feedback.value = { type: '', text: '' }
  try {
    const updated = await action()
    if (updated) event.value = updated
    feedback.value = { type: 'success', text: successText }
    return true
  } catch (error) {
    feedback.value = { type: 'error', text: messageFor(error) }
    return false
  } finally {
    working.value = false
  }
}

const register = () => run(() => registerToEvent(event.value.id), 'Vous êtes inscrit(e) à cette sortie.')
const withdraw = () => run(() => withdrawFromEvent(event.value.id), 'Votre inscription est annulée. Votre place est libérée.')
const publish = () => run(() => publishEvent(event.value.id), 'La sortie est publiée : les membres peuvent s’y inscrire.')

async function confirm() {
  const action = pending.value
  if (action === 'cancel') await run(() => cancelEvent(event.value.id), 'La sortie est annulée.')
  if (action === 'complete') await run(() => completeEvent(event.value.id), 'La sortie est marquée comme terminée.')
  if (action === 'delete') {
    const done = await run(() => deleteEvent(event.value.id), 'Brouillon supprimé.')
    if (done) return router.push({ name: 'events' })
  }
  pending.value = ''
}

onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <router-link :to="{ name: 'events' }" class="inline-flex min-h-12 items-center rounded-lg text-lg font-bold text-brand underline">
      ← Toutes les sorties
    </router-link>

    <p v-if="loading" role="status" class="mt-6 text-xl text-muted">Chargement de la sortie…</p>

    <div v-else-if="loadError" class="mt-6">
      <AlertMessage>{{ loadError }}</AlertMessage>
    </div>

    <article v-else class="mt-4 overflow-hidden rounded-lg border border-line bg-white p-6 sm:p-10">
      <img
        :src="photo.src"
        alt=""
        width="640"
        height="427"
        decoding="async"
        class="-mx-6 -mt-6 mb-6 h-56 w-[calc(100%+3rem)] max-w-none object-cover sm:-mx-10 sm:-mt-10 sm:w-[calc(100%+5rem)]"
        :class="photo.position"
      />
      <div class="flex flex-wrap items-center gap-3">
        <EventStatusBadge :status="event.status" />
        <p v-if="event.mainInterest?.name" class="text-lg font-bold text-accent">{{ event.mainInterest.name }}</p>
      </div>
      <h1 class="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-ink">{{ event.title }}</h1>

      <dl class="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt class="text-base font-bold text-muted">Date</dt>
          <dd class="text-xl font-semibold text-ink first-letter:uppercase">{{ formatEventDate(event.startsAt) }}</dd>
        </div>
        <div>
          <dt class="text-base font-bold text-muted">Lieu (approximatif)</dt>
          <dd class="text-xl font-semibold text-ink">{{ event.approximateLocation }}</dd>
        </div>
        <div>
          <dt class="text-base font-bold text-muted">Organisateur</dt>
          <dd class="text-xl font-semibold text-ink">{{ event.organizer.displayName }}</dd>
        </div>
        <div>
          <dt class="text-base font-bold text-muted">Places</dt>
          <dd class="text-xl font-semibold text-ink">
            {{ event.registeredCount }} inscrit(s) sur {{ event.capacity }} · {{ availablePlaces(event) }} restante(s)
          </dd>
        </div>
      </dl>

      <p class="mt-6 whitespace-pre-line text-lg text-ink">{{ event.description }}</p>

      <div class="mt-8 space-y-4" aria-live="polite">
        <AlertMessage v-if="feedback.text" :variant="feedback.type === 'success' ? 'success' : 'error'">{{ feedback.text }}</AlertMessage>
      </div>

      <div v-if="!event.isOrganizer" class="mt-6">
        <BaseButton v-if="canWithdraw" variant="secondary" :loading="working" @click="withdraw">Me désinscrire</BaseButton>
        <BaseButton v-else-if="registration.allowed && !registered" :loading="working" @click="register">Je m’inscris</BaseButton>
        <p v-else class="text-lg font-bold text-ink">{{ registration.reason }}</p>
      </div>

      <div v-else class="mt-8 border-t border-mist-deep pt-6">
        <h2 class="text-xl font-extrabold text-ink">Vous organisez cette sortie</h2>
        <div class="mt-4 flex flex-wrap gap-3">
          <BaseButton v-if="event.status === 'draft'" :loading="working" @click="publish">Publier la sortie</BaseButton>
          <BaseButton v-if="event.status === 'draft' || event.status === 'published'" :to="{ name: 'event-edit', params: { id: event.id } }" variant="secondary">
            Modifier
          </BaseButton>
          <BaseButton v-if="event.status === 'published'" variant="secondary" @click="pending = 'complete'">Marquer comme terminée</BaseButton>
          <BaseButton v-if="event.status === 'published'" variant="secondary" @click="pending = 'cancel'">Annuler la sortie</BaseButton>
          <BaseButton v-if="canDelete" variant="secondary" @click="pending = 'delete'">Supprimer le brouillon</BaseButton>
        </div>
      </div>
    </article>

    <ConfirmDialog
      v-if="event && pending"
      :open="Boolean(pending)"
      :title="confirmations[pending].title"
      :message="confirmations[pending].message()"
      :confirm-label="confirmations[pending].label"
      :danger="confirmations[pending].danger"
      :loading="working"
      @confirm="confirm"
      @cancel="pending = ''"
    />
  </section>
</template>
