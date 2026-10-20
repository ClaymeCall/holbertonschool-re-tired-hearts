import { describe, it, expect } from 'vitest'
import { columnsFor, computeWindow } from '../utils/virtualWindow'

const base = { viewportHeight: 800, rowHeight: 300, columns: 3, total: 100, bufferCards: 3 }

describe('columnsFor', () => {
  it('suit les points de rupture', () => {
    expect([500, 700, 1200].map(columnsFor)).toEqual([1, 2, 3])
  })
})

describe('computeWindow', () => {
  it('affiche le début de la liste avec 3 cartes de marge après', () => {
    const win = computeWindow({ ...base, top: 0 })
    expect(win.startRow).toBe(0)
    expect(win.start).toBe(0)
    // 3 rangées visibles (800 / 300) + 1 rangée de marge = 4 rangées, soit 12 cartes
    expect(win.end).toBe(12)
  })

  it('garde 3 cartes avant et 3 après quand on est au milieu', () => {
    const win = computeWindow({ ...base, top: -3000 })
    expect(win.start).toBe(27) // rangée 10 visible, 1 rangée de marge avant
    expect(win.end).toBeLessThanOrEqual(48)
    expect(win.end - win.start).toBeLessThanOrEqual(18)
  })

  it('ne dépasse pas la fin de la liste', () => {
    const win = computeWindow({ ...base, top: -100000 })
    expect(win.end).toBe(100)
    expect(win.endRow).toBe(win.rows - 1)
  })

  it('gère une liste vide et une seule colonne', () => {
    expect(computeWindow({ ...base, top: 0, total: 0 }).end).toBe(0)
    const win = computeWindow({ ...base, top: 0, columns: 1 })
    expect(win.end - win.start).toBeLessThanOrEqual(6)
  })
})
