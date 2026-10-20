# Profile visibility rules

Phase 0 deliverable covering issue **#24**. Fields and constraints are defined in `docs/data-model.md`
(`Profile.moderation_status`, `Profile.messaging_enabled`) and `docs/design-decisions.md` §4 (moderation states);
this page fixes which profile fields are visible to whom, and under what conditions, before the Phase 1 routes
(`GET /v1/profiles`, `GET /v1/profiles/:id`, `GET /v1/profiles/me`) implement it.

## Vocabulary

- **Owner**: the authenticated user whose `Profile.user_id` matches their own id.
- **Viewer**: the authenticated user making the request (never anonymous — discovery requires a `member`
  permission level, see `docs/api-conventions.md`).
- **Discoverable**: returned by `GET /v1/profiles` (the discovery list) and reachable by id via `GET /v1/profiles/:id`.

## Field visibility

| Field | Owner (own profile) | Other authenticated member | Notes |
|---|---|---|---|
| `display_name` | yes | yes | |
| `bio` | yes | yes | |
| `approximate_location` | yes | yes | city/region only — never an exact address (`docs/design-decisions.md` §2) |
| `interests` | yes | yes | via `profile_interests` |
| `messaging_enabled` | yes | no | a privacy choice, not a social field: the viewer doesn't need to know it in advance — attempting to message a profile that disabled it fails with its own error (`docs/messaging-rules.md`), nothing is shown on the profile itself |
| `moderation_status` | yes | no | never exposed to other members; see "Pending/blocked profiles" below |
| `email` | yes | **no** | never returned on any profile the viewer doesn't own — avoids exposing a contact channel that bypasses in-app messaging |
| `account_status` | yes | no | account-level, not profile-level; relevant only to the owner and to moderators |

The owner always sees their own profile in full, regardless of `moderation_status` — a `pending` or `blocked`
profile is still editable by its owner (`docs/design-decisions.md` §4).

## Who can see a profile at all

| Profile state | Visible to its owner | Visible to other members (discovery + direct id) | Visible to moderators |
|---|---|---|---|
| `pending` | yes | **no** | yes |
| `approved` | yes | yes | yes |
| `blocked` | yes (account status only, per `docs/design-decisions.md` §4) | **no** | yes |

A profile is discoverable by other members only while `moderation_status = 'approved'`. This applies identically
to the list endpoint and to direct access by id: there is no "unlisted but reachable by link" state. A `pending`
or `blocked` profile requested by anyone other than its owner or a moderator is **404**, not 403 — its existence
is not revealed, the same treatment as a non-existent id (consistent with the draft-event rule in
`docs/event-rules.md`).

This also means a profile's own `account_status` never independently hides it from discovery: an `approved`
profile belonging to a `suspended` account is still shown, since `moderation_status` is the only axis that
gates visibility (the suspended owner simply can't use protected features themselves — see
`docs/design-decisions.md` §4). A `self_deleted` account's profile is treated as not discoverable regardless of
`moderation_status` (cascade rule in `docs/data-model.md` §3).

## Discovery listing

- `GET /v1/profiles` returns only `approved` profiles, and only the fields listed as visible to "other
  authenticated member" above.
- No filter reveals a non-approved profile indirectly (e.g. filtering by interest or location must exclude
  `pending`/`blocked` rows the same way the unfiltered list does).
- Pagination, if added later, must not change this: every page of results is pre-filtered to `approved`.

## Error cases

| Situation | Response |
|---|---|
| Not authenticated | 401 Unauthorized |
| Requested profile is `pending` or `blocked`, caller is neither the owner nor a moderator | 404 Not Found |
| Requested profile id does not exist | 404 Not Found |
| Authenticated member requests their own profile (`GET /v1/profiles/me`) regardless of status | 200 OK |
| Moderator requests any profile by id | 200 OK |
