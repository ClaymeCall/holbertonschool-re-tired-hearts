# Re-Tired Hearts

## Description

Re-Tired Hearts is a fictional service created by Happy Retired, a company that supports active people over 60. The platform is designed to make it easier to meet people with similar interests, first online and then in safe local settings.

The target audience may be looking for friendship, companionship, romance or simply new activities after retirement. Many users will value clarity, trust and human-sized interactions more than a large number of complex features. The interface must therefore avoid unnecessary friction, use readable content and make important actions easy to find.

This is an educational full-stack project for a team of two or three students. The expected workload is approximately 35 hours per student during one week. The team must demonstrate its ability to design, build, secure, test, containerize and present a complete MVP with NestJS, Vue.js and PostgreSQL.

### Scenario: A new chapter

Happy Retired has validated the idea but has no reliable product to present to its first community partners. The company wants a focused MVP that lets members create a trustworthy profile, discover local events, register for an activity and continue a conversation privately afterwards.

The team must balance social features with safety. Profile information and messages are personal data. Exact addresses must not be exposed unnecessarily, moderation actions must be protected and users must receive understandable feedback when an account or event is unavailable.

The first release is not expected to provide an advanced matching algorithm, real-time chat, a mobile application or a complete reporting workflow. The priority is a stable foundation that can be explained and extended later.

## Tech stack

- **Backend**: NestJS
- **Frontend**: Vue.js + Tailwind CSS
- **Database**: PostgreSQL
- **Containerization**: Docker Compose

## Project structure

```
.
├── backend/   # NestJS API
├── frontend/  # Vue.js + Tailwind CSS client
└── docker-compose.yml
```

## Running the dev environment

### Prerequisites

- Docker and Docker Compose

### 1. Configure environment variables

Copy the example env file and adjust it if needed:

```bash
cp .env.example .env
```

`DB_HOST_PORT` only needs to change if port `5432` is already used by another service on your machine.

### 2. Start the stack

```bash
docker compose up --build
```

This starts three services, connected on a shared Docker network:

| Service    | URL                     | Notes                                  |
|------------|-------------------------|-----------------------------------------|
| `frontend` | http://localhost:5173   | Vue dev server with hot module reload   |
| `backend`  | http://localhost:3000   | NestJS API with watch mode              |
| `db`       | localhost:5432 (or `DB_HOST_PORT`) | PostgreSQL                   |

The `backend` and `frontend` source directories are bind-mounted into their containers, so code changes on the host are picked up live, no rebuild required. `backend` waits for `db` to report healthy (via a `pg_isready` healthcheck) before starting.

### 3. Run migrations and load demo data

```bash
docker compose exec backend npm run migration:run
docker compose exec backend npm run seed
```

The seed is idempotent and prints each demo account's login (including the initial moderator) at the end — see `docs/contributing.md#recreating-a-blank-database-and-reseeding` for details.


### 4. Stop the stack

```bash
docker compose down
```

Add `-v` to also remove the database volume and start from a clean database on the next run.

## URLs

| What | URL |
|------|-----|
| Web app | http://localhost:5173 |
| API (all routes are under `/v1`) | http://localhost:3000/v1 |
| API documentation (Swagger) | http://localhost:3000/v1/docs |

## Demo accounts

Created by `npm run seed` (step 3). Their state is what the demos rely on.

| Account | Password | State |
|---------|----------|-------|
| `moderator@retired-hearts.demo` | `DemoModerator123!` | moderator, sees the **Modération** page |
| `alice@retired-hearts.demo` | `DemoMember123!` | approved, organizes a published hike |
| `bob@retired-hearts.demo` | `DemoMember123!` | approved, registered to Alice's hike |
| `carol@retired-hearts.demo` | `DemoMember123!` | profile pending moderator approval |
| `dave@retired-hearts.demo` | `DemoMember123!` | approved profile, account suspended (shows the suspended-account restriction) |

The seed also creates more members, so the site feels alive: 16 more at `<first name>@retired-hearts.demo` with the member password (`colette`, `gerard`, `francoise`, `jacques`, `monique`, `henri`, `odile`, `josette`, `michel`, `nicole`, `bernard`, `christiane`, `pierre`, `denise` approved; `simone` and `raymond` pending). In total about 25 members in 17 cities, 34 events, conversations with unread messages, all in French.

## Environment variables

Defined in `.env` (copy `.env.example`). Never commit `.env`.

| Variable | Used by | Purpose |
|----------|---------|---------|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `db`, `backend` | database credentials |
| `DB_HOST_PORT` | `db` | host port for PostgreSQL (change if 5432 is taken) |
| `JWT_SECRET` | `backend` | signs the session cookie, use a long random value outside local dev |
| `CORS_ORIGIN` | `backend` | front-end origin(s) allowed to send credentialed requests |
| `VITE_API_URL` | `frontend` | API base URL (defaults to `http://localhost:3000`) |

## Tests

```bash
docker compose exec backend npm test                  # unit tests (Jest)
docker compose exec backend npm run test:integration  # real HTTP requests against a PostgreSQL test database
docker compose exec frontend npx vitest run           # front end (Vitest + Vue Test Utils)
docker compose exec frontend npx vite build           # production build
```

The integration tests use a separate database named `<POSTGRES_DB>_test`, created on first use: your development data is never touched. Commands, results and known gaps are recorded in `docs/test-results.md`.

## Reset to a clean state

```bash
docker compose down -v          # removes the database volume
docker compose up --build -d
docker compose exec backend npm run migration:run
docker compose exec backend npm run seed
```

More detail in `docs/contributing.md#recreating-a-blank-database-and-reseeding`.

## Demo scripts

Scripted walks through the API with `curl`, run from your machine against the running and seeded stack:

```bash
cd backend
npm run demo:phase1   # anonymous request, invalid login, profile edit, discovery
npm run demo:phase2   # event lifecycle: draft, publication, full event, withdrawal, cancellation
npm run demo:phase3   # messaging: empty, invalid, successful and refused scenarios
npm run demo:phase4   # validation errors, forbidden actions, moderation actions and audit log
```

`demo:phase3` creates a new member at each run, and a re-seed does not restore data changed by a demo (for example Alice's bio): run the reset above before the live demonstration.

Login is rate-limited (5 per minute): wait a minute between two demo scripts.

## Known limitations

- The location is free text (a city or region): no distance search. Suggestions come from `geo.api.gouv.fr`; typing by hand always works.
- Messages are fetched regularly: there is no real-time chat.
- The list of people present at an event is simulated in the front end (drawn from real profiles): the API has no route for it yet.
- Saved contacts are kept in the browser, per account: the API has no route for them.
- No self-service password reset: see `docs/api-conventions.md` for the documented procedure.
- No advanced matching, no mobile application, no complete reporting workflow.
