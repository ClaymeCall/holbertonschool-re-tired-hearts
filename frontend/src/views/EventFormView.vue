<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import CityField from '../components/CityField.vue'
import EventCard from '../components/EventCard.vue'
import FormField from '../components/FormField.vue'
import SelectField from '../components/SelectField.vue'
import { createEvent, getEvent, listInterests, updateEvent } from '../services/events'
import { toLocalInput } from '../utils/events'

const route = useRoute()
const router = useRouter()

const editing = computed(() => route.name === 'event-edit')
const form = reactive({ title: '', description: '', mainInterestId: '', approximateLocation: '', startsAt: '', capacity: '' })
const errors = reactive({ title: '', description: '', mainInterestId: '', approximateLocation: '', startsAt: '', capacity: '' })
const interests = ref([])
const registeredCount = ref(0)
const loading = ref(true)
const loadError = ref('')
const formError = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    interests.value = (await listInterests()).map((interest) => ({ value: interest.id, label: interest.name }))
    if (editing.value) {
      const event = await getEvent(route.params.id)
      if (!event.isOrganizer) {
        loadError.value = 'Seul l’organisateur peut modifier cette sortie.'
        return
      }
      registeredCount.value = event.registeredCount
      Object.assign(form, {
        title: event.title,
        description: event.description,
        mainInterestId: event.mainInterest ? String(event.mainInterest.id) : '',
        approximateLocation: event.approximateLocation,
        startsAt: toLocalInput(event.startsAt),
        capacity: String(event.capacity),
      })
    }
  } catch {
    loadError.value = 'Impossible de charger le formulaire pour le moment.'
  } finally {
    loading.value = false
  }
}

function validate() {
  errors.title = form.title.trim() ? '' : 'Donnez un titre à la sortie.'
  errors.description = form.description.trim() ? '' : 'Décrivez la sortie en quelques mots.'
  errors.mainInterestId = form.mainInterestId ? '' : 'Choisissez un centre d’intérêt.'
  errors.approximateLocation = form.approximateLocation.trim() ? '' : 'Indiquez une ville ou un secteur.'
  errors.startsAt = form.startsAt ? '' : 'Choisissez la date et l’heure.'
  const capacity = Number(form.capacity)
  if (!form.capacity || !Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = 'Indiquez un nombre de places d’au moins 1.'
  } else if (editing.value && capacity < registeredCount.value) {
    errors.capacity = `Il y a déjà ${registeredCount.value} inscrit(s) : la capacité ne peut pas être plus basse.`
  } else {
    errors.capacity = ''
  }
  return Object.values(errors).every((message) => !message)
}

function messageFor(status) {
  if (status === 400) return 'Certaines informations sont invalides. Vérifiez le formulaire.'
  if (status === 403) return 'Vous n’avez pas le droit d’effectuer cette action.'
  if (status === 409) return 'La capacité ne peut pas être inférieure au nombre d’inscrits.'
  return 'Enregistrement impossible pour le moment. Réessayez plus tard.'
}

async function submit() {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    mainInterestId: Number(form.mainInterestId),
    approximateLocation: form.approximateLocation.trim(),
    startsAt: new Date(form.startsAt).toISOString(),
    capacity: Number(form.capacity),
  }
  try {
    const event = editing.value ? await updateEvent(route.params.id, payload) : await createEvent(payload)
    router.push({ name: 'event-detail', params: { id: event.id } })
  } catch (error) {
    formError.value = messageFor(error.status)
  } finally {
    saving.value = false
  }
}

