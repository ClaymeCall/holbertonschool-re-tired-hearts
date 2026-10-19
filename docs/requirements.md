# Re-Tired Hearts — Requirements

Extracted from `project-raw-tasks.md`. Organized into the 7 phases the brief itself follows (Task 0 → Task 6, confirmed by internal cross-references such as "reusing Task 0," "introduced in Task 1," "implemented in Task 4"). Each phase blocks the next; intra-phase ordering generally follows migrations → routes → UI → tests.

Items marked **(Team decision)** are not stated in the brief — they were raised as inferred/implied gaps and resolved by the team. Everything else is an explicit requirement from the brief.

## Team decisions on inferred items

Resolutions for gaps the brief doesn't address explicitly:

| Topic | Decision | Where |
|---|---|---|
| CI pipeline | Approved — simple GitHub Actions workflow running backend + frontend tests | Phase 5 |
| Rate limiting | Approved — throttle login/registration | Phase 1 (+ cross-cutting) |
| CORS configuration | Approved — env-driven allow-list | Phase 5 |
| Advanced logging/observability | **Declined** — stick to the brief, no addition | — |
| API versioning | Approved, minimal — prefix routes with `/v1`, no further strategy | Phase 0 |
| Soft/hard delete | Approved — decide policy for `User` (+ cascades) | Phase 0 (decision) / Phase 1 (migration) |
| Password reset | Approved, minimal — no self-service flow, a documented direct DB `UPDATE` is sufficient | Phase 1 |
| Pagination | Approved — event listing, API + Vue | Phase 2 |
| OpenAPI | Approved — generate via NestJS's built-in `@nestjs/swagger` | Phase 0 |
| Automated DB backup | **Declined** — reset-and-reseed (already required) is sufficient | — |

## Cross-cutting principles

Apply across every phase. Not standalone issues, but acceptance bars for issues in every phase below.

- No IDOR: users must never reach another user's private profile, registrations, or conversations by changing an identifier in a URL/request.
- Authorization/account-status checks must run on **every** protected API request, even with a valid existing session/token — never enforced only by hiding UI elements.
- Secure authentication, safe password storage, server-side validation on all inputs.
- Rate-limit authentication-sensitive endpoints (login, registration) to mitigate brute-force/credential-stuffing attempts. **(Team decision)**
- User-controlled text rendered safely (no executing injected HTML/scripts).
- Errors must never expose stack traces, secrets, or DB details.
- WCAG practices: labels, keyboard navigation, focus states, contrast, status/error messaging.
- Responsive layout (desktop + mobile) for forms, cards, conversations, moderation screens.
- PostgreSQL is the source of truth; all schema changes go through versioned migrations.
- Main user journey must be operable through the Vue UI, not only via direct API/DB calls.

## Explicitly out of scope (exclusions to track, not build)

- Advanced/automated matching algorithm.
- Real-time chat / WebSockets (messaging is async).
- Native mobile application.
- Complete reporting workflow / automated content classification.
- Public exposure of exact addresses (approximate location only).
- Email campaigns.
- Payments / financial features.
- Age or identity verification.
- Read receipts, attachments in messaging.
- Automatic event-completion scheduling (organizer marks manually).
- Advanced SEO / server-side rendering.
- Advanced logging/observability beyond what each phase explicitly requires (e.g. the `ModerationAction` audit trail). **(Team decision)**
- Automated database backup/restore tooling — reset-and-reseed is the supported recovery path. **(Team decision)**

---

## Phase 0 — Team, Scope & Technical Foundation

**Priority: P0 — blocks everything else.** Nothing downstream can start without the data model, API contract, and running skeleton from this phase.

