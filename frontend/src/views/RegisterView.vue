<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormField from '../components/FormField.vue'
import CheckboxField from '../components/CheckboxField.vue'
import BaseButton from '../components/BaseButton.vue'
import AlertMessage from '../components/AlertMessage.vue'
import PageCard from '../components/PageCard.vue'
import { photos } from '../assets/photos'
import { useSessionStore } from '../stores/session'

const session = useSessionStore()
const router = useRouter()

const form = reactive({ email: '', password: '', confirmPassword: '' })
const errors = reactive({ email: '', password: '', confirmPassword: '' })
const formError = ref('')
const loading = ref(false)
const showPassword = ref(false)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Règles du backend (RegisterDto) : mot de passe de 8 à 72 caractères.
const PASSWORD_MIN = 8
const PASSWORD_MAX = 72

function validate() {
  errors.email = !form.email.trim()
    ? 'Saisissez votre adresse e-mail.'
    : EMAIL_PATTERN.test(form.email.trim())
      ? ''
      : 'Saisissez une adresse e-mail valide.'
  if (!form.password) errors.password = 'Choisissez un mot de passe.'
  else if (form.password.length < PASSWORD_MIN) errors.password = `Votre mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`
  else if (form.password.length > PASSWORD_MAX) errors.password = `Votre mot de passe ne peut pas dépasser ${PASSWORD_MAX} caractères.`
  else errors.password = ''
  errors.confirmPassword = !form.confirmPassword
    ? 'Confirmez votre mot de passe.'
    : form.confirmPassword === form.password
      ? ''
      : 'Les deux mots de passe ne correspondent pas.'
  return !errors.email && !errors.password && !errors.confirmPassword
}

function messageFor(status) {
  if (status === 400) return 'Certaines informations sont invalides. Vérifiez le formulaire.'
  if (status === 409) return 'Impossible de créer ce compte avec ces informations.'
  if (status === 429) return 'Trop de tentatives. Réessayez dans quelques minutes.'
  return 'Inscription impossible pour le moment. Réessayez plus tard.'
}

async function submit() {
  formError.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await session.register({ email: form.email.trim(), password: form.password })
    // L'inscription ouvre la session : on complète le profil juste après.
    router.push({ name: 'profile' })
  } catch (error) {
    formError.value = messageFor(error.status)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageCard :photo="photos.manGrayBeard" photo-position="object-top" title="Créer un compte">
      <form class="space-y-5 lg:space-y-3" novalidate @submit.prevent="submit">
        <AlertMessage v-if="formError">{{ formError }}</AlertMessage>

        <FormField id="email" v-model="form.email" label="Adresse e-mail" type="email" autocomplete="email" :error="errors.email" />
        <FormField
          id="password"
          v-model="form.password"
          label="Mot de passe"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :error="errors.password"
        />
        <FormField
          id="confirm-password"
          v-model="form.confirmPassword"
          label="Confirmation du mot de passe"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :error="errors.confirmPassword"
        />
        <CheckboxField id="show-password" v-model="showPassword" label="Afficher le mot de passe" />

        <BaseButton type="submit" block :loading="loading">{{ loading ? 'Création en cours…' : 'Créer mon compte' }}</BaseButton>
      </form>

      <p class="mt-6 text-lg text-ink lg:mt-4">
        Déjà un compte ?
        <router-link :to="{ name: 'login' }" class="rounded font-semibold text-brand underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2">Se connecter</router-link>
      </p>
  </PageCard>
</template>
