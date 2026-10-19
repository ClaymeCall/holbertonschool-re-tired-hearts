# Architecture

Phase 0 deliverable covering issue **#34** — risk register for Re-Tired Hearts, covering privacy,
impersonation, unwanted contact, moderation, and availability (`docs/requirements.md:77`).

## Risk register

| Risk | Description | Mitigation |
|---|---|---|
| **Privacy** | Private member data (exact location, private messages, account status) leaks to other members or the public. | Only approximate location and allowed profile fields are ever exposed (`docs/data-model.md`); private messages are restricted to the two conversation participants; moderators cannot read private message content merely from holding moderation permission (`docs/requirements.md:162`). |
| **Impersonation** | A member acts as another member/organizer, or self-grants an elevated role (organizer/moderator). | Sender identity is always derived from the authenticated session/token, never client-supplied (`docs/requirements.md:141`); elevated roles are never self-assignable at registration and are only granted out-of-band by an existing moderator (`docs/requirements.md:70`, `:96`). |
| **Unwanted contact** | A member is messaged by someone with no legitimate connection to them (harassment, spam). | A conversation can only start between two members who share an active event registration, or where one is registered for an event the other organizes (`docs/requirements.md:138`); both participants must have an approved profile, active account, and messaging enabled. |
| **Moderation** | Inappropriate profiles, events, or behavior go unreviewed, or moderation actions are untraceable/abused. | New profiles are not discoverable until a moderator approves them; moderators can approve/block/unblock profiles, suspend/reactivate accounts, and cancel inappropriate events; every action is recorded in `ModerationAction` (moderator, target, action, date, optional reason — never passwords or private message content) (`docs/requirements.md:155-156`). |
| **Availability** | The service becomes unusable or unsafe to use when a dependency fails (DB, external geocoding API) or under normal load. | Services start from documented, reproducible migrations and seed data (`docs/requirements.md:179`); the external geocoding integration degrades gracefully on timeout/failure, with manual city entry remaining usable so core journeys are never blocked by it (`docs/requirements.md:180`). |

Each row maps to a concrete, already-documented control rather than a new mechanism — the goal of
this register is to make the risk explicit and point to where it's handled, not to invent new
scope.
