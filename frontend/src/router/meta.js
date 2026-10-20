const SITE_NAME = 'Re-Tired Hearts'
const DEFAULT_DESCRIPTION = 'Sorties entre seniors : randonnées, ateliers et balades près de chez vous, pour se rencontrer en groupe et se retrouver.'

function setMeta(name, content) {
  let tag = document.head.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

// Titre, description et indexation propres à chaque page.
export function applyPageMeta(route) {
  document.title = `${route.meta.title} – ${SITE_NAME}`
  setMeta('description', route.meta.description ?? DEFAULT_DESCRIPTION)
  setMeta('robots', route.meta.noindex ? 'noindex, nofollow' : 'index, follow')
}
