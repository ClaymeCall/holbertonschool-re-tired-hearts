import { describe, it, expect } from 'vitest'
import { pageItems, totalPagesFor } from '../utils/pagination'

describe('pageItems', () => {
  it('affiche toutes les pages quand il y en a peu', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4])
  })

  it('garde la première, la dernière et les voisines de la page courante, avec des « … »', () => {
    expect(pageItems(1, 12)).toEqual([1, 2, '…', 12])
    expect(pageItems(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12])
    expect(pageItems(12, 12)).toEqual([1, '…', 11, 12])
  })

  it('n\'insère pas de « … » pour un seul numéro manquant', () => {
    expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, '…', 7])
  })
})

describe('totalPagesFor', () => {
  it('arrondit à la page supérieure et vaut au moins 1', () => {
    expect(totalPagesFor(0, 12)).toBe(1)
    expect(totalPagesFor(12, 12)).toBe(1)
    expect(totalPagesFor(13, 12)).toBe(2)
  })
})
