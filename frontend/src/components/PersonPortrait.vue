<script setup>
import { computed } from 'vue'
import { defaultPortrait, portraitsByName } from '../assets/members'
import { normalizeName } from '../utils/name'

// Portrait d'un membre. L'API ne fournit pas encore de photo de profil : le profil affiche sa photo (`photoUrl`)
// dès qu'il en aura une ; en attendant, les membres de la démonstration ont un portrait attribué, et tout autre
// membre (un compte créé pendant une présentation, par exemple) reçoit automatiquement la photo par défaut.
const props = defineProps({
  name: { type: String, required: true },
  personId: { type: Number, default: 0 },
  photoUrl: { type: String, default: null },
})

const stock = computed(() => portraitsByName[normalizeName(props.name)] ?? defaultPortrait)
</script>

<template>
  <div class="relative w-full overflow-hidden bg-mist">
    <img v-if="photoUrl" :src="photoUrl" :alt="`Photo de ${name}`" loading="lazy" decoding="async" class="h-full w-full object-cover object-top" />
    <!-- Photo de banque d'images : purement décorative, elle ne représente pas la personne. -->
    <img v-else :src="stock" alt="" width="480" loading="lazy" decoding="async" class="h-full w-full object-cover object-top" />
  </div>
</template>
