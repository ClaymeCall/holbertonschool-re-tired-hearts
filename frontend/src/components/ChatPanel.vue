<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import AlertMessage from './AlertMessage.vue'
import BaseButton from './BaseButton.vue'
import { usePolling } from '../composables/usePolling'
import { getMessages, markRead, sendMessage } from '../services/conversations'
import { getMyProfile } from '../services/profile'
import { useUnreadStore } from '../stores/unread'

const props = defineProps({
  personId: { type: Number, required: true },
  personName: { type: String, required: true },
  acceptsMessages: { type: Boolean, default: true },
})

const MAX_LENGTH = 1000
const REFRESH_MS = 10000

const unread = useUnreadStore()
const messages = ref([])
const draft = ref('')
const loading = ref(true)
const loadError = ref('')
const sendError = ref('')
const sending = ref(false)
const log = ref(null)
const myMessagingEnabled = ref(true)

const length = computed(() => draft.value.trim().length)
const tooLong = computed(() => length.value > MAX_LENGTH)
// Si l'un des deux a désactivé les messages, l'envoi est impossible (l'historique reste lisible).
const blockedReason = computed(() => {
  if (!myMessagingEnabled.value) return 'own'
  if (!props.acceptsMessages) return 'other'
  return ''
})
const canSend = computed(() => !blockedReason.value && length.value > 0 && !tooLong.value && !sending.value)
const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })

async function scrollToEnd() {
  await nextTick()
  if (log.value) log.value.scrollTop = log.value.scrollHeight
}

// Les messages arrivent par rafraîchissement régulier (pas de WebSocket) : on marque comme lus ceux qui s'affichent.
async function refresh({ first = false } = {}) {
  try {
    const fresh = await getMessages(props.personId)
    const changed = fresh.length !== messages.value.length
    messages.value = fresh
    loadError.value = ''
    if (changed || first) {
      await markRead(props.personId)
      unread.refresh()
      scrollToEnd()
    }
  } catch (failure) {
    if (first) {
      loadError.value =
        failure.status === 404
          ? 'La discussion avec cette personne n’est pas disponible.'
          : 'Impossible de charger la discussion pour le moment.'
    }
  } finally {
    loading.value = false
  }
}

function messageFor(failure) {
  if (failure.status === 403) return `Message non envoyé : ${props.personName} n’accepte pas de messages pour le moment, vous avez désactivé les vôtres, ou vous n’avez pas encore participé à une même sortie.`
  if (failure.status === 400) return 'Votre message doit contenir entre 1 et 1000 caractères.'
  if (failure.status === 404) return 'Vous ne pouvez pas écrire à cette personne.'
  return 'Message non envoyé. Réessayez dans un instant.'
}

async function send() {
  if (!canSend.value) return
  sending.value = true
  sendError.value = ''
  try {
    await sendMessage(props.personId, draft.value)
    draft.value = ''
    await refresh({ first: true })
  } catch (failure) {
    sendError.value = messageFor(failure)
  } finally {
    sending.value = false
  }
}

usePolling(() => refresh(), REFRESH_MS)
onMounted(async () => {
  try {
    myMessagingEnabled.value = (await getMyProfile()).messagingEnabled !== false
  } catch {
    // Sans réponse, on laisse le serveur refuser l'envoi si besoin.
  }
  refresh({ first: true })
})
</script>

<template>
  <section class="flex h-full flex-col rounded-lg border border-line bg-white" :aria-label="`Discussion avec ${personName}`">
    <h2 class="border-b border-mist-deep px-5 py-4 text-2xl font-extrabold tracking-tight text-ink">Discussion avec {{ personName }}</h2>

    <p v-if="loading" role="status" class="p-5 text-lg text-muted">Chargement de la discussion…</p>
    <div v-else-if="loadError" class="p-5"><AlertMessage>{{ loadError }}</AlertMessage></div>

    <template v-else>
      <div
        ref="log"
        role="log"
        aria-live="polite"
        :aria-label="`Messages avec ${personName}`"
        class="max-h-[26rem] min-h-[14rem] flex-1 space-y-3 overflow-y-auto p-5"
      >
        <p v-if="messages.length === 0" class="text-lg text-muted">Aucun message pour l’instant.{{ blockedReason ? '' : ' Dites bonjour !' }}</p>
        <div v-for="item in messages" :key="item.id" class="flex" :class="item.fromMe ? 'justify-end' : 'justify-start'">
          <div class="max-w-[85%] rounded-lg px-4 py-2" :class="item.fromMe ? 'bg-brand text-white' : 'bg-mist text-ink'">
            <p class="sr-only">{{ item.fromMe ? 'Vous' : personName }}, {{ timeFormat.format(new Date(item.sentAt)) }}</p>
            <p class="whitespace-pre-line break-words text-lg">{{ item.content }}</p>
            <p class="mt-1 text-base" :class="item.fromMe ? 'text-white/90' : 'text-muted'" aria-hidden="true">
              {{ timeFormat.format(new Date(item.sentAt)) }}
            </p>
          </div>
        </div>
      </div>

      <form class="space-y-3 border-t border-mist-deep p-5" novalidate @submit.prevent="send">
        <div aria-live="polite"><AlertMessage v-if="sendError">{{ sendError }}</AlertMessage></div>
        <p v-if="blockedReason" id="chat-blocked" role="status" class="rounded-lg border-2 border-line bg-mist p-4 text-lg font-semibold text-ink">
          <template v-if="blockedReason === 'other'">Cette personne n’accepte pas les messages pour le moment.</template>
          <template v-else>
            Vous avez désactivé les messages : personne ne peut vous écrire, et vous ne pouvez pas écrire non plus.
            <router-link :to="{ name: 'profile' }" class="font-bold text-brand underline">Les réactiver dans mon profil</router-link>
          </template>
        </p>
        <label for="chat-message" class="block text-lg font-semibold" :class="blockedReason ? 'text-muted' : 'text-ink'">Votre message</label>
        <textarea
          id="chat-message"
          v-model="draft"
          rows="3"
          :aria-invalid="tooLong ? 'true' : 'false'"
          :disabled="Boolean(blockedReason)"
          :aria-describedby="blockedReason ? 'chat-blocked chat-count' : 'chat-count'"
          class="block w-full rounded-xl border-2 border-line bg-white px-4 py-2.5 text-lg text-ink aria-[invalid=true]:border-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-mist-deep disabled:bg-mist disabled:text-muted"
        ></textarea>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p id="chat-count" class="text-base" :class="tooLong ? 'font-bold text-danger' : 'text-muted'">{{ length }}/{{ MAX_LENGTH }}</p>
          <BaseButton type="submit" :loading="sending" :disabled="!canSend">{{ sending ? 'Envoi…' : 'Envoyer' }}</BaseButton>
        </div>
      </form>
    </template>
  </section>
</template>
