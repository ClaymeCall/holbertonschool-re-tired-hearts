// Numéros de page à afficher : toujours la première, la dernière et les voisines de la page courante,
// avec « … » pour les trous (ex. 1 … 4 5 6 … 12).
export function pageItems(current, total, around = 1) {
  if (total <= 1) return [1]
  const pages = new Set([1, total])
  for (let page = current - around; page <= current + around; page += 1) {
    if (page >= 1 && page <= total) pages.add(page)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const items = []
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1]
    if (previous !== undefined) {
      if (page - previous === 2) items.push(previous + 1) // un seul numéro manquant : on l'affiche
      else if (page - previous > 2) items.push('…')
    }
    items.push(page)
  })
  return items
}

export const totalPagesFor = (total, pageSize) => Math.max(1, Math.ceil(total / pageSize))
