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
| `GET /v1/events/:id` | member (draft: owner or admin) | 200 | 401, 404 |
| `POST /v1/events` | approved member | 201 | 400, 401, 403 |
| `PATCH /v1/events/:id` | owner or admin | 200 | 400, 403, 404, 409 (capacity below registered count) |
| `POST /v1/events/:id/cancel` · `/complete` | owner or admin (cancel) · owner (complete) | 200 | 403, 404, 409 |
| `DELETE /v1/events/:id` | owner (draft without registrations only) | 204 | 403, 404, 409 |
| `POST /v1/events/:id/registrations` | approved member, not the organizer | 201 | 401, 403, 404, 409 (full, closed, already registered) |
| `DELETE /v1/events/:id/registrations/me` | approved member | 200 (status `withdrawn`) | 401, 404 |
| `GET /v1/conversations` | member | 200 | 401 |
| `POST /v1/conversations` | approved member, eligible recipient | 201 | 400, 403, 404, 409 |
| `GET /v1/conversations/:id/messages` | participant | 200 | 401, 404 |
| `POST /v1/conversations/:id/messages` | participant (both accounts allowed) | 201 | 400 (1–1000 characters), 403, 404 |
| `GET /v1/moderation/profiles?status=pending` | admin | 200 | 401, 403 |
| `POST /v1/moderation/profiles/:id/approve` · `/block` · `/unblock` | admin | 200 | 403, 404, 409 |
| `POST /v1/moderation/users/:id/suspend` · `/reactivate` | admin | 200 | 403, 404, 409 |
| `POST /v1/moderation/events/:id/cancel` | admin | 200 | 403, 404, 409 |
| `GET /v1/moderation/actions` | admin | 200 | 403 |

Moderators have no route that reads private messages.
