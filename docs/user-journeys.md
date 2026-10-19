# Re-Tired Hearts — MVP User Journeys & Excluded Features

Phase 0 deliverable covering issue **#19** — define MVP user journeys; explicitly record excluded features.

This is the reference the Phase 6 live demo (`docs/requirements.md:195-196`) walks through, and the
source for Phase 6 item 7's "name one realistic improvement deliberately left outside the MVP"
(`docs/requirements.md:201`). Entities referenced below are defined in `docs/data-model.md`.

## 1. MVP user journeys

Three roles, per `docs/data-model.md`'s "Roles" section: **member** (default, every account),
**organizer** (not a stored role — any approved member creating/managing their own event),
**moderator** (`is_admin = true`, admin-granted only). Every journey below must be operable through
the Vue UI end-to-end, not only via direct API/DB calls (`docs/requirements.md:37`).

### Journey A — Member: discover and connect
1. Register → account created `active`, profile created `pending` (not discoverable yet).
2. Log in; see own account/profile status while `pending`.
3. Moderator approves the profile (Journey C) → profile becomes discoverable.
4. View/edit own profile: display name, bio, interests, approximate location, messaging toggle.
5. Browse other approved profiles (allowed fields only — no private info).
6. Browse/filter published events by interest and/or approximate location (paginated).
7. Register for an event; see registration status and remaining capacity.
8. Withdraw from an event (frees a place; re-register later if capacity allows).
9. Start a conversation with an eligible member (shared event registration, or the organizer of an
   event the member is registered for) and exchange messages.
10. Delete own account (self-service soft delete, per `docs/data-model.md` §3).

Covers Phases 1–3; matches the Phase 6 live-demo script (`docs/requirements.md:195`).

### Journey B — Organizer: run an event
Not a separate login — any member with an approved profile, using the same account as Journey A.
1. Create an event (`draft`): title, description, approximate location, date, capacity, one main interest.
2. Edit the draft, then publish it (`published` → discoverable by members).
3. View own event's registrants; cannot register for their own event
   (`docs/requirements.md:70`).
4. Cannot reduce capacity below the current registered count.
5. Mark a past event `completed` manually, or `cancel` it — deletion is only allowed for a
   `draft` with zero registrations; a `published` event with history is cancelled, not deleted
   (`docs/requirements.md:116`).
6. Message registrants like any member, subject to the same conversation-eligibility rule as
   Journey A.

Covers Phase 2.

### Journey C — Moderator: keep the platform safe
Admin-granted account (`is_admin = true`), seeded or assigned out-of-band — never via public
registration or self-promotion (`docs/requirements.md:96`).
1. Review pending profiles; approve (discoverable) or block (hidden, cannot create events/
   register/message).
2. Unblock a previously blocked profile (returns to `approved`).
3. Suspend or reactivate a member's account.
4. Cancel an inappropriate event.
5. Every action above is recorded in `ModerationAction` (moderator, target, action, date,
   optional reason — never passwords or private message content); moderators cannot read private
   messages merely from holding moderation permission (`docs/requirements.md:162`).

Covers Phase 4.

### Entry points outside the three journeys
- **Anonymous visitor**: registration/login forms; legal notice + plain-language privacy
  explanation are reachable without an account (`docs/requirements.md:163`).
- **Pending profile**: can view/edit own profile and browse published events; cannot create
  events, register, or message until approved (`docs/requirements.md:159`).
- **Blocked / suspended account**: access limited to understanding the restriction and signing
  out — no protected feature access (`docs/requirements.md:160-161`).

## 2. Explicitly excluded features

The authoritative exclusion list already lives in `docs/requirements.md` ("Explicitly out of
scope"); this table restates it against this issue so it has one place to point to, with the
reasoning behind each exclusion.

| Excluded feature | Why excluded |
|---|---|
| Advanced/automated matching algorithm | MVP relies on manual discovery + shared-interest filtering, not a recommendation engine. |
| Real-time chat / WebSockets | Messaging is async by design; polling/refresh is sufficient for the MVP journey. |
| Native mobile application | Responsive Vue web UI covers desktop + mobile without a separate app. |
| Complete reporting workflow / automated content classification | Moderation MVP is manual (approve/block/suspend/cancel); no report queue or automated flagging. |
| Public exposure of exact addresses | Privacy requirement — only approximate location (e.g. city) is ever shown. |
| Email campaigns | No marketing/notification system in scope; not needed for the core journeys. |
| Payments / financial features | No commercial transactions in the MVP. |
| Age or identity verification | Out of scope for the brief; account status (active/suspended) is the only identity control. |
| Read receipts, attachments in messaging | Messaging MVP is plain-text, 1–1000 chars, no delivery metadata. |
| Automatic event-completion scheduling | Organizers mark events `completed` manually; no scheduler/cron. |
| Advanced SEO / server-side rendering | Vue SPA is sufficient; only basic page metadata is in scope. |
| Advanced logging/observability beyond `ModerationAction` | **(Team decision)** Stick to the brief; the moderation audit trail is the only required log. |
| Automated database backup/restore tooling | **(Team decision)** Reset-and-reseed from versioned migrations + seed data is the supported recovery path. |

**Flagged as the Phase 6 "realistic improvement left outside the MVP"**: a basic automated
matching/recommendation layer on top of shared interests — the data model (`ProfileInterest`,
`Event.main_interest_id`) already supports it, but building the ranking logic itself was judged
out of scope for this sprint.
