# Contributing

Team workflow conventions: issue tracking, local setup, branch naming, commit messages, and recreating a blank database.

## Working with issues and the Project dashboard

All work is tracked as GitHub issues on the **ReTired Hearts** [Project dashboard](https://github.com/users/ClaymeCall/projects/6). Each issue carries a `Status` (`Backlog` → `Ready` → `In progress` → `In review` → `Done`), a `Priority` (`P0`/`P1`/`P2`) and a `Size`; move the issue's status as you pick it up and as the PR progresses.

Pick an issue, assign yourself, and start a branch **directly from the issue panel**: open the issue, use the "Create a branch" action under the *Development* section. GitHub generates the branch name from the issue number and title and links the branch (and later its PR) back to the issue automatically, so the issue closes when the PR merges.

## Local setup

See the root [`README.md`](../README.md#running-the-dev-environment) for prerequisites and Docker Compose commands. In short: copy `.env.example` to `.env`, then `docker compose up --build`.

## Branch naming

`<issue-number>-<short-kebab-case-description>`

This is the name GitHub's "Create a branch" (from the issue panel) generates automatically from the issue title — don't rename it by hand.

Examples from this repo:
- `20-design-entities-user-profile-interest-event-conversation-etc`
- `29-vue-structure-tools`

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`

- `type` — one of `feat`, `fix`, `docs`, `build`, `test`, `refactor`, `chore`.
- `scope` — optional, typically `frontend` or `backend` when the change is specific to one.
- `subject` — short, imperative, lowercase.

Examples from this repo's history:
```
docs: add ERD
docs(frontend): document structure and tooling choices
feat(frontend): add router, home view and api client with tests
build(frontend): add vue-router, pinia and vitest tooling
```

## Recreating a blank database

No migration/ORM tooling exists yet, so the database is reset by dropping and recreating the Postgres volume:

```bash
docker compose down -v   # stops services and removes db_data
docker compose up --build
```

Postgres reinitializes using `POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD` from `.env` (see `docker-compose.yml`).

This procedure is temporary — once versioned migrations and seed data are added, this section should be updated to describe the migrate/reset/seed commands instead.
