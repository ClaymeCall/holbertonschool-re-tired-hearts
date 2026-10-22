import { request } from './api'

// Suggestions de communes : GET /v1/places/search?q=lyo -> { available, suggestions: [{ name, postalCode }] }.
// L'API répond toujours 200 : `available: false` veut dire que le service externe est en panne,
// et la saisie à la main reste possible.
export const searchPlaces = (text) => request(`/v1/places/search?q=${encodeURIComponent(text)}`)
