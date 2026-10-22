import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'
import { PAGE_SIZE, usePagedList } from '../composables/usePagedList'

const numbers = (count) => Array.from({ length: count }, (_, i) => i + 1)

describe('usePagedList', () => {
  it('affiche 12 éléments au maximum par page', async () => {
    const items = ref(numbers(30))
    const paged = usePagedList(items)
    expect(PAGE_SIZE).toBe(12)
    expect(paged.visible.value).toHaveLength(12)
    expect(paged.totalPages.value).toBe(3)
    await paged.goTo(3)
    expect(paged.visible.value).toEqual(numbers(30).slice(24))
  })

  it('reste dans les bornes et ramène la page à la dernière quand la liste raccourcit', async () => {
    const items = ref(numbers(30))
    const paged = usePagedList(items)
    await paged.goTo(99)
    expect(paged.page.value).toBe(3)
    await paged.goTo(-4)
    expect(paged.page.value).toBe(1)
    await paged.goTo(3)
    items.value = numbers(5)
    await nextTick()
    expect(paged.page.value).toBe(1)
    expect(paged.totalPages.value).toBe(1)
  })

  it('ramène le haut de la liste à l\'écran quand on change de page', async () => {
    const anchor = ref({ scrollIntoView: (options) => (anchor.value.called = options) })
    const paged = usePagedList(ref(numbers(30)), { anchor })
    await paged.goTo(2)
    expect(anchor.value.called).toEqual({ block: 'start' })
  })
})