1. Register team members, roles, availability, working agreement.
2. Define MVP user journeys; explicitly record excluded features.
3. Design entities: `User`, `Profile`, `Interest`, `ProfileInterest`, `Event`, `EventRegistration`, `Conversation`, `Message`, `ModerationAction`. Each `Event` must FK to exactly one main `Interest` (enables filter-by-interest).
4. Create a database diagram: relationships, cardinalities, PKs, FKs. *(Reused later in Phase 6 presentation.)*
5. Decide representation of: interests, approximate location, event ownership, moderation states.
6. Decide a soft-delete vs hard-delete policy for `User` (and any cascading effect on dependent entities such as `Profile`, `EventRegistration`, `Message`) as part of the data model. **(Team decision)**
7. Document profile visibility rules.
8. Document event capacity & lifecycle states.
9. Document conversation eligibility rules.
10. Document role-assignment rules: member/organizer/moderator. Elevated roles must never be self-assignable at registration. Organizers keep standard member permissions, can register for others' events, **not** their own. Moderator role does not auto-grant event-creation rights.
11. Define API routes, request/response shapes, permissions, error cases. Generate the OpenAPI contract using NestJS's built-in Swagger module (`@nestjs/swagger`) rather than a separate hand-written document. **(Team decision: tooling choice)** Prefix all routes with `/v1`; no further versioning strategy is required for the MVP. **(Team decision: versioning scope)**
12. Choose NestJS module structure, Vue structure, PostgreSQL access layer, migration tool, testing tools.
13. Initialize NestJS API, Vue app, PostgreSQL service.
14. Create the initial migration.
15. Build one working API route + one Vue screen end-to-end (skeleton proof).
16. Document local setup, branch naming, commit conventions, blank-DB recreation procedure.
17. Write a risk register in `docs/architecture.md` covering privacy, impersonation, unwanted contact, moderation, availability.

**Dependency note:** items 3–4 (entity model) gate every migration in Phases 1–4. Item 11 (API contract) gates all route implementation. Item 17 feeds directly into Phase 4's security review.

**Acceptance bar:** team of 2–3 (3 preferred); scope + exclusions documented and understood by all; branch rules/commit conventions/collaboration expectations documented; data model covers entities, relationships, cardinalities, PK/FK, ownership, moderation states, and the soft/hard-delete policy; visibility/capacity/lifecycle/eligibility/role rules documented *before* implementation; first API contracts include inputs/outputs/permissions/errors and are published via Swagger at `/v1`; versioned migrations create the DB from empty Postgres; all three services start locally; first route + screen demonstrable; risk register covers privacy, impersonation, unwanted contact, moderation.

---

## Phase 1 — Identity & Profile

**Priority: P0/P1 — auth is a hard prerequisite for Phases 2–4.** Depends on Phase 0's entity design and API contract.

1. Create/extend migrations for `users`, `profiles`, `interests`, and relations (reusing Phase 0 structure). Add account status (`active`, `suspended`), default `active`. Add the soft-delete marker on `users` (e.g. `deleted_at`) per the Phase 0 data-model decision. **(Team decision)**
2. Implement registration, login, logout, current-user routes.
3. Hash passwords securely; document session/token strategy (logout, expiration, how account restrictions are checked per request).
4. Rate-limit the login and registration endpoints (e.g. NestJS throttler) to mitigate brute-force/credential-stuffing attempts. **(Team decision)**
5. Document the minimal password-reset mechanism for the MVP: no self-service flow — a direct, documented DB `UPDATE` (e.g. performed by a moderator/admin following a documented procedure) is sufficient. **(Team decision)**
6. Add profile fields, interest selection, privacy choices, approximate location; separate private vs. authenticated-visible info. Add profile moderation status (`pending`, `approved`, `blocked`); new profiles are **not discoverable until approved**.
7. Provide an initial moderator account (seed or documented secure approval procedure) — needed so profile approval/discovery is testable before Phase 4's moderation UI exists.
8. Protect member-only routes; distinguish member/organizer/moderator permissions. New accounts default to `member`. Organizer/moderator only via controlled process (seed or admin action) — never via public registration or profile edit.
9. Build Vue registration/login/profile forms: labels, validation, loading, error, success states.
10. Build a member-discovery page (authenticated users browse approved profiles, allowed fields only).
11. Add API tests + ≥1 Vue test for registration/login/profile editing, including authorization tests (private data stays protected; no self-assigned elevated roles).
12. Demonstrate: anonymous request, invalid credential, member editing own profile, authenticated member discovering an approved profile.

**Acceptance bar:** valid registration gets useful validation feedback; invalid/duplicate/incomplete data rejected safely; login/logout/session expiration behave predictably; passwords never stored/returned in plaintext; repeated failed logins are throttled; anonymous users blocked from protected routes; member can view/edit own profile only; authenticated members discover approved profiles without private info; pending/blocked profiles excluded from discovery; interests/location follow documented privacy rule; roles distinguishable, no self-assigned elevation; auth/profile/discovery UI keyboard- and small-screen-usable; tests cover auth/profile/authorization behavior.

