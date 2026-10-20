import { CookieOptions } from 'express';
import { SESSION_DURATION_MS } from './session.constants';

export const ACCESS_TOKEN_COOKIE = 'access_token';

const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

export const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: SESSION_DURATION_MS,
};

// Deliberately has no `maxAge`: Express's `res.cookie()` recomputes `expires` from `maxAge`
// when both are set, so reusing ACCESS_TOKEN_COOKIE_OPTIONS here would make `clearCookie`
// reset the cookie's expiry to 2 hours in the future (empty value) instead of deleting it now.
export const CLEAR_ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = BASE_COOKIE_OPTIONS;
