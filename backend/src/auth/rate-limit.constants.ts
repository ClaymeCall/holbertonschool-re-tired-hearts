// Applied to POST /v1/auth/register and POST /v1/auth/login only (#38): a brute-force /
// credential-stuffing attempt is many requests in a short window, not a handful of normal
// mistyped-password retries.
export const AUTH_RATE_LIMIT = 5;
export const AUTH_RATE_WINDOW_MS = 60_000;