---

## Phase 2 — Events

**Priority: P1 — core journey.** Depends on Phase 0 model and Phase 1 roles/approved-profile gating (event creation requires organizer role + approved profile).

1. Migrations for `events` and `event_registrations` (reusing Phase 0 model): FKs + unique constraint preventing duplicate member+event registration. Registration status (`registered`, `withdrawn`); withdrawing updates the existing row, re-registering reactivates it (no duplicate rows). Only `registered` rows count toward capacity.
2. Implement event creation, listing, detail, update, cancellation, deletion routes. Lifecycle states: `draft`, `published`, `cancelled`, `completed`.
   - `draft` visible only to organizer + moderators.
   - `published` discoverable by members.
   - `cancelled`/`completed` remain accessible to registered participants/organizer/moderators, status clearly shown.
   - Organizers can manually mark past events `completed` (no auto-scheduling required).
   - Only draft events with zero registrations may be permanently deleted; published events with history must be cancelled, not deleted.
3. Paginate the event listing endpoint (e.g. page/limit query params) and the corresponding Vue event list, rather than returning the full dataset at once. **(Team decision)**
4. Support filtering by interest and approximate location (e.g., city), without exposing exact addresses.
5. Prevent duplicate registrations; enforce capacity:
   - Only `published`, future, under-capacity events accept registrations.
   - Withdraw frees a place; re-register if capacity allows.
   - Use a DB transaction with locking (or other atomic mechanism) to prevent concurrent overbooking.
   - Organizers cannot reduce capacity below current registered count.
   - Registering requires active account + approved profile; creating an event requires approved profile + organizer role.
6. Enforce organizer ownership (manage only own events) and moderator permissions on event-management actions.
7. Build Vue: paginated event list, detail, creation, editing, registration, withdrawal, cancellation flows with accessible feedback.
8. Add API + front-end tests: filtering, pagination, registration, permission boundaries, duplicate registrations, full events, cancelled/past events, unauthorized modification attempts.
9. Demonstrate a full lifecycle: draft/creation → publication → registration → withdrawal → cancellation/completion.

**Acceptance bar:** organizer can create/view/edit/cancel own event; events follow lifecycle states, only published discoverable; event listing is paginated on both API and Vue; members browse/filter by interest and/or approximate location; event details show date, approx. location, organizer, capacity, available places; registration/withdrawal follow capacity and lifecycle rules; duplicate registrations prevented; concurrent registrations can't exceed capacity; withdrawals free a place, re-registration works when capacity allows; cancelled/past events understandable and closed to new registrations; published events with registrations are cancelled, not deleted; members can't alter another organizer's event; moderator permissions enforced; Vue journey handles empty/loading/success/failure states; tests cover registration, filtering, pagination, unauthorized access.

---

## Phase 3 — Messaging

**Priority: P1.** Depends on Phase 2 (event registrations define contact eligibility) and Phase 1 (approved profile / privacy settings / account status gating).

1. Business rule: a conversation may start between two members only if **both have an active registration for the same event**, OR a member has an active registration for an event **organized by the recipient**. Withdrawn registrations do not grant new-conversation permission. Both participants need approved profile, active account, and private-messaging enabled in privacy settings. Once created, a conversation survives event end / participant withdrawal as long as both remain authorized. If either participant disables messaging or loses required status, **new** messages are refused, but existing history access still follows account/privacy rules.
2. Migrations: `conversations`, `messages` with ownership relations. Exactly two distinct participants per conversation; prevent duplicate conversations between the same pair regardless of initiator.
3. Implement conversation creation, listing, message creation, message-history routes, enforcing the contact rules above.
4. Restrict each conversation to its two participants on every read/write. Sender identity always derived from the authenticated session/token, never a client-supplied id. Pending/blocked/suspended accounts cannot initiate or send. Unrelated users cannot access existing conversations.
5. Validate message content: 1–1000 chars after trimming; stored/displayed as plain text (no executable HTML). Empty/over-limit messages rejected with clear feedback.
6. Build Vue conversation/message views: empty, loading, failure states; chronological order; clear sender/recipient identification; usable send form.
7. Add API privacy-boundary tests + ≥1 front-end test (message submission or history). Include: unauthorized conversation access, invalid messages, duplicate conversations, contact-restriction violations.
8. Demonstrate: empty conversation, invalid message, successful exchange between authorized members, attempted access to an unrelated conversation.

