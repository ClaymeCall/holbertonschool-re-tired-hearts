import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PersonPortrait from '../components/PersonPortrait.vue'
import { defaultPortrait, portraitsByName } from '../assets/members'
import { normalizeName } from '../utils/name'

const mountWith = (props) => mount(PersonPortrait, { props })
const srcOf = (props) => mountWith(props).get('img').attributes('src')

describe('normalizeName', () => {
  it('ignore les accents, la casse et les espaces en trop', () => {
    expect(normalizeName('  Gérard   LEFEBVRE ')).toBe('gerard lefebvre')
    expect(normalizeName(undefined)).toBe('')
  })
})

describe('PersonPortrait', () => {
  it('attribue un portrait différent à chaque membre de la démonstration', () => {
    const names = Object.keys(portraitsByName)
    const sources = names.map((name, i) => srcOf({ name, personId: i + 1 }))
    expect(new Set(sources).size).toBe(names.length)
    expect(sources).not.toContain(defaultPortrait)
  })

  it('donne automatiquement la photo par défaut à un membre sans photo, par exemple un compte créé en présentation', () => {
    expect(srcOf({ name: 'Nouvelle Personne', personId: 999 })).toBe(defaultPortrait)
    expect(srcOf({ name: 'Camille Durand', personId: 1000 })).toBe(defaultPortrait)
  })

  it('reconnaît un membre de la démonstration quelle que soit la façon d\'écrire son nom', () => {
    expect(srcOf({ name: 'FRANÇOISE garnier', personId: 3 })).toBe(portraitsByName['francoise garnier'])
  })

  it('affiche la vraie photo dès que le profil en a une', () => {
    const wrapper = mountWith({ name: 'Colette Dubois', personId: 3, photoUrl: '/photos/colette.jpg' })
    expect(wrapper.get('img').attributes('src')).toBe('/photos/colette.jpg')
    expect(wrapper.get('img').attributes('alt')).toBe('Photo de Colette Dubois')
  })
})
