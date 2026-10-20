<script setup>
import { nextTick, ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, required: true },
  confirmLabel: { type: String, required: true },
  cancelLabel: { type: String, default: 'Retour' },
  danger: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'cancel'])

const dialog = ref(null)
let opener = null

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      opener = document.activeElement
      await nextTick()
      dialog.value?.querySelector('[data-cancel]')?.focus()
    } else if (opener) {
      opener.focus?.()
      opener = null
    }
  },
)

// Garde le focus dans la boîte de dialogue et la ferme avec Échap.
function onKeydown(event) {
  if (event.key === 'Escape') return emit('cancel')
  if (event.key !== 'Tab') return
  const buttons = [...dialog.value.querySelectorAll('button:not([disabled])')]
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-30 flex items-center justify-center bg-ink/70 p-4" @click.self="emit('cancel')">
    <div
      ref="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:p-8"
      @keydown="onKeydown"
    >
      <h2 id="confirm-title" class="text-2xl font-extrabold text-ink">{{ title }}</h2>
      <p id="confirm-message" class="mt-3 text-lg text-muted">{{ message }}</p>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <BaseButton variant="secondary" data-cancel @click="emit('cancel')">{{ cancelLabel }}</BaseButton>
        <BaseButton :variant="danger ? 'danger' : 'primary'" :loading="loading" @click="emit('confirm')">{{ confirmLabel }}</BaseButton>
      </div>
    </div>
  </div>
</template>
