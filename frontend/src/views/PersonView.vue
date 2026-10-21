<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '../components/AlertMessage.vue'
import BaseButton from '../components/BaseButton.vue'
import ChatPanel from '../components/ChatPanel.vue'
import PersonAvatar from '../components/PersonAvatar.vue'
import { getPerson, removeContact, saveContact } from '../services/people'

const route = useRoute()

const person = ref(null)
const loading = ref(true)
const error = ref('')
const working = ref(false)
const feedback = ref({ type: '', text: '' })

const back = computed(() =>
  route.query.organizerOf
    ? { to: { name: 'event-detail', params: { id: route.query.organizerOf } }, label: '← Retour à la sortie' }
    : route.query.from === 'members'
    ? { to: { name: 'members' }, label: '← Les membres' }
    : route.query.event
    ? { to: { name: 'event-people', params: { id: route.query.event } }, label: '← Les personnes présentes' }
    : { to: { name: 'contacts' }, label: '← Mes contacts' },
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    person.value = await getPerson(route.params.userId)
  } catch (failure) {
    error.value =
      failure.status === 404
        ? 'Ce profil est introuvable.'
        : 'Impossible de charger ce profil pour le moment.'
  } finally {
    loading.value = false
  }
}

async function toggleContact() {
  working.value = true
  feedback.value = { type: '', text: '' }
  const adding = !person.value.isContact
  try {
    person.value = adding ? await saveContact(person.value.id) : await removeContact(person.value.id)
    feedback.value = {
      type: 'success',
      text: adding ? `${person.value.displayName} est dans vos contacts.` : `${person.value.displayName} est retiré(e) de vos contacts.`,
    }
  } catch {
    feedback.value = { type: 'error', text: 'Action impossible pour le moment. Réessayez plus tard.' }
  } finally {
    working.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <router-link :to="back.to" class="inline-flex min-h-12 items-center rounded-lg text-lg font-bold text-brand underline">{{ back.label }}</router-link>

    <p v-if="loading" role="status" class="mt-6 text-xl text-muted">Chargement du profil…</p>

    <div v-else-if="error" class="mt-6"><AlertMessage>{{ error }}</AlertMessage></div>

    <div v-else class="mt-4 grid gap-6 lg:grid-cols-12">
      <article class="rounded-lg border border-line bg-white p-6 sm:p-8 lg:col-span-5">
        <PersonAvatar :name="person.displayName" size="lg" />
        <h1 class="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink">{{ person.displayName }}</h1>
        <p class="mt-1 text-xl text-muted">{{ person.approximateLocation }}</p>

        <p v-if="person.bio" class="mt-5 whitespace-pre-line text-lg text-ink">{{ person.bio }}</p>

        <div v-if="person.interests.length" class="mt-5">
          <h2 class="text-lg font-bold text-muted">Centres d’intérêt</h2>
          <p class="text-lg text-ink">{{ person.interests.map((interest) => interest.name).join(', ') }}</p>
        </div>

        <div class="mt-6" aria-live="polite">
          <AlertMessage v-if="feedback.text" :variant="feedback.type === 'success' ? 'success' : 'error'">{{ feedback.text }}</AlertMessage>
        </div>

        <div class="mt-6">
          <BaseButton v-if="!person.isContact" :loading="working" block @click="toggleContact">Enregistrer le profil</BaseButton>
          <BaseButton v-else variant="secondary" :loading="working" block @click="toggleContact">Retirer des contacts</BaseButton>
        </div>
      </article>

      <div class="lg:col-span-7"><ChatPanel :person-id="person.id" :person-name="person.displayName" :accepts-messages="person.messagingEnabled !== false" /></div>
    </div>
  </section>
</template>
