import { describe, it, expect, beforeEach } from 'vitest'
import { applyPageMeta } from '../router/meta'

const meta = (name) => document.head.querySelector(`meta[name="${name}"]`)?.getAttribute('content')

describe('applyPageMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('définit le titre et la description de la page', () => {
    applyPageMeta({ meta: { title: 'Connexion', description: 'Connectez-vous.' } })
    expect(document.title).toBe('Connexion – Re-Tired Hearts')
    expect(meta('description')).toBe('Connectez-vous.')
    expect(meta('robots')).toBe('index, follow')
  })

  it('utilise une description par défaut', () => {
    applyPageMeta({ meta: { title: 'Accueil' } })
    expect(meta('description')).toContain('Sorties entre seniors')
  })

  it('empêche l\'indexation des pages privées', () => {
    applyPageMeta({ meta: { title: 'Mon profil', noindex: true } })
    expect(meta('robots')).toBe('noindex, nofollow')
  })

  it('met à jour la balise existante sans la dupliquer', () => {
    applyPageMeta({ meta: { title: 'A' } })
    applyPageMeta({ meta: { title: 'B', description: 'Autre' } })
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(meta('description')).toBe('Autre')
  })
})
