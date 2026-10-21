<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: String, default: 'md' },
})

const initial = computed(() => props.name.trim().charAt(0).toUpperCase())
const sizes = { md: 'h-14 w-14 text-2xl', lg: 'h-24 w-24 text-5xl' }
</script>

<template>
  <span :class="sizes[size]" class="inline-flex shrink-0 items-center justify-center rounded-full bg-mist font-extrabold text-brand" aria-hidden="true">{{ initial }}</span>
</template>
