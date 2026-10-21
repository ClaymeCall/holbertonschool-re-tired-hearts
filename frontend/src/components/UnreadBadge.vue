<script setup>
defineProps({ count: { type: Number, default: 0 } })
</script>

<template>
  <span
    v-if="count > 0"
    class="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-base font-bold leading-none text-white"
  >
    <span aria-hidden="true">{{ count }}</span>
    <span class="sr-only">{{ count }} {{ count > 1 ? 'messages non lus' : 'message non lu' }}</span>
  </span>
</template>
