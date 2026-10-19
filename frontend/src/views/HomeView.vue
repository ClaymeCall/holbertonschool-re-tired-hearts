<script setup>
import { ref } from 'vue'

const title = ref('Re-Tired Hearts')
</script>

<template>
  <section class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-8 sm:px-6">
    <h1 class="text-3xl font-bold text-slate-900 sm:text-4xl">{{ title }}</h1>
    <p class="mt-4 text-lg text-slate-700">Un nouveau chapitre commence ici.</p>
  </section>
</template>
