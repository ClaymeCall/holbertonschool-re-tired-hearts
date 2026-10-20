<script setup>
import BaseButton from '../components/BaseButton.vue'
import PhotoImage from '../components/PhotoImage.vue'
import { photos } from '../assets/photos'

const guarantees = [
  'Chaque profil est relu par un modérateur avant d’être visible.',
  'Votre adresse exacte n’est jamais affichée.',
  'Les profils ne se découvrent qu’après une sortie en commun, et vos messages restent privés.',
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:py-16">
      <div class="lg:col-span-6">
        <h1 class="text-5xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Sortez, rencontrez, <span class="text-brand">revenez.</span>
        </h1>
        <p class="mt-6 max-w-xl text-xl text-muted">
          Rejoignez une randonnée, un atelier ou une balade près de chez vous. On se retrouve en groupe, on fait connaissance, et la conversation continue ensuite sur le site.
        </p>
        <div class="mt-8 flex flex-col gap-4 sm:flex-row">
          <BaseButton :to="{ name: 'register' }">Créer un compte</BaseButton>
          <BaseButton :to="{ name: 'login' }" variant="secondary">Se connecter</BaseButton>
        </div>
      </div>

      <div class="grid h-[26rem] grid-cols-6 grid-rows-6 gap-3 sm:h-[30rem] lg:col-span-6 lg:h-[32rem]">
        <figure class="relative col-span-3 row-span-6 overflow-hidden rounded-b-3xl">
          <PhotoImage :photo="photos.womanSweater" sizes="(min-width: 1024px) 280px, 45vw" eager class="h-full w-full rounded-t-full object-cover object-top" />
        </figure>
        <figure class="relative col-span-3 row-span-3 overflow-hidden rounded-3xl">
          <PhotoImage :photo="photos.pottery" sizes="(min-width: 1024px) 280px, 45vw" class="h-full w-full object-cover" />
        </figure>
        <figure class="relative col-span-3 row-span-3 overflow-hidden rounded-3xl">
          <PhotoImage :photo="photos.womanYoga" sizes="(min-width: 1024px) 280px, 45vw" class="h-full w-full object-cover object-top" />
        </figure>
      </div>
    </section>

    <!-- Activités -->
    <section aria-labelledby="activities-title" class="border-y border-mist-deep bg-white px-4 py-12 sm:px-6">
      <h2 id="activities-title" class="mx-auto max-w-6xl text-3xl font-extrabold leading-snug tracking-tight text-ink sm:text-4xl">
        Randonnée, yoga doux, atelier poterie, danse, jardinage, balades à vélo…
        <span class="text-brand">et bien d’autres sorties proposées par les membres.</span>
      </h2>
    </section>

    <!-- Fonctionnement : une sortie en groupe -->
    <section aria-labelledby="flow-title" class="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12">
      <div class="lg:col-span-5">
        <h2 id="flow-title" class="text-4xl font-extrabold leading-tight tracking-tight text-ink">
          Une sortie en groupe, puis une vraie amitié
        </h2>
        <p class="mt-5 text-xl text-muted">
          Pas de tête-à-tête imposé : on se rencontre tous ensemble, autour d’une activité. Si le courant passe, on se retrouve ensuite par messages privés.
        </p>
      </div>

      <!-- Illustration d'interface, sans données réelles -->
      <div class="lg:col-span-7" aria-hidden="true">
        <div class="overflow-hidden rounded-3xl border border-mist-deep bg-white shadow-xl">
          <PhotoImage :photo="photos.joyfulWalk" sizes="(min-width: 1024px) 560px, 100vw" class="aspect-[16/9] w-full object-cover object-[60%_50%]" />
          <div class="flex items-center justify-between gap-4 p-5">
            <div>
              <p class="text-xl font-extrabold text-ink">Balade en forêt</p>
              <p class="text-lg text-muted">Exemple de sortie</p>
            </div>
            <span class="rounded-full bg-brand px-5 py-2 text-lg font-bold text-white">S’inscrire</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Visages -->
    <section aria-labelledby="faces-title" class="bg-mist px-4 py-16 sm:px-6">
      <div class="mx-auto max-w-6xl">
        <h2 id="faces-title" class="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-ink">Des visages, des rires, des liens</h2>
        <div class="mt-10 grid items-start gap-4 sm:grid-cols-3">
          <figure class="overflow-hidden rounded-3xl">
            <PhotoImage :photo="photos.womanHeadscarf" sizes="(min-width: 640px) 33vw, 100vw" class="aspect-[4/5] w-full object-cover" />
          </figure>
          <figure class="overflow-hidden rounded-3xl sm:mt-10">
            <PhotoImage :photo="photos.smiling" sizes="(min-width: 640px) 33vw, 100vw" class="aspect-[4/5] w-full object-cover object-center" />
          </figure>
          <figure class="overflow-hidden rounded-3xl">
            <PhotoImage :photo="photos.conversation" sizes="(min-width: 640px) 33vw, 100vw" class="aspect-[4/5] w-full object-cover object-center" />
          </figure>
        </div>
      </div>
    </section>

    <!-- Garanties -->
    <section aria-labelledby="trust-title" class="bg-ink px-4 py-16 text-white sm:px-6">
      <div class="mx-auto max-w-6xl">
        <h2 id="trust-title" class="text-4xl font-extrabold leading-tight tracking-tight">Votre tranquillité d’abord</h2>
        <ul class="mt-10 grid gap-6 md:grid-cols-3">
          <li v-for="item in guarantees" :key="item" class="border-l-4 border-white/60 bg-white/10 p-6 text-xl">{{ item }}</li>
        </ul>
      </div>
    </section>

    <!-- Appel final -->
    <section class="px-4 py-16 text-center sm:px-6">
      <h2 class="mx-auto max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-ink">Prêt pour votre prochaine sortie ?</h2>
      <div class="mt-8 flex justify-center"><BaseButton :to="{ name: 'register' }">Créer un compte</BaseButton></div>
    </section>
  </div>
</template>
