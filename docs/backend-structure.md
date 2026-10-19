# Backend — Structure & Tooling

Phase 0 deliverable covering the backend half of issue **#29** — choose NestJS module structure, DB access layer, migration tool, and testing tools. The frontend half (Vue structure, Pinia, Vitest) is covered separately in [`docs/frontend-structure.md`](frontend-structure.md) (#89).

## Choices

| Topic | Choice |
|---|---|
| Language | TypeScript |
| Framework | NestJS, one module per domain entity |
| DB access layer | TypeORM (`@nestjs/typeorm`) — decorator-based entities, matches NestJS conventions and the entities already defined in `docs/data-model.md` |
| Migrations | TypeORM CLI (versioned migration files, no `synchronize: true` outside local dev) |
| Tests | Jest (NestJS's default test runner), unit tests only — no e2e/HTTP test layer for now |

## Structure

```
backend/src/
├── config/              # env-based configuration (database, app)
├── database/            # TypeORM DataSource + migrations/
├── common/              # shared guards, decorators, filters, pipes
├── users/                # one module per entity from docs/data-model.md
├── profiles/             # each: *.module.ts, *.controller.ts, *.service.ts,
├── interests/            #        *.entity.ts, dto/
├── events/
├── event-registrations/
├── conversations/
├── messages/
├── moderation/
├── app.module.ts
└── main.ts
```

Feature modules (`users/`, `profiles/`, ...) are added incrementally as each entity is implemented (Phase 1+, see `docs/data-model.md`); this doc fixes the convention they follow, not the full set of modules upfront.

## Commands

```bash
npm run start:dev           # dev server (watch mode)
npm run test                 # unit tests (Jest)
npm run migration:generate -- src/database/migrations/<Name>   # generate from entity changes
npm run migration:run
npm run migration:revert
```

DB connection settings are read from `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` (see `docker-compose.yml`).
