// Single source of truth for session length: the JWT's `expiresIn` and the cookie's
// `maxAge` must match, otherwise the browser would keep sending a cookie for a token
// the API already rejects as expired (or vice versa).
export const SESSION_DURATION_SECONDS = 2 * 60 * 60; // 2 hours
export const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;
