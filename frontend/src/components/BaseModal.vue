<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  labelledby: { type: String, required: true },
})
const emit = defineEmits(['close'])

const dialog = ref(null)
let opener = null

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      opener = document.activeElement
      await nextTick()
      dialog.value?.querySelector('[data-close]')?.focus()
    } else if (opener) {
      opener.focus?.()
      opener = null
    }
  },
)

// Garde le focus dans la fenêtre et la ferme avec Échap.
function onKeydown(event) {
  if (event.key === 'Escape') return emit('close')
  if (event.key !== 'Tab') return
  const focusable = [...dialog.value.querySelectorAll('a[href], button:not([disabled])')]
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
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
  <div v-if="open" class="fixed inset-0 z-30 flex items-center justify-center bg-ink/70 p-4" @click.self="emit('close')">
    <div
      ref="dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="labelledby"
      class="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-xl"
      @keydown="onKeydown"
    >
      <slot />
    </div>
  </div>
</template>
