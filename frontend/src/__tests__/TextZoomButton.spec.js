import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import axe from 'axe-core'
import TextZoomButton from '../components/TextZoomButton.vue'
import { initTextZoom } from '../composables/useTextZoom'

let wrapper

describe('TextZoomButton', () => {
  beforeEach(() => {
    localStorage.clear()
    initTextZoom()
    wrapper = mount(TextZoomButton, { attachTo: document.body })
  })
  afterEach(() => wrapper.unmount())

  it('est désactivé par défaut', () => {
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
    expect(document.documentElement.dataset.zoom).toBe('off')
  })

  it('agrandit le texte au clic, colore le bouton, puis revient à la taille normale', async () => {
    const button = wrapper.get('button')
    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(button.classes()).toContain('bg-brand')
    expect(document.documentElement.dataset.zoom).toBe('on')

    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(button.classes()).not.toContain('bg-brand')
    expect(document.documentElement.dataset.zoom).toBe('off')
  })

  it('mémorise le choix pour les pages suivantes', async () => {
    await wrapper.get('button').trigger('click')
    expect(localStorage.getItem('text-zoom')).toBe('on')
    initTextZoom()
    expect(document.documentElement.dataset.zoom).toBe('on')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
  })
})
