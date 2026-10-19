<script setup>
import { ref } from 'vue'

const message = ref('Re-Tired Hearts')
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-900 text-white">
    <h1 class="text-4xl font-bold">{{ message }}</h1>
  </main>
</template>
