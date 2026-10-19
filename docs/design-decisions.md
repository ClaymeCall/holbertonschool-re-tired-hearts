# Design decisions: interests, location, ownership, moderation states

Phase 0 deliverable covering issue **#22**. Columns and constraints live in `docs/data-model.md`; this page records
**what was chosen, why, and what was ruled out** for four representation decisions.

## 1. Interests

**Choice**
- `interests` is a reference table (`id`, unique `name`). It is filled by the first migration (12 interests) and is read-only
  for the API: members cannot create interests.
- A **profile** has several interests, through the join table `profile_interests` (composite primary key, so no duplicate).
- An **event** has exactly **one** main interest: `events.main_interest_id`, a `NOT NULL` foreign key.

**Why**
- A closed list avoids duplicates ("Cooking" / "cooking") and abusive free text, and makes filtering reliable.
- One interest per event makes the filter by interest a simple `WHERE main_interest_id = ?` and needs no extra table.
- An interest still used by a profile or an event cannot be deleted (`ON DELETE RESTRICT`).

**Ruled out**: free-text tags; several interests per event (it would need an `event_interests` join table: possible later
without changing profiles).

## 2. Approximate location

**Choice**
- Text column `approximate_location` (a city name) on `profiles` and on `events`.
- **No street address and no GPS coordinates are stored anywhere.**
- Filtering by location compares the text without case (indexed on `lower(approximate_location)`).

**Why**
- Privacy: the brief forbids exposing exact addresses, and what is never stored cannot leak.
- A city is enough to find local events and similar members.

**Ruled out**: exact address, latitude/longitude, a `cities` reference table (too heavy for the MVP).

**Note**: the external API planned in Phase 5 (for example a city lookup) may help the user type or pick a city name,
but its result is stored as plain text in `approximate_location`. If the API is down, the user types the city by hand.

## 3. Event ownership

**Choice**
- The owner of an event is the user in `events.organizer_id`.
- There is **no stored organizer role**: any member with an `active` account and an `approved` profile can create an event.
  The only stored privilege is `users.is_admin` (moderator).
- Ownership is checked in the service: `event.organizer_id === authenticated user`. The organizer is always taken from the
  session or token, never from the request body.
- The owner can edit, publish, cancel, complete and (draft only) delete the event, and cannot register for it.
  A moderator has no general edit power over events (see `docs/event-rules.md`).

**Why**: team decision (vote), recorded in `docs/data-model.md`: it avoids a second permission tier to maintain.

**Known limit**: the brief mentions an "organizer role" granted through a controlled process. Our reading is looser
(any approved member can organize). It is presented as an assumed deviation.

## 4. Moderation states

Moderation uses **two independent axes** plus an audit trail.

| Axis | Column | Values | Meaning |
|---|---|---|---|
| Profile | `profiles.moderation_status` | `pending`, `approved`, `blocked` | whether the profile is visible and the social features are open |
| Account | `users.account_status` | `active`, `self_deleted`, `suspended` | whether the account can use protected features at all |
| History | `moderation_actions` | moderator, target type, target, action, reason, date | who did what, never passwords or message content |

### Allowed transitions

| From | To | Done by | Action recorded |
|---|---|---|---|
| profile `pending` | `approved` | moderator | `approve_profile` |
| profile `approved` | `blocked` | moderator | `block_profile` |
| profile `blocked` | `approved` | moderator | `unblock_profile` (restores `approved`) |
| account `active` | `suspended` | moderator | `suspend_account` |
| account `suspended` | `active` | moderator | `reactivate_account` |
| account `active` | `self_deleted` | the user | none (no moderator involved) |
| event `published` | `cancelled` | moderator, through the moderation route | `cancel_event` |

Any other transition is refused (409). `self_deleted` is final. A blocked profile never goes back to `pending`.
A new profile is always created `pending`.

### What each state allows (enforced by the API on every request, even with a valid session)

| State | Own profile and account status | Sign out | Browse published events | Create events, register, message | Visible in discovery |
|---|---|---|---|---|---|
| profile `pending` | view, edit | yes | yes | **no** | no |
| profile `approved` | view, edit | yes | yes | yes, within privacy settings | yes |
| profile `blocked` | account status only | yes | no | **no** | no |
| account `suspended` | only what is needed to understand the restriction | yes | no | **no** | no |
| account `self_deleted` | none | n/a | none | none | no |

The two axes combine: a member needs an `active` account **and** an `approved` profile to use the social features.
Roles and statuses can never be changed by the member: no request body field can set `is_admin`,
`moderation_status` or `account_status` (unknown fields are rejected with 400).

## Points to confirm with the team

- Whether a moderator can also suspend or block someone who is already `self_deleted` (not needed by the brief).
- Whether a moderator may block a `pending` profile directly (the brief only mentions blocking approved profiles).
