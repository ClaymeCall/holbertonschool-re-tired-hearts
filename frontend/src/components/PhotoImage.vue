<script setup>
defineProps({
  photo: { type: Object, required: true },
  sizes: { type: String, default: '100vw' },
  eager: { type: Boolean, default: false },
})
</script>

<template>
  <img
    :src="photo.src"
    :srcset="photo.srcset"
    :sizes="photo.srcset ? sizes : undefined"
    :width="photo.width"
    :height="photo.height"
    :alt="photo.alt"
    :loading="eager ? 'eager' : 'lazy'"
    :fetchpriority="eager ? 'high' : undefined"
    decoding="async"
  />
</template>
