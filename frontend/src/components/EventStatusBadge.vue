<script setup>
import { computed } from 'vue'
import { STATUS_LABELS } from '../utils/events'

const props = defineProps({ status: { type: String, required: true } })

const palette = {
  draft: 'border-line bg-white text-ink',
  published: 'border-success bg-success-soft text-success',
  cancelled: 'border-danger bg-danger-soft text-danger',
  completed: 'border-brand bg-mist text-brand',
}
const classes = computed(() => palette[props.status] ?? palette.draft)
</script>

<template>
  <span :class="classes" class="inline-block rounded-full border-2 px-4 py-1 text-base font-bold">{{ STATUS_LABELS[status] ?? status }}</span>
</template>
