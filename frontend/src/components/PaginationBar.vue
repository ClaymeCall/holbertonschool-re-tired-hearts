<script setup>
import { computed } from 'vue'
import { pageItems } from '../utils/pagination'

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  total: { type: Number, required: true },
  noun: { type: String, default: 'résultats' },
})
const emit = defineEmits(['change'])

const items = computed(() => pageItems(props.page, props.totalPages))
const go = (page) => {
  if (page >= 1 && page <= props.totalPages && page !== props.page) emit('change', page)
}

const base =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border-2 px-3 text-base font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand focus-visible:ring-offset-2'
</script>

<template>
  <nav v-if="totalPages > 1" aria-label="Pagination" class="mt-8 flex flex-col items-center gap-3">
    <p class="text-base font-semibold text-muted" aria-live="polite">Page {{ page }} sur {{ totalPages }} · {{ total }} {{ noun }}</p>
    <ul class="flex flex-wrap items-center justify-center gap-2">
      <li>
        <button type="button" :disabled="page === 1" :class="[base, 'border-ink text-ink hover:bg-mist disabled:opacity-40']" @click="go(page - 1)">
          <span aria-hidden="true">←&nbsp;</span>Précédent
        </button>
      </li>
      <li v-for="(item, index) in items" :key="`${item}-${index}`">
        <span v-if="item === '…'" class="px-1 text-lg text-muted" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          :aria-label="`Page ${item}`"
          :aria-current="item === page ? 'page' : undefined"
          :class="[base, item === page ? 'border-brand bg-brand text-white' : 'border-line text-ink hover:bg-mist']"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </li>
      <li>
        <button type="button" :disabled="page === totalPages" :class="[base, 'border-ink text-ink hover:bg-mist disabled:opacity-40']" @click="go(page + 1)">
          Suivant<span aria-hidden="true">&nbsp;→</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
