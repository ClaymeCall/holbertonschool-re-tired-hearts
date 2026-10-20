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
