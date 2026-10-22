import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import axe from 'axe-core'
import PrivacyView from '../views/PrivacyView.vue'

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/privacy', name: 'privacy', component: PrivacyView },
      { path: '/profile', name: 'profile', component: { template: '<div />' } },
    ],
  })
  router.push('/privacy')
  await router.isReady()
  return mount(PrivacyView, { global: { plugins: [router] }, attachTo: document.body })
}

describe('PrivacyView', () => {
  it('explique ce qui est visible, ce qui reste privé et le service externe', async () => {
    const wrapper = await mountView()
    const text = wrapper.text()
    expect(text).toContain('Mentions légales et confidentialité')
    expect(text).toContain('Jamais visible des autres')
    expect(text).toContain('geo.api.gouv.fr')
    expect(text).toContain('Les modérateurs ne peuvent pas lire les conversations')
    wrapper.unmount()
  })

  it('ne présente pas de violation d\'accessibilité détectable', async () => {
    const wrapper = await mountView()
    const { violations } = await axe.run(wrapper.element, { rules: { region: { enabled: false } } })
    expect(violations).toEqual([])
    wrapper.unmount()
  })
})
