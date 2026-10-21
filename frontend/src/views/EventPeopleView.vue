<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import PersonAvatar from '../components/PersonAvatar.vue'
import { getEvent, listParticipants } from '../services/events'

const route = useRoute()

const event = ref(null)
const people = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[event.value, people.value] = await Promise.all([getEvent(route.params.id), listParticipants(route.params.id)])
  } catch (failure) {
    error.value =
      failure.status === 403
        ? 'Seuls l’organisateur et les inscrits peuvent voir les personnes présentes.'
        : failure.status === 404
          ? 'Cette sortie est introuvable.'
          : 'Impossible de charger les personnes présentes pour le moment.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <router-link :to="{ name: 'my-events' }" class="inline-flex min-h-12 items-center rounded-lg text-lg font-bold text-brand underline">← Mes sorties</router-link>

    <p v-if="loading" role="status" class="mt-6 text-xl text-muted">Chargement des personnes présentes…</p>

    <div v-else-if="error" class="mt-6">
      <AlertMessage>{{ error }}</AlertMessage>
      <div class="mt-4"><BaseButton variant="secondary" @click="load">Réessayer</BaseButton></div>
    </div>

    <template v-else>
      <h1 class="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink">Les personnes présentes</h1>
      <p class="mt-2 text-xl text-muted">Sortie « {{ event.title }} ».</p>

      <p v-if="people.length === 0" class="mt-6 rounded-lg bg-mist p-6 text-lg text-ink">Aucune autre personne n’était présente à cette sortie.</p>

      <ul v-else class="mt-6 divide-y divide-mist-deep rounded-lg border border-line bg-white">
        <li v-for="person in people" :key="person.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <PersonAvatar :name="person.displayName" />
            <div>
              <p class="text-xl font-bold text-ink">{{ person.displayName }}</p>
              <p v-if="person.isOrganizer" class="text-lg text-muted">Organisateur</p>
            </div>
          </div>
          <BaseButton variant="secondary" :to="{ name: 'person', params: { userId: person.id }, query: { event: event.id } }">
            Voir le profil
          </BaseButton>
        </li>
      </ul>
    </template>
  </section>
</template>
