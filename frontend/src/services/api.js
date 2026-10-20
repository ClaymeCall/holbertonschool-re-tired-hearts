const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

let onUnauthorized = null

// Appelé quand une route protégée répond 401 (session expirée) : l'application se déconnecte.
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

// Wrapper fetch minimal : JSON uniquement, pas de détail technique exposé à l'utilisateur.
// Le jeton de session est un cookie httpOnly : on ne le lit ni ne le stocke, on demande
// seulement au navigateur de l'envoyer (`credentials: 'include'`).
export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Le service est momentanément indisponible.')
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/v1/auth/')) onUnauthorized?.()
    throw new ApiError(response.status, 'La requête a échoué.')
  }
  return response.status === 204 ? null : response.json()
}
