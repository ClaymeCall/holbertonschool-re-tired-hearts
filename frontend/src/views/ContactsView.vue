<script setup>
import { computed, onMounted, ref } from 'vue'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import PaginationBar from '../components/PaginationBar.vue'
import PersonPortrait from '../components/PersonPortrait.vue'
import UnreadBadge from '../components/UnreadBadge.vue'
import { usePagedList } from '../composables/usePagedList'
import { usePolling } from '../composables/usePolling'
import { listConversations } from '../services/conversations'
import { listContacts } from '../services/people'
import { useUnreadStore } from '../stores/unread'

const REFRESH_MS = 30000

const unreadStore = useUnreadStore()
const saved = ref([])
const conversations = ref([])
const loading = ref(true)
const error = ref('')
const pendingApproval = ref(false)

// Mes contacts = profils enregistrés + personnes qui m'ont écrit sans être enregistrées.
const rows = computed(() => {
  const byId = new Map(saved.value.map((person) => [person.id, { ...person, saved: true, unread: 0 }]))
  conversations.value.forEach(({ person, unreadCount }) => {
    const row = byId.get(person.id) ?? { ...person, saved: false, unread: 0 }
    byId.set(person.id, { ...row, unread: unreadCount })
  })
  return [...byId.values()].sort((a, b) => b.unread - a.unread || a.displayName.localeCompare(b.displayName, 'fr'))
})

const top = ref(null)
const { page, totalPages, visible, goTo } = usePagedList(rows, { anchor: top })

async function load({ quiet = false } = {}) {
  if (!quiet) loading.value = true
  error.value = ''
  pendingApproval.value = false
  try {
    ;[saved.value, conversations.value] = await Promise.all([listContacts(), listConversations()])
    unreadStore.refresh()
  } catch (failure) {
    // Un profil en attente reste refusé (403) à chaque rafraîchissement : le message ne doit pas disparaître.
    if (failure.status === 403) {
      pendingApproval.value = true
      error.value = 'Vos contacts seront disponibles quand un modérateur aura approuvé votre profil.'
    } else if (!quiet) {
      error.value = 'Impossible de charger vos contacts pour le moment.'
    }
  } finally {
    loading.value = false
  }
}

usePolling(() => load({ quiet: true }), REFRESH_MS)
onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <h1 class="text-4xl font-extrabold tracking-tight text-ink">Mes contacts</h1>
    <p class="mt-2 text-xl text-muted">Les personnes dont vous avez enregistré le profil, et celles qui vous ont écrit.</p>

    <p v-if="loading" role="status" class="mt-6 text-xl text-muted">Chargement de vos contacts…</p>

    <div v-else-if="error" class="mt-6">
      <AlertMessage>{{ error }}</AlertMessage>
      <div v-if="!pendingApproval" class="mt-4"><BaseButton variant="secondary" @click="load">Réessayer</BaseButton></div>
    </div>

    <p v-else-if="rows.length === 0" class="mt-6 rounded-lg bg-mist p-6 text-lg text-ink">
      Vous n’avez encore aucun contact. Retrouvez les personnes rencontrées dans l’historique de
      <router-link :to="{ name: 'my-events' }" class="font-bold text-brand underline">vos sorties</router-link>.
    </p>

    <ul v-else ref="top" class="mt-6 divide-y divide-mist-deep rounded-lg border border-line bg-white">
      <li v-for="person in visible" :key="person.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <PersonPortrait :name="person.displayName" :person-id="person.id" class="h-16 w-16 shrink-0 rounded-full" />
          <div>
            <p class="flex items-center gap-3 text-xl font-bold text-ink">
              {{ person.displayName }}
              <UnreadBadge :count="person.unread" />
            </p>
            <p class="text-lg text-muted">{{ person.approximateLocation }}</p>
            <p v-if="!person.saved" class="text-lg font-medium text-brand">Pas encore enregistré(e)</p>
          </div>
        </div>
        <BaseButton variant="secondary" :to="{ name: 'person', params: { userId: person.id } }">
          {{ person.unread > 0 ? 'Lire les messages' : 'Ouvrir la discussion' }}
        </BaseButton>
      </li>
    </ul>
    <PaginationBar :page="page" :total-pages="totalPages" :total="rows.length" noun="contacts" @change="goTo" />
  </section>
</template>
