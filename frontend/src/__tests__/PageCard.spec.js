import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PageCard from '../components/PageCard.vue'

describe('PageCard', () => {
  it('se centre verticalement entre l\'en-tête et le pied de page sur grand écran', () => {
    const wrapper = mount(PageCard, { props: { title: 'Connexion' }, global: { stubs: { PhotoImage: true } } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['lg:my-auto', 'mx-auto']))
    expect(wrapper.get('h1').text()).toBe('Connexion')
  })
})
