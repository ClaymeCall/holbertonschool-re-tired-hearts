<script setup>
import { onMounted, ref } from 'vue'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import PersonAvatar from '../components/PersonAvatar.vue'
import { listContacts } from '../services/people'

const contacts = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    contacts.value = await listContacts()
  } catch {
    error.value = 'Impossible de charger vos contacts pour le moment.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <h1 class="text-4xl font-extrabold tracking-tight text-ink">Mes contacts</h1>
    <p class="mt-2 text-xl text-muted">Les personnes dont vous avez enregistré le profil.</p>

    <p v-if="loading" role="status" class="mt-6 text-xl text-muted">Chargement de vos contacts…</p>

    <div v-else-if="error" class="mt-6">
      <AlertMessage>{{ error }}</AlertMessage>
      <div class="mt-4"><BaseButton variant="secondary" @click="load">Réessayer</BaseButton></div>
    </div>

    <p v-else-if="contacts.length === 0" class="mt-6 rounded-lg bg-mist p-6 text-lg text-ink">
      Vous n’avez encore aucun contact. Retrouvez les personnes rencontrées dans l’historique de
      <router-link :to="{ name: 'my-events' }" class="font-bold text-brand underline">vos sorties</router-link>.
    </p>

    <ul v-else class="mt-6 divide-y divide-mist-deep rounded-lg border border-line bg-white">
      <li v-for="person in contacts" :key="person.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <PersonAvatar :name="person.displayName" />
          <div>
            <p class="text-xl font-bold text-ink">{{ person.displayName }}</p>
            <p class="text-lg text-muted">{{ person.approximateLocation }}</p>
          </div>
        </div>
        <BaseButton variant="secondary" :to="{ name: 'person', params: { userId: person.id } }">Ouvrir le profil</BaseButton>
      </li>
    </ul>
  </section>
</template>
