<script setup>
import { computed } from 'vue'

const props = defineProps({
  to: { type: [String, Object], default: null },
  type: { type: String, default: 'button' },
  variant: { type: String, default: 'primary' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  small: { type: Boolean, default: false },
})

const classes = computed(() => [
  props.small
    ? 'group inline-flex min-h-10 items-center justify-center gap-2 rounded-b-md rounded-t-2xl px-5 py-2 text-center text-base font-bold transition-colors motion-reduce:transition-none disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2'
    : 'group inline-flex min-h-14 items-center justify-center gap-3 rounded-b-md rounded-t-[1.75rem] px-8 py-3 text-center text-lg font-bold transition-colors motion-reduce:transition-none disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2',
  props.block ? 'w-full' : '',
  props.variant === 'secondary'
    ? 'border-2 border-ink bg-transparent text-ink hover:bg-ink hover:text-paper'
    : props.variant === 'danger'
      ? 'bg-danger text-white hover:bg-black'
      : 'bg-brand text-white hover:bg-brand-dark',
])
</script>

<template>
  <router-link v-if="to" :to="to" :class="classes"><slot /><span aria-hidden="true">→</span></router-link>
  <button v-else :type="type" :disabled="loading || disabled" :aria-busy="loading" :class="classes"><slot /></button>
</template>
