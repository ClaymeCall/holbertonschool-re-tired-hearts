<script setup>
import { onMounted, reactive, ref } from 'vue'
import CityField from '../components/CityField.vue'
import FormField from '../components/FormField.vue'
import BaseButton from '../components/BaseButton.vue'
import CheckboxField from '../components/CheckboxField.vue'
import AlertMessage from '../components/AlertMessage.vue'
import PageCard from '../components/PageCard.vue'
import { photos } from '../assets/photos'
import { getMyProfile, updateMyProfile } from '../services/profile'

const form = reactive({ displayName: '', bio: '', approximateLocation: '', messagingEnabled: true })
const errors = reactive({ displayName: '', approximateLocation: '' })
const loadError = ref('')
const formError = ref('')
const success = ref(false)
const loading = ref(true)
const saving = ref(false)
const isNew = ref(false)

async function load() {
  loading.value = true
  loadError.value = ''
  isNew.value = false
  try {
    const profile = await getMyProfile()
    Object.assign(form, { ...profile, bio: profile.bio ?? '' })
  } catch (failure) {
    // 404 : le profil n'existe pas encore, ce n'est pas une erreur — on affiche un formulaire vide.
    if (failure.status === 404) isNew.value = true
    else loadError.value = 'Impossible de charger votre profil pour le moment.'
  } finally {
    loading.value = false
  }
}

function messageFor(status) {
  if (status === 400) return 'Certaines informations sont invalides. Vérifiez le formulaire.'
  if (status === 401 || status === 403) return "Vous n'avez pas accès à cette action."
  return 'Enregistrement impossible pour le moment. Réessayez plus tard.'
}

async function submit() {
  formError.value = ''
  success.value = false
  errors.displayName = form.displayName.trim() ? '' : 'Saisissez le nom affiché sur votre profil.'
  errors.approximateLocation = form.approximateLocation.trim() ? '' : 'Indiquez votre ville ou votre région.'
  if (errors.displayName || errors.approximateLocation) return
  saving.value = true
  try {
    const saved = await updateMyProfile({
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        approximateLocation: form.approximateLocation.trim(),
        messagingEnabled: form.messagingEnabled,
    })
    Object.assign(form, { ...saved, bio: saved.bio ?? '' })
    isNew.value = false
    success.value = true
  } catch (error) {
    formError.value = messageFor(error.status)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageCard :photo="photos.womanPortrait" photo-position="object-top" title="Mon profil" intro="Ce que les autres membres verront de vous.">
    <p v-if="loading" role="status" class="text-lg text-muted">Chargement de votre profil…</p>

    <div v-else-if="loadError">
      <AlertMessage>{{ loadError }}</AlertMessage>
      <div class="mt-4"><BaseButton variant="secondary" @click="load">Réessayer</BaseButton></div>
    </div>

    <form v-else class="space-y-5 lg:space-y-3" novalidate @submit.prevent="submit">
      <p v-if="isNew && !success" role="status" class="rounded-lg border-2 border-line bg-mist p-4 text-lg font-semibold text-ink">
        Vous n’avez pas encore de profil : remplissez ce formulaire pour le créer.
      </p>
      <AlertMessage v-if="success" variant="success">Votre profil a été enregistré.</AlertMessage>
      <AlertMessage v-if="formError">{{ formError }}</AlertMessage>

      <FormField id="displayName" v-model="form.displayName" label="Nom affiché" autocomplete="nickname" :error="errors.displayName" />
      <FormField id="bio" v-model="form.bio" label="Présentation (facultatif)" multiline />
      <CityField
        id="approximateLocation"
        v-model="form.approximateLocation"
        label="Ville ou région"
        hint="N’indiquez jamais votre adresse exacte."
        :error="errors.approximateLocation"
      />

      <div>
        <CheckboxField id="messagingEnabled" v-model="form.messagingEnabled" label="Autoriser les personnes rencontrées à m’écrire" />
        <p class="text-base text-muted">Si vous décochez cette case, personne ne peut vous écrire, et vous ne pouvez plus écrire non plus. Vos anciens messages restent visibles.</p>
      </div>

      <BaseButton type="submit" block :loading="saving">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</BaseButton>
    </form>
  </PageCard>
</template>
