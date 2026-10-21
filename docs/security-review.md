# Security review and acceptance results

Covers issue **#70** (acceptance plan, executed). The security review itself (risk, impact, mitigation, remaining limitation) is issue **#71** and is added to this same file.

## 1. Acceptance plan: scenarios, expected and actual results

Executed on **2026-10-21** against the Docker Compose stack, freshly seeded (`npm run migration:run`, `npm run seed`), running the code of `main` as of the afternoon of 2026-10-21 (the automated moderation tests are those of #124, run on that same code).

Two kinds of evidence are used:

- **Test**: an automated test, run with `npm test` (unit, 208 tests) or `npm run test:integration` (real HTTP requests against a PostgreSQL test database: 129 tests on `main`, 187 with #124). The test name is given.
- **Live**: a request played by hand with `curl` against the running API (commands in section 3). Every live check below returned the expected status.

"Actual" is always the observed result; a difference from "expected" would be marked and explained in section 2.

### A. Happy paths

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| A1 | Register with a valid email and password | 201, session cookie, no password hash returned | as expected | Test `Auth API › creates an active member account, starts a session, hides the password hash…` |
| A2 | Log in (email case-insensitive), read my account, log out | 200 with cookie; `/auth/me` 200; after logout the same cookie gets 401 | as expected | Tests `Auth API › logs in with valid credentials…`, `› clears the session so /auth/me stops working…` |
| A3 | Create a profile, then edit it | created as `pending`, updated in place | as expected | Test `Profiles API › creates the profile as pending on first save, then updates it in place` |
| A4 | Event lifecycle: draft, publish, cancel | each step 200, final status `cancelled` | as expected | Test `Events API › lifecycle › goes draft → published → cancelled` |
| A5 | Register to an event, withdraw, register again | one row reused, no duplicate | as expected | Tests `Events API › registrations` |
| A6 | Two authorized members exchange messages | 201 each way, unread counter, history seen from both sides | as expected | Tests `Messaging API › starting a conversation`, `› conversation list and unread counters`; scripted demo `npm run demo:phase3` |
| A7 | A moderator approves a pending profile | 200, profile `approved`, one audit row | as expected | Test `Moderation API › profiles` (#124) |

### B. Invalid data

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| B1 | Register with an invalid email, a password under 8 characters | 400 with the field named | as expected | Live L5; test `Auth API › POST /auth/register` |
| B2 | Register or edit a profile with a forbidden field (`isAdmin`, `moderationStatus`) | 400 `property … should not exist` | as expected | Live L5; `ValidationPipe` with `forbidNonWhitelisted` |
| B3 | Send an empty, blank or over-1,000-character message | 400, nothing stored | as expected | Test `Messaging API › message content`; scripted demo |
| B4 | Malformed JSON body | 400 with a generic message, no stack trace | as expected | Live L7 |
| B5 | Invalid event filters (`page=0`, `limit=51`, `interest=abc`) | 400 | as expected | Test `Events API › listing, filters and pagination › refuses ?%s` |
| B6 | Moderation reason over 500 characters, unknown status filter | 400 | as expected | Test `Moderation API › profiles` (#124) |

### C. Expired, forged and unknown sessions

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| C1 | Request with no cookie | 401 | as expected | Live L1; tests `… › refuses an anonymous request` (auth, profiles, events, messaging, moderation) |
| C2 | Request with an **expired** token | 401 | as expected | Live L1 |
| C3 | Request with a token whose signature was altered | 401 | as expected | Live L1; tests `… › refuses a forged session cookie` |
| C4 | Request with a valid token of an account that does not exist | 401 | as expected | Live L1 |
| C5 | After logout, reuse the same cookie | 401 | as expected | Test `Auth API › POST /auth/logout › clears the session…` |

### D. Forbidden actions

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| D1 | A member edits or publishes someone else's event | 403 (404 for a draft: hidden) | as expected | Test `Events API › permission boundaries › forbids every organizer action to another member…` |
| D2 | The organizer registers to their own event | 403 | as expected | Test `Events API › registrations › forbids the organizer to register for their own event` |
| D3 | A moderator edits or cancels through the **organizer** routes | 403 (must use the audited moderation route) | as expected | Test `Events API › permission boundaries › does not let a moderator edit or cancel through the organizer routes` |
| D4 | A member tries to edit another member's profile | no such route | as expected | Test `Profiles API › PATCH /profiles/me › has no route to edit another member's profile by id` |
| D5 | A member uses a moderation route | 403, nothing changed | as expected | Live L5; tests `Moderation API › access control` (#124) |

### E. Pending and blocked profiles

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| E1 | Pending profile: view and edit own profile, browse events | 200 | as expected | Live L3 |
| E2 | Pending profile: create an event, register to an event, use messaging | 403 | as expected | Live L3; tests `Events API › creation`, `Messaging API › authentication and restricted members` |
| E3 | Pending or blocked profile viewed by another member | 404, same as an unknown id | as expected | Live L4; test `Profiles API › GET /profiles/:id › hides a pending or blocked profile…` |
| E4 | Blocked profile: browse events, messaging, register | 403 | as expected | Live L4; test `Moderation API › profiles › a blocked profile can no longer browse events…` (#124) |
| E5 | Blocked profile: edit own profile | 200 (the member can still fix it) | as expected | Live L4; test `Profiles API › lets a member with a pending or blocked profile keep editing it` |
| E6 | Unblock | access restored (status `approved`) | as expected | Live L4 |

### F. Suspended accounts

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| F1 | Log in, read `GET /auth/me`, log out | 200, 200 (shows `suspended`), 204 | as expected | Live L2; test `Auth API › GET /auth/me › stays reachable for a suspended account…` |
| F2 | Profiles, events, conversations, place suggestions | 403 | as expected | Live L2; tests `Moderation API › accounts › suspends an active account…` (#124), `Places API › refuses a suspended account…` |
| F3 | A suspended moderator uses a moderation route | 403 | as expected | Tests `Moderation API › access control › … refuses a suspended moderator` (#124) |

### G. Unauthorized moderation requests

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| G1 | Anonymous, plain member, suspended moderator on each of the 8 routes | 401 / 403 / 403, nothing changed, no audit row | as expected | Tests `Moderation API › access control on every route` (24 tests, #124) |
| G2 | A moderator acts on their own account or profile, or on another moderator's | 403 with a distinct message, nothing changed | as expected | Tests `Moderation API › accounts › refuses to moderate your own account or another moderator's account`, `› profiles › refuses to moderate your own profile…` (#124) |
| G3 | A disallowed transition (approve an approved profile, suspend a suspended account) | 409, no audit row | as expected | Tests `Moderation API › profiles` (9 transitions) and `› accounts` (#124) |
| G4 | The audit row cannot be written | the action is rolled back (500, state unchanged) | as expected | Tests `Moderation API › consistency under failure and concurrency` (#124) |
| G5 | Two moderators act at the same moment | exactly one succeeds | as expected | Same tests |

### H. Protected conversations

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| H1 | A third member reads a conversation between two others | sees only their own conversations (empty); no route by conversation id (404) | as expected | Tests `Messaging API › privacy boundaries`; scripted demo, scenario 4 |
| H2 | A moderator reads other members' conversations | nothing | as expected | Test `Messaging API › privacy boundaries › gives a moderator no access…` |
| H3 | Write without a shared event, after withdrawing, or to a person who turned messaging off | 403 | as expected | Tests `Messaging API › starting a conversation`, `› privacy switch and restrictions…` |
| H4 | Write to a pending, suspended or unknown profile | 404 (existence not revealed) | as expected | Test `Messaging API › starting a conversation › answers 404 for an unknown person, a pending profile and a suspended recipient` |
| H5 | Send a message with a `sender` field | 400, the sender always comes from the session | as expected | Test `Messaging API › message content › refuses a missing or non-text content, and any extra field…` |
| H6 | Two members write first at the same instant | one conversation | as expected | Test `Messaging API › starting a conversation › creates exactly one conversation when both write first at the same instant` |

### I. Event cancellation

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| I1 | The organizer cancels a published event | 200, status `cancelled` | as expected | Test `Events API › lifecycle` |
| I2 | A cancelled event is visible only to its organizer, a moderator and members with a registration row | others get 404 | as expected | Test `Events API › visibility › shows a cancelled event to its organizer, a moderator and members with a registration row only` |
| I3 | A moderator cancels any published event, through the audited route | 200, one `cancel_event` audit row | as expected | Test `Moderation API › events › cancels a published event of any organizer…` (#124) |
| I4 | Cancel a draft, a cancelled or a completed event | 409, no audit row | as expected | Tests `Moderation API › events › answers 409 for a … event` (#124) |

### J. Abuse protection

| # | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| J1 | More than 5 login or register attempts per minute | 429 on the sixth request in the window; the session of a member already logged in still works | as expected | Live L8, L9; unit test `rate-limit.spec.ts` |
| J2 | Security headers on every response | `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`, no `X-Powered-By` | as expected | Live L6 |
| J3 | Unknown route | 404 with a generic message | as expected | Live L7 |

## 2. Observations from the run

None of these is a failure of an expected result; they feed the security review (#71) and the known limits.

1. **A request with a non-numeric id and no session** (`GET /events/abc`) answers **401**, not 400: authentication is checked before validation. This is the intended order; with a session it answers 400 (test `Events API › visibility`).
2. **The 429 response** reads `ThrottlerException: Too Many Requests`: it names the library. Harmless, but a plain "Too many requests" would reveal less.
3. **Front end** (reviewed in #125, not part of this acceptance run): contacts are kept in the browser without being tied to the account, the event participants are simulated, and an empty optional city makes the profile save fail. They are listed in the review of that pull request.

## 3. How to run it again

```bash
# Automated evidence
docker compose exec backend npm test
docker compose exec backend npm run test:integration

# Scripted demo of the messaging scenarios (needs the stack seeded; 4 of the 5 logins allowed per minute)
cd backend && npm run demo:phase3
```

Live checks (accounts of `backend/src/database/seeds/users.seed.ts`; `BASE=http://localhost:3000/v1`):

- **Log in and keep the cookie**: `curl -s -c jar -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"bob@retired-hearts.demo","password":"DemoMember123!"}'`, then reuse it with `-b jar`.
- **Expired, unknown-account and valid tokens** (L1): sign them with the secret of the running API, for example `docker compose exec backend node -e "const j=require('jsonwebtoken');console.log(j.sign({sub:2},process.env.JWT_SECRET,{expiresIn:-10}))"` (expired), then `curl -H "Cookie: access_token=<token>" $BASE/auth/me`.
- **Blocked profile** (L4): as the moderator, `POST /moderation/profiles/2/block`, check Bob's routes, then `POST /moderation/profiles/2/unblock`.
- **Rate limit** (L8): wait one minute, then send six `POST /auth/login` requests with a wrong password.
- **Headers** (L6): `curl -s -D - -o /dev/null $BASE`.

After the live checks, reseed from a blank database (`docker compose down -v`, then migrations and `npm run seed`): some of them add audit rows.
