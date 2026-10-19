import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import axe from 'axe-core'
import HomeView from '../views/HomeView.vue'

describe('HomeView', () => {
  it('affiche le titre principal', () => {
    const wrapper = mount(HomeView)
    expect(wrapper.get('h1').text()).toBe('Re-Tired Hearts')
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    const wrapper = mount(HomeView, { attachTo: document.body })
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
    wrapper.unmount()
  })
})
