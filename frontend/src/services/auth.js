import { request } from './api'

// Routes documentées dans docs/api-conventions.md. Les réponses renvoient l'utilisateur
// { id, email, isAdmin, accountStatus, createdAt } et posent le cookie de session.
export const login = (credentials) => request('/v1/auth/login', { method: 'POST', body: credentials })
export const register = (credentials) => request('/v1/auth/register', { method: 'POST', body: credentials })
export const logout = () => request('/v1/auth/logout', { method: 'POST' })
export const fetchCurrentUser = () => request('/v1/auth/me')
