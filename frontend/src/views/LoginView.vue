<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormField from '../components/FormField.vue'
import CheckboxField from '../components/CheckboxField.vue'
import BaseButton from '../components/BaseButton.vue'
import AlertMessage from '../components/AlertMessage.vue'
import PageCard from '../components/PageCard.vue'
import { useSessionStore } from '../stores/session'

const router = useRouter()
const session = useSessionStore()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const formError = ref('')
const loading = ref(false)
const showPassword = ref(false)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate() {
  errors.email = !form.email.trim()
    ? "Saisissez votre adresse e-mail."
    : EMAIL_PATTERN.test(form.email.trim())
      ? ''
      : "Saisissez une adresse e-mail valide."
  errors.password = form.password ? '' : 'Saisissez votre mot de passe.'
  return !errors.email && !errors.password
}

function messageFor(status) {
  if (status === 401) return 'Adresse e-mail ou mot de passe incorrect.'
  if (status === 429) return 'Trop de tentatives. Réessayez dans quelques minutes.'
  return 'Connexion impossible pour le moment. Réessayez plus tard.'
}

async function submit() {
  formError.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await session.login({ email: form.email.trim(), password: form.password })
    router.push({ name: 'home' })
  } catch (error) {
    formError.value = messageFor(error.status)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <PageCard title="Connexion" intro="Heureux de vous revoir.">
    <form class="space-y-5 lg:space-y-3" novalidate @submit.prevent="submit">
      <AlertMessage v-if="formError">{{ formError }}</AlertMessage>

      <FormField id="email" v-model="form.email" label="Adresse e-mail" type="email" autocomplete="email" :error="errors.email" />
      <FormField
        id="password"
        v-model="form.password"
        label="Mot de passe"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="current-password"
        :error="errors.password"
      />
      <CheckboxField id="show-password" v-model="showPassword" label="Afficher le mot de passe" />

      <BaseButton type="submit" block :loading="loading">{{ loading ? 'Connexion en cours…' : 'Se connecter' }}</BaseButton>
    </form>

    <p class="mt-6 text-lg text-ink lg:mt-4">
      Pas encore de compte ?
      <router-link :to="{ name: 'register' }" class="rounded font-semibold text-brand underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2">Créer un compte</router-link>
    </p>
  </PageCard>
</template>
