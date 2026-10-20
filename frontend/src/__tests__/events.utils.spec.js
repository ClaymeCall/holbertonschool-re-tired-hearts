import { describe, it, expect } from 'vitest'
import { availablePlaces, eventKind, placesLabel, registrationState } from '../utils/events'

const future = new Date(Date.now() + 86400000).toISOString()
const base = { status: 'published', startsAt: future, capacity: 10, registeredCount: 4, isOrganizer: false }

describe('règles d\'inscription', () => {
  it('autorise une sortie publiée, à venir et non complète', () => {
    expect(registrationState(base).allowed).toBe(true)
  })

  it.each([
    ['organisateur', { isOrganizer: true }, 'Vous organisez'],
    ['annulée', { status: 'cancelled' }, 'annulée'],
    ['terminée', { status: 'completed' }, 'terminée'],
    ['brouillon', { status: 'draft' }, 'pas encore ouverte'],
    ['passée', { startsAt: new Date(Date.now() - 86400000).toISOString() }, 'déjà eu lieu'],
    ['complète', { registeredCount: 10 }, 'complète'],
  ])('refuse une sortie %s', (_label, change, text) => {
    const state = registrationState({ ...base, ...change })
    expect(state.allowed).toBe(false)
    expect(state.reason).toContain(text)
  })

  it('calcule les places restantes', () => {
    expect(availablePlaces(base)).toBe(6)
    expect(placesLabel({ ...base, registeredCount: 9 })).toBe('1 place restante')
    expect(placesLabel({ ...base, registeredCount: 10 })).toBe('Complet')
  })
})

describe('type de sortie', () => {
  it.each([
    ['Balade à vélo', 'cycling'],
    ['Randonnée', 'hiking'],
    ['Walking and hiking', 'hiking'],
    ['Yoga', 'yoga'],
    ['Atelier poterie', 'pottery'],
    ['Danse', 'dance'],
    ['Jardinage', 'garden'],
    ['Jeux de société', 'generic'],
    ['Autre', 'generic'],
    ['Other', 'generic'],
    ['Départ en vacances', 'generic'],
    ['Arts plastiques', 'pottery'],
    ['', 'generic'],
    [undefined, 'generic'],
    [null, 'generic'],
  ])('« %s » donne %s', (name, kind) => {
    expect(eventKind(name)).toBe(kind)
  })
})
