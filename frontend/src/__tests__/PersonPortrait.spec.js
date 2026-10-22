import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PersonPortrait from '../components/PersonPortrait.vue'
import { guessGender } from '../utils/gender'
import { menPortraits, womenPortraits } from '../assets/members'

describe('guessGender', () => {
  it('reconnaît des prénoms courants, sans tenir compte des accents ni de la casse', () => {
    expect(guessGender('Colette')).toBe('feminine')
    expect(guessGender('Gérard Dupont')).toBe('masculine')
    expect(guessGender('JEAN-PAUL')).toBe('masculine')
    expect(guessGender('Françoise')).toBe('feminine')
  })

  it('ne devine jamais : prénom inconnu, mixte ou absent', () => {
    expect(guessGender('Camille')).toBeNull()
    expect(guessGender('Dominique')).toBeNull()
    expect(guessGender('Xyz')).toBeNull()
    expect(guessGender('')).toBeNull()
    expect(guessGender(undefined)).toBeNull()
  })
})

describe('PersonPortrait', () => {
  const mountWith = (props) => mount(PersonPortrait, { props })

  it('donne une photo de femme à un prénom féminin et une photo d\'homme à un prénom masculin', () => {
    expect(womenPortraits).toContain(mountWith({ name: 'Colette', personId: 3 }).get('img').attributes('src'))
    expect(menPortraits).toContain(mountWith({ name: 'Henri', personId: 3 }).get('img').attributes('src'))
  })

  it('garde la même photo pour un même profil', () => {
    const a = mountWith({ name: 'Marie', personId: 7 }).get('img').attributes('src')
    const b = mountWith({ name: 'Marie', personId: 7 }).get('img').attributes('src')
    expect(a).toBe(b)
  })

  it('n\'affiche que l\'initiale quand le prénom est inconnu ou ambigu', () => {
    const wrapper = mountWith({ name: 'Camille Durand', personId: 1 })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('C')
  })

  it('affiche la vraie photo dès que le profil en a une', () => {
    const wrapper = mountWith({ name: 'Colette', personId: 3, photoUrl: '/photos/colette.jpg' })
    expect(wrapper.get('img').attributes('src')).toBe('/photos/colette.jpg')
    expect(wrapper.get('img').attributes('alt')).toBe('Photo de Colette')
  })
})
