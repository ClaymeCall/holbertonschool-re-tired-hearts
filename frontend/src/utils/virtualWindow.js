export const CARD_REM = 20
export const GAP_REM = 1.5

// Nombre de colonnes de la grille : doit suivre les points de rupture Tailwind (sm: 640, lg: 1024).
export function columnsFor(width) {
  if (width >= 1024) return 3
  if (width >= 640) return 2
  return 1
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// Calcule quelles cartes doivent exister dans la page : celles visibles à l'écran,
// plus `bufferCards` avant et après. `top` est la position de la liste par rapport au haut de l'écran.
export function computeWindow({ top, viewportHeight, rowHeight, columns, total, bufferCards = 3 }) {
  const rows = Math.ceil(total / columns)
  if (rows === 0) return { rows: 0, startRow: 0, endRow: -1, start: 0, end: 0 }
  const bufferRows = Math.ceil(bufferCards / columns)
  const firstVisible = clamp(Math.floor(-top / rowHeight), 0, rows - 1)
  const lastVisible = clamp(Math.floor((viewportHeight - top) / rowHeight), 0, rows - 1)
  const startRow = clamp(firstVisible - bufferRows, 0, rows - 1)
  const endRow = clamp(lastVisible + bufferRows, startRow, rows - 1)
  return { rows, startRow, endRow, start: startRow * columns, end: Math.min((endRow + 1) * columns, total) }
}
