const BASE_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Wrapper fetch minimal : JSON uniquement, pas de détail technique exposé à l'utilisateur.
export async function request(path, { method = 'GET', body, headers = {} } = {}) {
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Le service est momentanément indisponible.')
  }
  if (!response.ok) {
    throw new ApiError(response.status, 'La requête a échoué.')
  }
  return response.status === 204 ? null : response.json()
}
