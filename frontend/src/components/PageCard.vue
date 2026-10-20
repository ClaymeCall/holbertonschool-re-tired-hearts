<script setup>
import PhotoImage from './PhotoImage.vue'
import { photos } from '../assets/photos'

defineProps({
  title: { type: String, required: true },
  intro: { type: String, default: '' },
  photo: { type: Object, default: () => photos.dancing },
  photoPosition: { type: String, default: 'object-[75%_50%]' },
})
</script>

<template>
  <div class="mx-auto grid max-w-6xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-12 lg:items-stretch lg:py-3">
    <aside class="relative hidden overflow-hidden rounded-3xl bg-ink lg:col-span-5 lg:block">
      <PhotoImage :photo="photo" sizes="480px" :class="photoPosition" class="absolute inset-0 h-full w-full object-cover" />
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/80 to-transparent p-8 pt-24">
        <p class="text-2xl font-bold leading-snug text-white">Il n’est jamais trop tard pour une belle rencontre.</p>
      </div>
    </aside>

    <section class="rounded-3xl border border-mist-deep bg-white p-6 sm:p-10 lg:col-span-7 lg:p-5">
      <div class="mx-auto max-w-lg">
        <h1 class="text-4xl font-extrabold leading-tight tracking-tight text-ink">{{ title }}</h1>
        <p v-if="intro" class="mt-2 text-xl text-muted">{{ intro }}</p>
        <div class="mt-5 lg:mt-4"><slot /></div>
      </div>
    </section>
  </div>
</template>