**Acceptance bar:** conversation start gated by the eligibility rule above; both participants approved/active/messaging-enabled; exactly 2 distinct participants, duplicates prevented; authorized participants send/retrieve messages async; conversations continue after event end/withdrawal if still authorized; message history ordered and correctly associated; empty/invalid/failed states handled clearly; length/content validation enforced server-side; unsafe HTML not rendered as executable; no cross-conversation access via identifier manipulation; sender can't be impersonated; anonymous refused, blocked/suspended can't send; Vue messaging usable desktop/mobile; privacy tests + front-end messaging test pass.

---

## Phase 4 — Moderation & Security Hardening

**Priority: P0/P1 (security).** Depends on Phase 1 (profile status), Phase 0 (`ModerationAction` entity), and touches every prior phase's authorization logic.

1. Complete moderation data model: reuse `pending/approved/blocked` profile statuses (Phase 1), add/complete `active/suspended` account status, implement `ModerationAction` entity (moderator, target, action, date, optional reason — **no passwords or private message content** in the log). Reuse existing role system; no duplicate roles/fields.
2. Implement protected moderation routes + Vue screens: approve pending profiles, block approved profiles, unblock blocked profiles (→ restores `approved`), suspend/reactivate accounts, cancel inappropriate events. Only authorized moderators.
3. Enforce status-based restrictions consistently at the API level (not UI-only), checked even on valid existing sessions:
   - `pending`: can view/edit own profile, browse published events; **cannot** create events, register, or message until approved.
   - `approved`: full social features per role/privacy settings.
   - `blocked`: profile hidden; cannot create events/register/message; retains access to own account status + sign-out.
   - `suspended` account: no protected-feature access at all; only enough to understand the restriction + sign out.
4. Add safe error responses, server-side validation, authorization checks, secure headers where appropriate. Prevent self-modification of own role/moderation status/account restriction via manipulated requests. Moderators must **not** be able to read private messages merely from holding moderation permission.
5. Add legal notice + plain-language privacy explanation (what's visible, what's private, how data is handled).
6. Review keyboard nav, contrast, text size, responsive layout, destructive-action handling; moderation screens must name the target (profile/account/event) and require confirmation before block/suspend/cancel.
7. Execute an acceptance plan (happy paths, invalid data, expired sessions, forbidden actions; pending/blocked profiles, suspended accounts, unauthorized moderation requests, protected conversations, event cancellation) and record scenarios/expected/actual results in `docs/security-review.md`.
8. Record a security review (risk, impact, mitigation, remaining limitation per issue) — same `docs/security-review.md`.

**Acceptance bar:** moderator-only routes/screens inaccessible to ordinary members; moderators can approve/block/unblock profiles, suspend/reactivate accounts, manage inappropriate events; pending profiles hidden from discovery until approved; blocked profiles blocked from documented social features; suspended accounts can't bypass via existing session/token; moderation changes recorded (moderator, resource, action, date); members can't modify own roles/statuses/restrictions; moderators can't read private messages without an explicit authorized feature; invalid input/missing resources/expired sessions/forbidden actions return safe feedback with no leaked internals; legal/privacy info accessible; main screens keyboard-navigable, contrast-compliant, responsive; destructive actions require confirmation; acceptance plan records both successful and rejected scenarios; security review identifies mitigations and remaining limitations.

---

## Phase 5 — Containerization, Deployment & External API

**Priority: P1.** The Compose skeleton can exist in parallel with Phase 0, but the "complete" version depends on Phases 1–4 being implemented (seed data, tests, env vars for all features).

