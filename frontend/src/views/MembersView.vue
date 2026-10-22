<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import FormField from '../components/FormField.vue'
import BaseModal from '../components/BaseModal.vue'
import PaginationBar from '../components/PaginationBar.vue'
import PersonPortrait from '../components/PersonPortrait.vue'
import SelectField from '../components/SelectField.vue'
import { listInterests } from '../services/events'
import { searchPeople } from '../services/people'
import { totalPagesFor } from '../utils/pagination'

const PAGE_SIZE = 12

const filters = reactive({ search: '', interest: '' })
const interests = ref([])
const people = ref([])
const page = ref(1)
const selected = ref(null)
const top = ref(null)

const totalPages = computed(() => totalPagesFor(people.value.length, PAGE_SIZE))
const visible = computed(() => people.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

// Changer de page ramène en haut de la liste.
async function goTo(next) {
  page.value = next
  await nextTick()
  top.value?.scrollIntoView?.({ block: 'start' })
}
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    people.value = await searchPeople({ search: filters.search, interest: filters.interest })
    page.value = 1
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
        <p ref="top" class="mb-4 text-lg font-semibold text-muted" aria-live="polite">{{ people.length }} {{ people.length > 1 ? 'membres' : 'membre' }}</p>
        <ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="person in visible" :key="person.id">
            <article class="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white">
              <PersonPortrait :name="person.displayName" :person-id="person.id" :photo-url="person.photoUrl" class="h-44" />
              <div class="flex flex-1 flex-col p-4">
                <h2 class="text-xl font-extrabold text-ink">{{ person.displayName }}</h2>
                <p class="text-lg text-muted">{{ person.approximateLocation }}</p>
                <p v-if="person.interests.length" class="mt-1 line-clamp-2 text-lg text-ink">{{ person.interests.map((interest) => interest.name).join(', ') }}</p>
                <div class="mt-auto pt-4">
                  <BaseButton variant="secondary" block @click="selected = person">Voir le profil<span class="sr-only"> de {{ person.displayName }}</span></BaseButton>
                </div>
              </div>
            </article>
          </li>
        </ul>
        <PaginationBar :page="page" :total-pages="totalPages" :total="people.length" noun="membres" @change="goTo" />
      </template>
    </div>
    <BaseModal :open="Boolean(selected)" labelledby="member-modal-title" @close="selected = null">
      <template v-if="selected">
        <PersonPortrait :name="selected.displayName" :person-id="selected.id" :photo-url="selected.photoUrl" class="h-72" />
        <div class="p-6 sm:p-8">
          <h2 id="member-modal-title" class="text-3xl font-extrabold tracking-tight text-ink">{{ selected.displayName }}</h2>
          <p class="mt-1 text-xl text-muted">{{ selected.approximateLocation }}</p>
          <p v-if="selected.bio" class="mt-4 whitespace-pre-line text-lg text-ink">{{ selected.bio }}</p>
          <div v-if="selected.interests.length" class="mt-4">
            <h3 class="text-lg font-bold text-muted">Centres d’intérêt</h3>
            <p class="text-lg text-ink">{{ selected.interests.map((interest) => interest.name).join(', ') }}</p>
          </div>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <BaseButton variant="secondary" data-close @click="selected = null">Fermer</BaseButton>
            <BaseButton :to="{ name: 'person', params: { userId: selected.id }, query: { from: 'members' } }">Voir la page et écrire</BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>
  </section>
</template>