// Aperçu : la carte telle qu'elle apparaîtra dans la liste des sorties, mise à jour pendant la saisie.
const preview = computed(() => {
  const interest = interests.value.find((item) => String(item.value) === String(form.mainInterestId))
  const fallbackDate = new Date()
  fallbackDate.setDate(fallbackDate.getDate() + 7)
  fallbackDate.setHours(10, 0, 0, 0)
  const startsAt = form.startsAt ? new Date(form.startsAt) : fallbackDate
  return {
    id: 0,
    title: form.title.trim() || 'Titre de la sortie',
    approximateLocation: form.approximateLocation.trim() || 'Ville',
    startsAt: (Number.isNaN(startsAt.getTime()) ? fallbackDate : startsAt).toISOString(),
    capacity: Number(form.capacity) > 0 ? Number(form.capacity) : 10,
    registeredCount: editing.value ? registeredCount.value : 0,
    status: 'published',
    mainInterest: interest ? { id: interest.value, name: interest.label } : null,
    myRegistration: null,
  }
})

onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-5 sm:px-6">
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b-2 border-ink pb-3">
      <div>
        <router-link :to="{ name: 'events' }" class="rounded text-sm font-bold text-brand underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand">
          ← Toutes les sorties
        </router-link>
        <h1 class="mt-1 text-3xl font-extrabold tracking-tight text-ink">{{ editing ? 'Modifier la sortie' : 'Proposer une sortie' }}</h1>
      </div>
      <p class="text-sm text-muted">
        {{ editing ? 'Les inscrits voient vos changements.' : 'Enregistrée en brouillon : vous la publiez quand vous êtes prêt(e).' }}
      </p>
    </div>

    <p v-if="loading" role="status" class="mt-6 text-lg text-muted">Chargement…</p>
    <div v-else-if="loadError" class="mt-6"><AlertMessage>{{ loadError }}</AlertMessage></div>

    <form v-else class="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]" novalidate @submit.prevent="submit">
      <div class="grid content-start gap-x-5 gap-y-4 sm:grid-cols-2">
        <div v-if="formError" class="sm:col-span-2"><AlertMessage>{{ formError }}</AlertMessage></div>

        <div class="sm:col-span-2">
          <FormField id="title" v-model="form.title" label="Titre" compact :error="errors.title" />
        </div>
        <SelectField
          id="mainInterestId"
          v-model="form.mainInterestId"
          label="Centre d’intérêt principal"
          :options="interests"
          placeholder="Choisir…"
          compact
          :error="errors.mainInterestId"
        />
        <CityField
          id="approximateLocation"
          v-model="form.approximateLocation"
          label="Ville ou secteur"
          hint="Jamais d’adresse exacte."
          compact
          :error="errors.approximateLocation"
        />
        <FormField id="startsAt" v-model="form.startsAt" label="Date et heure" type="datetime-local" compact :error="errors.startsAt" />
        <FormField
          id="capacity"
          v-model="form.capacity"
          label="Nombre de places"
          type="number"
          compact
          :min="editing ? Math.max(registeredCount, 1) : 1"
          :hint="editing && registeredCount ? `${registeredCount} inscrit(s) pour le moment.` : ''"
          :error="errors.capacity"
        />
        <div class="sm:col-span-2">
          <FormField id="description" v-model="form.description" label="Description" multiline compact :rows="4" :error="errors.description" />
        </div>

        <div class="flex items-center justify-end gap-4 border-t border-mist-deep pt-4 sm:col-span-2">
          <router-link :to="{ name: editing ? 'my-events' : 'events' }" class="rounded px-2 py-1 text-base font-bold text-ink underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand">
            Annuler
          </router-link>
          <BaseButton small type="submit" :loading="saving">{{ saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le brouillon' }}</BaseButton>
        </div>
      </div>

      <aside class="hidden lg:block" aria-label="Aperçu de la sortie">
        <p class="text-sm font-bold uppercase tracking-wide text-muted">Aperçu dans la liste</p>
        <div class="pointer-events-none mt-2 h-[21rem] select-none" aria-hidden="true" inert>
          <EventCard :event="preview" />
        </div>
        <p class="mt-3 text-sm text-muted">
          {{ editing ? 'Voici l’aspect de la carte dans la liste des sorties.' : 'Tant qu’elle est en brouillon, seul vous la voyez.' }}
        </p>
      </aside>
    </form>
  </section>
</template>
