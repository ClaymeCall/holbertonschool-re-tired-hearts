<script setup>
import { onMounted, reactive, ref } from 'vue'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import FormField from '../components/FormField.vue'
import PersonAvatar from '../components/PersonAvatar.vue'
import SelectField from '../components/SelectField.vue'
import { listInterests } from '../services/events'
import { searchPeople } from '../services/people'

const filters = reactive({ search: '', interest: '' })
const interests = ref([])
const people = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    people.value = await searchPeople({ search: filters.search, interest: filters.interest })
  } catch {
    error.value = 'Impossible de charger les membres pour le moment.'
  } finally {
    loading.value = false
  }
}

function reset() {
  filters.search = ''
  filters.interest = ''
  load()
}

onMounted(async () => {
  try {
    interests.value = (await listInterests()).map((interest) => ({ value: interest.id, label: interest.name }))
  } catch {
    // Le filtre par centre d'intérêt reste simplement indisponible.
  }
  load()
})
</script>

<template>
  <section class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <h1 class="text-4xl font-extrabold tracking-tight text-ink">Les membres</h1>
    <p class="mt-2 text-xl text-muted">Trouvez des personnes par leur prénom, leur ville ou leurs centres d’intérêt.</p>

    <form class="mt-6 grid gap-4 rounded-lg border border-line bg-white p-6 md:grid-cols-[1fr_1fr_auto] md:items-end" novalidate @submit.prevent="load">
      <FormField id="search" v-model="filters.search" label="Prénom ou ville" autocomplete="off" />
      <SelectField id="member-interest" v-model="filters.interest" label="Centre d’intérêt" :options="interests" placeholder="Tous les centres d’intérêt" />
      <div class="flex gap-3">
        <BaseButton type="submit">Rechercher</BaseButton>
        <BaseButton variant="secondary" @click="reset">Effacer</BaseButton>
      </div>
    </form>

    <div class="mt-8">
      <p v-if="loading" role="status" class="text-xl text-muted">Recherche en cours…</p>

      <div v-else-if="error">
        <AlertMessage>{{ error }}</AlertMessage>
        <div class="mt-4"><BaseButton variant="secondary" @click="load">Réessayer</BaseButton></div>
      </div>

      <p v-else-if="people.length === 0" class="rounded-lg bg-mist p-6 text-lg text-ink">Aucun membre ne correspond à votre recherche.</p>

      <template v-else>
        <p class="mb-4 text-lg font-semibold text-muted" aria-live="polite">{{ people.length }} {{ people.length > 1 ? 'membres' : 'membre' }}</p>
        <ul class="divide-y divide-mist-deep rounded-lg border border-line bg-white">
          <li v-for="person in people" :key="person.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-4">
              <PersonAvatar :name="person.displayName" />
              <div>
                <p class="text-xl font-bold text-ink">{{ person.displayName }}</p>
                <p class="text-lg text-muted">{{ person.approximateLocation }}</p>
                <p class="text-lg text-ink">{{ person.interests.map((interest) => interest.name).join(', ') }}</p>
              </div>
            </div>
            <BaseButton variant="secondary" :to="{ name: 'person', params: { userId: person.id }, query: { from: 'members' } }">Voir le profil</BaseButton>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>
