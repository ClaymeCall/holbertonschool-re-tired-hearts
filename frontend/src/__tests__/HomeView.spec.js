import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import axe from 'axe-core'
import { createRouter, createMemoryHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: HomeView },
    { path: '/register', name: 'register', component: HomeView },
  ],
})
const options = { global: { plugins: [router] } }

describe('HomeView', () => {
  it('affiche le titre principal', () => {
    const wrapper = mount(HomeView, options)
    expect(wrapper.get('h1').text()).toContain('revenez')
  })

  it('fournit un texte alternatif à chaque photo', () => {
    const wrapper = mount(HomeView, options)
    const images = wrapper.findAll('img')
    expect(images.length).toBeGreaterThan(0)
    images.forEach((img) => expect(img.attributes('alt')).toBeTruthy())
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    const wrapper = mount(HomeView, { ...options, attachTo: document.body })
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
    wrapper.unmount()
  })
})
