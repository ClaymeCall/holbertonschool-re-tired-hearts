<template>
  <span class="inline-flex items-center gap-3">
    <!-- Deux arches côte à côte : deux personnes, et un cœur qui les réunit. -->
    <svg viewBox="0 0 52 48" class="h-12 w-[3.25rem] shrink-0" aria-hidden="true">
      <path class="fill-brand" d="M20 46V14a12 12 0 0 1 24 0v32z" transform="translate(6 0)" />
      <path class="fill-accent" d="M2 46V20a14 14 0 0 1 28 0v26z" />
      <path
        class="fill-paper"
        transform="translate(16 29) scale(.42) translate(-24 -24)"
        d="M24 41C10 31 4 24 4 16.500 4 11 8 7 13 7c4 0 8 2.500 11 6.500C27 9.500 31 7 35 7c5 0 9 4 9 9.500C44 24 38 31 24 41z"
      />
    </svg>
    <span class="flex flex-col items-center">
      <span class="text-2xl font-extrabold leading-none tracking-tight text-ink">Re-Tired</span>
      <span class="mt-1 pl-[0.35em] text-base font-semibold uppercase leading-none tracking-[0.35em] text-accent">Hearts</span>
    </span>
  </span>
</template>
