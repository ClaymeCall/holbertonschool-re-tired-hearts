import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '../components/BaseButton.vue'

describe('BaseButton', () => {
  it('garde sa taille habituelle par défaut', () => {
    const classes = mount(BaseButton, { slots: { default: 'OK' } }).get('button').classes()
    expect(classes).toEqual(expect.arrayContaining(['min-h-14', 'px-8', 'text-lg']))
  })

  it('devient plus petit avec la propriété small (hauteur, marges et texte réduits)', () => {
    const wrapper = mount(BaseButton, { props: { small: true }, slots: { default: 'OK' } })
    const classes = wrapper.get('button').classes()
    expect(classes).toEqual(expect.arrayContaining(['min-h-10', 'px-5', 'text-base']))
    expect(classes).not.toContain('min-h-14')
    expect(classes).not.toContain('text-lg')
    expect(wrapper.get('button').attributes('small')).toBeUndefined() // une vraie prop, pas un attribut perdu
  })

  it('reste plus petit aussi quand c\'est un lien', () => {
    const link = mount(BaseButton, { props: { small: true, to: '/x' }, slots: { default: 'Aller' }, global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
    expect(link.get('a').classes()).toContain('min-h-10')
  })
})
