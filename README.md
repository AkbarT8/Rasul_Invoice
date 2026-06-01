# Proforma OS

Private Proforma & Order Management application for internal business operations. The project is structured as a production-oriented monorepo with:

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT access/refresh sessions with secure cookies, password hashing, roles, protected routes
- **Exports:** ExcelJS XLSX exports with selected rows/columns, templates, formatting, filters, widths, and saved cell colors

## Applications

```text
apps/
  backend/   Express API, Prisma schema, auth, Excel export, attachments
  frontend/  Next.js private dashboard UI
```

## Local development

1. Copy environment defaults:

   ```bash
   cp .env.example .env
   ```

2. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Generate Prisma client and create tables:

   ```bash
   npm run prisma:generate
   npm run prisma:dev -w apps/backend
   npm run seed
   ```

5. Run both apps:

   ```bash
   npm run dev
   ```

The first screen is `/login`. Seed credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Security model

- Passwords are hashed with bcrypt.
- JWT access tokens are short-lived; refresh tokens are persisted as hashes in `UserSession`.
- Roles are enforced server-side:
  - `ADMIN`: manages clients, dynamic columns, all proformas, deletion, exports.
  - `USER`: sees assigned clients, creates/edits proformas, exports data.
- CSRF protection uses a double-submit token for unsafe methods.
- Helmet, CORS credentials, rate limiting, Prisma parameterization, and Zod validation are enabled.

## Core workflows

- Client management with search, sorting-ready APIs, pagination, notes, assignments, attachments.
- Client workspace hierarchy: Client -> Proformas -> Articles.
- Proforma workspaces with unlimited dynamic columns and virtualized editable rows.
- Spreadsheet-style inline edits, autosave, copy/paste, row selection, duplication, deletion, and cell colors.
- Global search across clients, proformas, notes, and row data.
- XLSX export for all rows, selected rows, and selected columns with Template A/B/C support.

## Deployment

- `netlify.toml` configures the Next.js frontend for Netlify.
- `render.yaml` configures the Express API and PostgreSQL for Render. Railway can use the same `apps/backend` root and environment variables.
- Configure `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`, `DATABASE_URL`, and JWT secrets in the target environment.
