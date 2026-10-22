<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import CityField from '../components/CityField.vue'
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

onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
    <router-link :to="{ name: 'events' }" class="inline-flex min-h-12 items-center rounded-lg text-lg font-bold text-brand underline">
      ← Toutes les sorties
    </router-link>

    <div class="mt-4 rounded-3xl border border-mist-deep bg-white p-6 sm:p-10">
      <h1 class="text-4xl font-extrabold tracking-tight text-ink">{{ editing ? 'Modifier la sortie' : 'Proposer une sortie' }}</h1>
      <p v-if="!editing" class="mt-2 text-lg text-muted">La sortie est d’abord enregistrée en brouillon : vous la publiez quand vous êtes prêt(e).</p>

      <p v-if="loading" role="status" class="mt-6 text-lg text-muted">Chargement…</p>
      <div v-else-if="loadError" class="mt-6"><AlertMessage>{{ loadError }}</AlertMessage></div>

      <form v-else class="mt-6 space-y-5" novalidate @submit.prevent="submit">
        <AlertMessage v-if="formError">{{ formError }}</AlertMessage>

        <FormField id="title" v-model="form.title" label="Titre" :error="errors.title" />
        <FormField id="description" v-model="form.description" label="Description" multiline :error="errors.description" />
        <SelectField
          id="mainInterestId"
          v-model="form.mainInterestId"
          label="Centre d’intérêt principal"
          :options="interests"
          placeholder="Choisir…"
          :error="errors.mainInterestId"
        />
        <CityField
          id="approximateLocation"
          v-model="form.approximateLocation"
          label="Ville ou secteur"
          hint="N’indiquez jamais d’adresse exacte."
          autocomplete="address-level2"
          :error="errors.approximateLocation"
        />
        <FormField id="startsAt" v-model="form.startsAt" label="Date et heure" type="datetime-local" :error="errors.startsAt" />
        <FormField
          id="capacity"
          v-model="form.capacity"
          label="Nombre de places"
          type="number"
          :min="editing ? Math.max(registeredCount, 1) : 1"
          :hint="editing && registeredCount ? `${registeredCount} inscrit(s) pour le moment.` : ''"
          :error="errors.capacity"
        />

        <BaseButton type="submit" block :loading="saving">{{ saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le brouillon' }}</BaseButton>
      </form>
    </div>
  </section>
</template>
