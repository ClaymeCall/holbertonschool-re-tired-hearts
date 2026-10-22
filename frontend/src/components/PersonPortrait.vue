<script setup>
import { computed } from 'vue'
import { menPortraits, womenPortraits } from '../assets/members'
import { guessGender } from '../utils/gender'

// Portrait d'un membre. L'API ne fournit pas encore de photo de profil : en attendant, une photo de banque
// d'images dont le genre correspond au prénom (stable pour un même profil). Prénom inconnu ou ambigu : pas de
// photo de personne, seulement l'initiale. Dès que le profil aura un `photoUrl`, c'est lui qui s'affichera.
const props = defineProps({
  name: { type: String, required: true },
  personId: { type: Number, default: 0 },
  photoUrl: { type: String, default: null },
})

const initial = computed(() => props.name.trim().charAt(0).toUpperCase())
const stock = computed(() => {
  const gender = guessGender(props.name)
  const list = gender === 'feminine' ? womenPortraits : gender === 'masculine' ? menPortraits : null
  return list ? list[Math.abs(props.personId) % list.length] : null
})
</script>

<template>
  <div class="relative w-full overflow-hidden bg-mist">
    <img v-if="photoUrl" :src="photoUrl" :alt="`Photo de ${name}`" loading="lazy" decoding="async" class="h-full w-full object-cover object-top" />
    <!-- Photo de banque d'images : purement décorative, elle ne représente pas la personne. -->
    <img v-else-if="stock" :src="stock" alt="" width="480" loading="lazy" decoding="async" class="h-full w-full object-cover object-top" />
    <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-mist to-mist-deep" aria-hidden="true">
      <span class="text-[5rem] font-extrabold leading-none text-brand">{{ initial }}</span>
    </div>
  </div>
</template>
