// Nom affiché sans accents, en minuscules et sans espaces en trop : clé des portraits attribués.
export const normalizeName = (displayName) =>
  String(displayName ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
