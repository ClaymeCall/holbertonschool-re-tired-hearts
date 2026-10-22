<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { searchPlaces } from '../services/places'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' }, // nos suggestions remplacent celles du navigateur
})
const emit = defineEmits(['update:modelValue'])

const MIN_CHARS = 2
const DELAY_MS = 300

const suggestions = ref([])
const open = ref(false)
const active = ref(-1)
const unavailable = ref(false)
let timer = null
let lastRequest = 0

const listId = `${props.id}-listbox`
const optionId = (index) => `${props.id}-option-${index}`
const fieldClasses =
  'mt-1 block min-h-14 w-full rounded-xl border-2 border-line bg-white px-4 py-2.5 text-lg text-ink placeholder:text-muted aria-[invalid=true]:border-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2'

function close() {
  clearTimeout(timer)
  lastRequest += 1 // ni debounce armé ni réponse en cours ne doivent rouvrir la liste
  open.value = false
  active.value = -1
}

// Les suggestions ne sont qu'une aide : en cas d'échec, on garde la saisie libre.
async function fetchSuggestions(text) {
  const current = (lastRequest += 1)
  try {
    const result = await searchPlaces(text)
    if (current !== lastRequest) return
    unavailable.value = !result.available
    suggestions.value = result.suggestions
    active.value = -1
    open.value = result.suggestions.length > 0
  } catch {
    if (current !== lastRequest) return
    unavailable.value = true
    suggestions.value = []
    close()
  }
}

function onInput(event) {
  const value = event.target.value
  emit('update:modelValue', value)
  clearTimeout(timer)
  lastRequest += 1 // une réponse en retard ne doit pas rouvrir la liste
  const text = value.trim()
  if (text.length < MIN_CHARS) {
    unavailable.value = false
    close()
    return
  }
  timer = setTimeout(() => fetchSuggestions(text), DELAY_MS)
}

function choose(suggestion) {
  emit('update:modelValue', suggestion.name)
  close()
}

function onKeydown(event) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    return close()
  }
  if (!open.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = (active.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = (active.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter' && active.value >= 0) {
    event.preventDefault() // choisir une suggestion n'envoie pas le formulaire
    choose(suggestions.value[active.value])
  }
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="relative">
    <label :for="id" class="block text-lg font-semibold text-ink">{{ label }}</label>
    <p v-if="hint" :id="`${id}-hint`" class="mt-1 text-base text-muted">{{ hint }}</p>
    <input
      :id="id"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listId"
      :aria-activedescendant="active >= 0 ? optionId(active) : undefined"
      :value="modelValue"
      :autocomplete="autocomplete"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="[hint ? `${id}-hint` : '', unavailable ? `${id}-status` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined"
      :class="fieldClasses"
      @input="onInput"
      @keydown="onKeydown"
      @blur="close"
    />
    <ul
      v-show="open"
      :id="listId"
      role="listbox"
      :aria-label="`Suggestions pour ${label}`"
      class="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border-2 border-line bg-white shadow-lg"
    >
      <li
        v-for="(suggestion, index) in suggestions"
        :id="optionId(index)"
        :key="`${suggestion.name}-${suggestion.postalCode}`"
        role="option"
        :aria-selected="active === index ? 'true' : 'false'"
        class="cursor-pointer px-4 py-3 text-lg text-ink"
        :class="active === index ? 'bg-mist font-bold' : 'hover:bg-mist'"
        @mousedown.prevent
        @click="choose(suggestion)"
      >
        {{ suggestion.name }}<span v-if="suggestion.postalCode" class="text-muted"> ({{ suggestion.postalCode }})</span>
      </li>
    </ul>
    <p class="sr-only" role="status" aria-live="polite">{{ open ? `${suggestions.length} suggestions disponibles` : '' }}</p>
    <p v-if="unavailable" :id="`${id}-status`" class="mt-2 text-base text-muted">Les suggestions de villes sont indisponibles : saisissez votre ville à la main.</p>
    <p v-if="error" :id="`${id}-error`" class="mt-2 text-base font-semibold text-danger">{{ error }}</p>
  </div>
</template>
