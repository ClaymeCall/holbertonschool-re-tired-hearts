<script setup>
import { computed } from 'vue'
import { photos } from '../assets/photos'

// Portrait d'un membre. L'API ne fournit pas encore de photo de profil : en attendant, une photo générique
// de la banque d'images (choisie selon l'identifiant, donc toujours la même pour un même profil).
// Dès que le profil aura un `photoUrl`, c'est lui qui s'affichera.
const props = defineProps({
  name: { type: String, required: true },
  personId: { type: Number, default: 0 },
  photoUrl: { type: String, default: null },
})

const GENERIC = [photos.womanSweater, photos.manGrayBeard, photos.womanHeadscarf, photos.womanPortrait, photos.womanYoga]
const generic = computed(() => GENERIC[Math.abs(props.personId) % GENERIC.length])
</script>

<template>
  <div class="relative w-full overflow-hidden bg-mist">
    <img
      v-if="photoUrl"
      :src="photoUrl"
      :alt="`Photo de ${name}`"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover object-top"
    />
    <!-- Photo générique : purement décorative, elle ne représente pas la personne. -->
    <img
      v-else
      :src="generic.src"
      alt=""
      :width="generic.width"
      :height="generic.height"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover object-top"
    />
  </div>
</template>
