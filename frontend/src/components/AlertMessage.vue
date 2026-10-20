<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'error' },
})

const palette = {
  error: 'border-danger bg-danger-soft text-danger',
  success: 'border-success bg-success-soft text-success',
}
const classes = computed(() => palette[props.variant] ?? palette.error)
const role = computed(() => (props.variant === 'error' ? 'alert' : 'status'))
</script>

<template>
  <div :role="role" :class="classes" class="border-l-8 px-5 py-4 text-lg font-semibold">
    <slot />
  </div>
</template>
