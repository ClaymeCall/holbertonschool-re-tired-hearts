# API conventions

Phase 0 deliverable covering issue **#28**. The OpenAPI contract is **generated** by `@nestjs/swagger`
from the controllers and DTOs and served at `http://localhost:3000/v1/docs` (JSON: `/v1/docs-json`).
This page fixes the conventions and the planned routes; the generated contract stays the source of truth.

## Conventions

- All routes are prefixed with `/v1`. No further versioning strategy for the MVP.
- JSON only. Request bodies are validated by DTOs (`class-validator`); unknown fields are rejected (400).
- Each controller carries `@ApiTags`, each DTO field `@ApiProperty`, each route `@ApiOperation` and `@ApiResponse`
  for its error cases, so Swagger shows the full contract.
- The caller's identity always comes from the session or token, never from the request body
  (a message sender, an event organizer, a registering member).

## Session & token strategy

Covers issue **#37**. A JWT (`sub` = user id, HS256) is the session token. It travels in an
`httpOnly`, `SameSite=Lax` cookie (`secure` in production) set by `POST /v1/auth/register` and
`POST /v1/auth/login`, named `access_token`; the client never reads or stores it in JS.

- **Expiration**: 2 hours, both for the JWT (`expiresIn`) and the cookie (`maxAge`) — kept as one
  shared constant (`backend/src/auth/session.constants.ts`) so they can't drift apart. There is no
  refresh token for the MVP: once it expires, the caller logs in again.
- **Logout** (`POST /v1/auth/logout`) clears the cookie. The JWT itself is not revoked server-side
  (no blocklist in the MVP), so a copy of the token taken before logout would still verify until it
  naturally expires. Documented MVP limitation — acceptable given the 2-hour expiry and that the
  token never leaves an `httpOnly` cookie.
- **Per-request account-status checks**: `JwtStrategy.validate()` re-reads the user from the
  database on every authenticated request instead of trusting the JWT payload, so a suspension or
  self-deletion takes effect on the caller's very next request, not only after the token expires.
  `JwtAuthGuard` only proves "this is a valid session for an existing user" — it does **not** reject
  suspended/blocked accounts, because `GET /v1/auth/me` must stay reachable for them to read their
  own restriction. Status-based route protection (rejecting suspended/blocked accounts on
  everything *except* `/auth/me`) is issues **#42**/**#66**.

## Rate limiting

Covers issue **#38**. `POST /v1/auth/register` and `POST /v1/auth/login` are rate-limited with
`@nestjs/throttler` (`ThrottlerGuard`), **5 requests per 60 seconds per IP** for each route
independently (`backend/src/auth/rate-limit.constants.ts`); a 6th request within the window gets
429. No other route is throttled.

- Tracked by IP (the library's default), not by the submitted email: it limits how fast one
  source can hammer either endpoint, regardless of which account(s) it targets.
- In-memory storage, so the limit is per backend process. Fine for the MVP's single backend
  container; a multi-instance deployment would need a shared store (e.g. Redis) instead — out of
  scope here.
- Known limitation: callers behind the same NAT/proxy share a limit. Acceptable trade-off for the
  MVP given the brute-force/credential-stuffing threat this mitigates.

## Permission levels

| Level | Meaning |
|---|---|
| public | no authentication |
| member | authenticated, `account_status = active` |
| approved member | member whose profile is `approved` (needed to create events, register, message) |
| admin | `users.is_admin = true` (moderator) |
| owner | the organizer of the event / a participant of the conversation |

## Error format

Errors use the NestJS shape `{ "statusCode": 409, "message": "…", "error": "Conflict" }` with safe messages only
(no stack trace, SQL detail or secret).

| Code | Used for |
|---|---|
| 400 | invalid or unknown field, invalid query parameter |
| 401 | not authenticated or expired session |
| 403 | authenticated but not allowed (suspended account, pending/blocked profile, not owner, not admin) |
| 404 | resource not found, or hidden from the caller (another member's conversation, a non-approved profile) |
| 409 | conflict (email already used, event full, already registered) |
| 429 | rate limit on login and registration |
| 500 | unexpected error (generic message) |

## Planned routes

| Route | Permission | Success | Main errors |
|---|---|---|---|
| `POST /v1/auth/register` | public | 201 | 400, 409, 429 |
| `POST /v1/auth/login` | public | 200 | 401, 429 |
| `POST /v1/auth/logout` | member | 204 | 401 |
| `GET /v1/auth/me` | any authenticated (also suspended/blocked, to read the restriction) | 200 | 401 |
| `GET /v1/interests` | public | 200 | — |
| `GET /v1/profiles/me` / `PATCH /v1/profiles/me` | member | 200 | 400, 401, 403 |
| `GET /v1/profiles` (discovery, approved only) | member | 200 | 401, 403 |
| `GET /v1/profiles/:id` | member | 200 | 401, 404 |
| `GET /v1/events?interest=&location=&page=&limit=` | member | 200 (paginated) | 400, 401 |
| `GET /v1/events/mine` | member | 200 (`{ registered, organized }`) | 401 |
| `GET /v1/events/:id` | member (`draft`: owner or admin · `cancelled`/`completed`: owner, registered participant, or admin) | 200 | 401, 404 |
| `POST /v1/events` | approved member | 201 | 400, 401, 403 |
| `PATCH /v1/events/:id` | owner | 200 | 400, 403, 404, 409 (capacity below registered count) |
| `POST /v1/events/:id/publish` · `/cancel` · `/complete` | owner | 200 | 403, 404, 409 |
| `DELETE /v1/events/:id` | owner (draft without registrations only) | 204 | 403, 404, 409 |
| `POST /v1/events/:id/registrations` | approved member, not the organizer | 201 | 401, 403, 404, 409 (full, closed, already registered) |
| `DELETE /v1/events/:id/registrations/me` | member | 200 (status `withdrawn`) | 401, 404, 409 (not registered, or event no longer published) |
| `GET /v1/conversations` | member | 200 | 401 |
| `POST /v1/conversations` | approved member, eligible recipient | 201 | 400, 403, 404, 409 |
| `GET /v1/conversations/:id/messages` | participant | 200 | 401, 404 |
| `POST /v1/conversations/:id/messages` | participant (both accounts allowed) | 201 | 400 (1–1000 characters), 403, 404 |
| `GET /v1/moderation/profiles?status=pending` | admin | 200 | 401, 403 |
| `POST /v1/moderation/profiles/:id/approve` · `/block` · `/unblock` | admin | 200 | 403, 404, 409 |
| `POST /v1/moderation/users/:id/suspend` · `/reactivate` | admin | 200 | 403, 404, 409 |
| `POST /v1/moderation/events/:id/cancel` | admin | 200 | 403, 404, 409 |
| `GET /v1/moderation/actions` | admin | 200 | 403 |

Admins have no general edit power over events (not in the `ModerationAction` enum). `POST /v1/moderation/events/:id/cancel`
is the only path an admin can cancel an event through, so the `ModerationAction` audit row is always written; the owner-only
`POST /v1/events/:id/cancel` is a separate, unaudited action and must not also accept admin.

Moderators have no route that reads private messages.
