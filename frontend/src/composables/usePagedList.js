import { computed, nextTick, ref, watch } from 'vue'

export const PAGE_SIZE = 12

// Pagination d'une liste déjà en mémoire : 12 éléments par page au maximum. `anchor` (une ref vers un élément)
// sert à ramener le haut de la liste à l'écran quand on change de page.
export function usePagedList(items, { pageSize = PAGE_SIZE, anchor = null } = {}) {
  const page = ref(1)
  const total = computed(() => items.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
  const visible = computed(() => items.value.slice((page.value - 1) * pageSize, page.value * pageSize))

  // Si la liste raccourcit (une action, un filtre), on ne reste pas sur une page qui n'existe plus.
  watch(totalPages, (pages) => {
    if (page.value > pages) page.value = pages
  })

  async function goTo(next) {
    page.value = Math.min(Math.max(1, next), totalPages.value)
    await nextTick()
    anchor?.value?.scrollIntoView?.({ block: 'start' })
  }

  return { page, total, totalPages, visible, goTo }
}
