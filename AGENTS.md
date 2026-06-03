# AGENTS.md

## Cursor Cloud specific instructions

### Product

Private **Proforma OS** monorepo: Next.js frontend (`apps/frontend`, port 3000) + Express API (`apps/backend`, port 4000) + PostgreSQL.

### Services (local dev)

| Service | Command | URL |
|---------|---------|-----|
| PostgreSQL | `sudo pg_ctlcluster 16 main start` (or `docker compose up -d postgres` if Docker is available) | `localhost:5432`, DB `proforma` |
| API | `npm run dev -w apps/backend` | http://localhost:4000 |
| Web | `npm run dev -w apps/frontend` | http://localhost:3000 |

`npm run dev` at the repo root runs **both workspaces in parallel**; if the API blocks the terminal, start backend and frontend in separate tmux sessions.

### First-time / DB setup

See `README.md`. Short version:

1. `cp .env.example .env` and `cp .env apps/backend/.env` (JWT secrets must be ≥24 characters — use the example values).
2. Ensure Postgres is running and `DATABASE_URL` in `.env` is valid.
3. `npm install` → `npm run prisma:generate` → `npm run prisma:migrate` → `npm run seed`
4. Login: `admin@example.com` / `ChangeMe123!` (from `.env`).

### Standard commands

- Lint/typecheck: `npm run typecheck` (root)
- Migrations: `npm run prisma:migrate` or `npm run prisma:dev -w apps/backend`

### Gotchas

- Prisma CLI reads `DATABASE_URL` from `apps/backend/.env` (copy from repo root `.env`).
- Backend env validation fails if JWT secrets are shorter than 24 characters.
- Without Docker, install/start system PostgreSQL; the update script does not start databases.
