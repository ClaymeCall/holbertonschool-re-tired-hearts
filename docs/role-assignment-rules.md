# Role-assignment rules: member / organizer / moderator

Phase 0 deliverable covering issue **#27**. The underlying columns are defined in `docs/data-model.md`
("Roles" under `User`) and the ownership/moderation reasoning in `docs/design-decisions.md` §3–4; this page
fixes **who can hold which role, how it is granted, and what it does and doesn't unlock**, before the Phase 1
route guards (#42) and Phase 4 moderation routes (#65) implement it.

## Vocabulary

- **Member**: any user with an `active` account. The default and only role granted at registration.
- **Organizer**: not a stored role — simply the user referenced by a given `Event.organizer_id`. Any member
  with an `active` account and an `approved` profile can become an organizer by creating an event.
- **Moderator**: a user with `users.is_admin = true`.

The brief's three-tier role model (member/organizer/moderator) is implemented with a **single stored flag**
(`is_admin`) plus an **ownership check** for "organizer" rather than a second role column — see
`docs/data-model.md`'s "Roles" section for the full reasoning and the flagged deviation from a literal reading
of the brief.

## How each role is granted

| Role | Default on registration? | How granted | Who can grant it |
|---|---|---|---|
| Member | yes | automatic at registration | — (nobody "grants" it; it's the floor) |
| Organizer | no (not a stored role) | implicitly, by creating an event (`POST /v1/events`) | the member themself — no approval step beyond having an `active` account + `approved` profile |
| Moderator | no | seed data, or an existing moderator acting through a documented, controlled procedure (never a public endpoint) | an existing moderator / the seed process (issue #41) |

**Elevated roles are never self-assignable.** Specifically:
- `POST /v1/auth/register` and `PATCH /v1/profiles/me` reject any `is_admin` field in the request body (unknown
  field → 400, per `docs/api-conventions.md`). There is no request path, public or authenticated, through
  which a member can set their own `is_admin` to `true`.
- Becoming an organizer is the one exception that *is* self-service, because it isn't a role grant: it's a
  side effect of owning a row in `events.organizer_id`. Nothing elevates the member's permissions outside the
  scope of that one event (see "What each role unlocks" below).
- A member can never elevate another member either — there is no route that lets one ordinary member set
  another's `is_admin` or make another member the organizer of an event they didn't create.

## What each role unlocks

| Capability | Member | Organizer (scoped to their own event) | Moderator |
|---|---|---|---|
| Browse published events, discover approved profiles, message eligible members | yes (if `approved` profile) | yes, same as member | yes, same as member |
| Create an event (becoming its organizer) | yes (if `approved` profile) | n/a — already organizing it | yes — moderator status grants no shortcut or exemption here; still needs an `approved` profile like any member |
| Edit / publish / cancel / complete / delete their **own** event | no | yes | no — a moderator has no general edit power over events (see below) |
| Register for **their own** event | no | **no** — explicitly excluded, even though they keep all standard member permissions | yes, like any member, for events they don't organize |
| Register for **another member's** event | yes | yes | yes |
| Approve / block / unblock profiles, suspend / reactivate accounts | no | no | yes |
| Cancel **any** event (not just their own), via the audited moderation route | no | no | yes, only through `POST /v1/moderation/events/:id/cancel` — never through the organizer-only `POST /v1/events/:id/cancel` |
| Read another member's private messages | no | no | **no** — holding `is_admin` grants no route that reads conversation content (see `docs/messaging-rules.md`) |

Two rules the brief calls out explicitly and that the table above encodes:
- **"Organizers keep standard member permissions, can register for others' events, not their own."** Organizer
  status subtracts nothing and adds nothing beyond ownership of that one event — in particular it does not
  remove the normal member right to register for *other* events, and it does not grant the right to register
  for the organizer's own.
- **"Moderator role does not auto-grant event-creation rights."** `is_admin = true` has no bearing on
  `POST /v1/events`; a moderator still needs an `active` account and an `approved` profile like everyone else,
  and moderator-initiated event cancellation only ever goes through the dedicated, audited moderation route
  (`docs/event-rules.md`), never the organizer-only one.

## Error cases

| Situation | Response |
|---|---|
| Registration or profile-edit body includes `is_admin` (or any other role/status field) | 400 Bad Request |
| Member without `is_admin` calls a `/v1/moderation/*` route | 403 Forbidden |
| Organizer calls `POST /v1/events/:id/registrations` on their own event | 403 Forbidden |
| Member without an `approved` profile calls `POST /v1/events` | 403 Forbidden |
| Moderator calls `POST /v1/events/:id/cancel` on an event they don't organize | 403 Forbidden — must use `POST /v1/moderation/events/:id/cancel` instead |