1. Create Dockerfiles + `docker-compose.yml` for NestJS, Vue, PostgreSQL; services communicate correctly; app reachable via documented local ports. Configure CORS on the NestJS API via an env-driven allow-list (e.g. `FRONTEND_URL`) matching the Vue dev/prod origin, documented in `.env.example`. **(Team decision)**
2. Add health checks; document service dependencies/ports. Postgres must be ready before migrations/dependent API operations, via Compose healthchecks + dependency conditions (not container start order alone).
3. Add `.env.example`; never commit secrets; document all required env vars; gitignore sensitive config files. Demo accounts may use clearly-labeled non-sensitive test credentials.
4. Run versioned migrations + load reproducible seed data from a blank DB. Seed must include demo accounts for member/organizer/moderator roles, approved profiles, and enough events/registrations/conversations to demo the main journeys. Document reset/reseed procedure (no real personal data) — this reset-and-reseed flow is the team's chosen recovery path in place of automated backup/restore tooling. **(Team decision)**
5. Integrate one third-party API (e.g., city lookup/geocoding): clear user benefit, reachable via the UI, handles timeouts/invalid responses/unavailability gracefully — essential actions (e.g., manual city entry) must remain usable if it fails. Document provider, endpoint, key, usage limits, fallback behavior. Keep keys server-side (NestJS only).
6. Complete API + front-end tests; record commands and results, including integration tests for auth, permissions, events, registrations, messaging, moderation. Document any failed/unimplemented tests honestly.
7. Add a GitHub Actions workflow that installs dependencies and runs the backend and frontend test suites on push/PR. **(Team decision)**
8. Document in README: install, launch, migration, reset, test, demo-account procedures, project structure, env vars, Compose commands, API/Vue URLs, test commands, known limitations.
9. Add page metadata (titles), optimize images/assets, document eco-design choices; accessible image alternatives; SEO metadata scoped to publicly accessible pages.
10. Run the full setup from a clean environment and record any limitation another evaluator needs to know; verify a fresh clone + README alone gets someone to a working demo.

**Acceptance bar:** Compose starts all three services with documented deps/ports and correctly configured CORS; DB readiness handled correctly before migrations/dependent ops; clean DB creatable via versioned migrations; reproducible seed data loadable/resettable without real personal info; demo accounts for all three roles with enough data for main journeys; external API integration has a documented benefit, reachable via the UI; external API timeout/failure handled safely without blocking essential functionality; `.env.example` documents config without secrets; no real credential committed; tests runnable via documented commands with results recorded, and also run automatically in CI; README accurately explains install/migrate/reset/tests/demo access; another developer can reproduce setup from a clean environment using only the docs; SEO/eco-design decisions documented and proportionate.

---

## Phase 6 — Final Presentation

**Priority: P2 (last).** Assembles evidence from every prior phase — cannot start until Phases 1–5 are functionally complete.

1. Demonstrate the full member journey live (not slides): register/login (show moderator approval or use a pre-approved demo account) → view/edit own profile → discover another approved profile → browse events + apply a filter → register for an event + verify status → start a conversation with an eligible member + exchange messages.
2. Demonstrate ≥1 validation error, ≥1 forbidden action, ≥1 moderation action, with the API rule explained for each.
3. Present architecture/data model/migrations/main routes, using the Phase 0 DB diagram (PKs, FKs, relationships, constraints).
4. Explain auth, privacy, accessibility, testing, Docker, and external-API choices, including behavior when the external API is unavailable.
5. Present test results, Compose startup/deploy instructions, limitations, and future work — actual commands/results, not claims.
6. Every member participates: explains global architecture, their own contribution, and can field questions on parts they didn't personally build.
7. Prepare a final delivery checklist; name one realistic improvement deliberately left outside the MVP; verify the repo contains app code, migrations, seed data, tests, architecture docs, security review, and an up-to-date README.

**Acceptance bar:** presentation fits the allotted time with a clear plan; working app demoed live via Vue + NestJS + Postgres; demonstrates registration/login, profile discovery, event, registration, and a private message between authorized members; demonstrates ≥1 validation error, ≥1 forbidden action, ≥1 moderation action; architecture/data flow/model/migrations explained accurately; auth/privacy/moderation/accessibility/tests/Docker/external-API choices justified; demoed app matches repo and README; Compose startup, DB init, demo accounts documented and reproducible; test commands/results/limitations presented honestly; every member participates and can answer questions about the whole project; final repo contains all required code, migrations, seed data, tests, and docs; team names one improvement deliberately left outside the MVP.
