<script setup>
import { onMounted, reactive, ref } from 'vue'
import FormField from '../components/FormField.vue'
import BaseButton from '../components/BaseButton.vue'
import AlertMessage from '../components/AlertMessage.vue'
import PageCard from '../components/PageCard.vue'
import { photos } from '../assets/photos'
import { getMyProfile, updateMyProfile } from '../services/profile'

const form = reactive({ display_name: '', bio: '', approximate_location: '' })
const errors = reactive({ display_name: '' })
const loadError = ref('')
const formError = ref('')
const success = ref(false)
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    Object.assign(form, await getMyProfile())
  } catch {
    loadError.value = 'Impossible de charger votre profil pour le moment.'
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
  errors.display_name = form.display_name.trim() ? '' : 'Saisissez le nom affiché sur votre profil.'
  if (errors.display_name) return
  saving.value = true
  try {
    Object.assign(
      form,
      await updateMyProfile({
        display_name: form.display_name.trim(),
        bio: form.bio.trim(),
        approximate_location: form.approximate_location.trim(),
      }),
    )
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
      <AlertMessage v-if="success" variant="success">Votre profil a été enregistré.</AlertMessage>
      <AlertMessage v-if="formError">{{ formError }}</AlertMessage>

      <FormField id="display_name" v-model="form.display_name" label="Nom affiché" autocomplete="nickname" :error="errors.display_name" />
      <FormField id="bio" v-model="form.bio" label="Présentation (facultatif)" multiline />
      <FormField
        id="approximate_location"
        v-model="form.approximate_location"
        label="Ville ou région (facultatif)"
        hint="N’indiquez jamais votre adresse exacte."
        autocomplete="address-level2"
      />

      <BaseButton type="submit" block :loading="saving">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</BaseButton>
    </form>
  </PageCard>
</template>
