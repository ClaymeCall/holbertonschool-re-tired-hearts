# Test results

Covers issue **#77**: the commands to run every test suite, the results, and an honest list of what is not tested. The acceptance scenarios and the security review are in `docs/security-review.md`.

Results below were recorded on **2026-10-21** on a freshly built Docker Compose stack (database migrated and seeded), on the code of `main` of that afternoon. The moderation integration tests are those of #124; until it is merged the integration total is 130 instead of 188 (the numbers are given both ways).

## 1. Commands

```bash
docker compose up --build -d
docker compose exec backend npm run migration:run     # only on a blank database
docker compose exec backend npm run seed              # demo accounts, needed by the demo scripts only

# Back end
docker compose exec backend npm test                  # unit tests (Jest, collaborators replaced by fakes)
docker compose exec backend npm run test:integration  # integration tests (Jest + supertest, real PostgreSQL)

# Front end
docker compose exec frontend npx vitest run           # Vitest + Vue Test Utils

# Builds
docker compose exec frontend npx vite build
docker compose exec backend npx tsc --noEmit -p tsconfig.json

# Scripted demos against the running API (usage in the header of each script)
cd backend && npm run demo:phase1 && npm run demo:phase3
```

The integration tests run on a separate database named `<DB_NAME>_test`, created on first use; the harness refuses to run on any database whose name does not end with `_test`, because every test empties the tables first.

## 2. Results

| Layer | Command | Suites / files | Tests | Result |
|---|---|---|---|---|
| Back end, unit | `npm test` | 20 suites | 209 | all passed |
| Back end, integration | `npm run test:integration` | 6 suites | 188 | all passed |
| Front end | `npx vitest run` | 27 files | 188 | all passed |
| Back end type check | `tsc --noEmit` | , | , | no error |
| Front end build | `vite build` | , | , | built (main script 197 kB, 66 kB compressed) |
| Scripted demos | `demo:phase1`, `demo:phase3` | 2 scripts | every call checked | all as expected |

No test failed, and none is skipped (`.skip` or `.todo`) in the repository.

## 3. What is covered, by area

The integration tests send real HTTP requests through the whole application (guards, validation, services, SQL) and check the database afterwards. Each file also checks the 401 and 403 cases of its routes.

| Area (as listed in #77) | File | Integration tests | What it proves |
|---|---|---|---|
| Authentication | `auth.integration.spec.ts` | 12 | registration, login, logout, `/auth/me`, forged cookie, duplicate email in any case, generic login error |
| Profiles and permissions | `profiles.integration.spec.ts` | 21 | creation as pending, edit rules, discovery shows approved profiles only, hidden pending/blocked profiles, public versus full view, forbidden fields |
| Events and registrations | `events.integration.spec.ts` | 52 | lifecycle, owner-only actions, draft and cancelled visibility, pagination and filters, duplicate and full registration, re-registration on the same row, withdrawal, **simultaneous registrations never exceed the capacity** |
| Messaging | `messaging.integration.spec.ts` | 37 | contact link, recipient and sender conditions, privacy switch, content rules, history, **no access to another conversation**, one conversation for two simultaneous first messages, unread counters |
| Moderation (#124) | `moderation.integration.spec.ts` | 58 | the 8 routes refuse anonymous callers, members and suspended moderators; the 9 profile transitions; accounts; events; audit log; **rollback when the audit cannot be written**; one winner among two simultaneous moderators |
| External API | `places.integration.spec.ts` | 8 | authentication, validation, suggestions, fallback when the provider is down (the provider is replaced by a fake: no test uses the network) |

Unit tests (209) cover the pure business rules (`event-rules`, `messaging-rules`), the DTOs, the guards (`ActiveAccountGuard`, `RolesGuard`), the services with fake repositories, the rate-limit constants and the places service. Front tests (178) cover the views, the router, the services (with a replaced API layer) and an automatic accessibility check on each main view.

## 4. How the tests themselves are checked

A test that has never failed proves nothing, so the production code was **deliberately broken** (a guard removed, a rule or a condition deleted) and the suites run again; at least one test must fail each time. This is done by hand (not part of the automated run).

| Module | Deliberate breakages | Detected by the integration tests | Notes |
|---|---|---|---|
| Messaging | 13 | 13 | three of them (`ON CONFLICT`, registration status, history limited to the pair) are seen by the integration tests only |
| Moderation | 8 | 7 | the eighth (writing the audit row on another connection) cannot be observed from outside; the unit tests cover it |
| External API | 6 | 6 | |
| Events | 12 | 10, then 11 | one gap found and **closed in this work** (see below); the remaining one (account status check in the service) is redundant with `ActiveAccountGuard`, kept as defence in depth, and is caught by a unit test |

Defects this method and the reviews brought to light:

| Found | Fixed by |
|---|---|
| User ids and profile ids were the same numbers in the tests, so a mix-up could not fail | ids of accounts start at 1000, profile ids at 1 |
| A second withdrawal from an event was not detected by any integration test | test `refuses a second withdrawal…` added to the events suite |
| The self-moderation rule was hidden behind the moderator-versus-moderator rule | each refusal is checked by its message |
| Two places tests passed for the wrong reason (a 5xx answer rejected because of its empty body; a text answer iterated letter by letter) | tests rewritten so that only the status, or only the shape, can make them fail |
| Moderation audit written outside the transaction, non-conditional status updates | corrected in #118 after review |

## 5. What is not tested, or only partly

Stated plainly, so nothing is overstated at the presentation:

- **No browser end-to-end tests.** The front end is tested with Vitest and a replaced API layer, so these tests do not prove that the interface and the real API agree. That was checked by hand (pages walked with the seeded accounts) and by the scripted demos; the pull request that connects the front end to the real API (#125) was still open and under review when this was written.
- **No load or performance tests.** Concurrency is tested with a handful of simultaneous requests (six members for one place, two moderators, two first messages), not with real traffic.
- **Expired sessions** are checked by hand (a token signed with a past expiry gets 401), and forged cookies by automated tests; there is no automated test with an expired token.
- **Security headers (helmet) and CORS** are checked by hand only: the integration harness builds the application without them.
- **The rate limit** (5 login or registration attempts per minute, then 429) is covered by a unit test of its constants and a manual run, not by an integration test.
- **The real external API** is never called by a test; the live behaviour was checked by hand on 2026-10-21.
- **Swagger** (`/v1/docs`) is checked by eye, not by a test.
- **Accessibility** is checked automatically on the main views and by hand for keyboard use and text size; no screen reader session is recorded here.
- **The sabotage checks** are manual and are not run again by the continuous integration workflow.

## 6. Reading the results again

Everything above can be reproduced with the commands of section 1 on a blank database. The counts of a suite can be listed with `npx jest --config test/jest-integration.json --runInBand --verbose`.

## 7. Front end screens added after this run

The moderation screens (`ModerationView`), the legal and privacy page (`PrivacyView`) and the connection of the front end to the API (services tested by mocking `fetch`) are covered by the 188 front-end tests above, including an automated accessibility check (axe) on the moderation and privacy pages. Two parts of the front end remain simulated or local because the API has no route for them: the list of people present at an event and the saved contacts (see the README, "Known limitations").
