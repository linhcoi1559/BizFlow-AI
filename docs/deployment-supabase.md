# Supabase deployment

BizFlow keeps SQLite for local development and uses a separate generated PostgreSQL schema and migration history for production. Supabase is used for PostgreSQL and Auth; application data is accessed only through server-side Prisma.

## 1. Create and configure Supabase

1. Create a Supabase project.
2. In Auth URL configuration, set the deployed application URL as the Site URL.
3. Add `https://your-domain.example/auth/callback` to the allowed redirect URLs.
4. Keep email confirmation enabled for invitation activation.

## 2. Configure deployment secrets

```env
DATABASE_URL="postgresql://postgres.PROJECT:PASSWORD@POOLER_HOST:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres?sslmode=require"
NEXT_PUBLIC_SUPABASE_URL="https://PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
BIZFLOW_ORGANIZATION_NAME="Your Company"
BIZFLOW_BOOTSTRAP_OWNER_EMAIL="owner@example.com"
GEMINI_API_KEY="optional-server-side-key"
```

- Use the Supabase session pooler on port `5432` for the deployed application's `DATABASE_URL`.
- Prefer a direct database connection for `DIRECT_URL`. Supabase direct endpoints are IPv6-only unless the IPv4 add-on is enabled; on an IPv4-only administrator machine, use the Session pooler on port `5432` for `DIRECT_URL` as well. Never use the Transaction pooler for Prisma migrations.
- Never expose a database password, Gemini key, or Supabase service-role key with `NEXT_PUBLIC_`.
- Do not set `BIZFLOW_DEMO_MODE` in staging or production. BizFlow rejects ambiguous demo + Supabase configuration and redirects incomplete production authentication to `/configuration-error`.

## 3. Deploy the database

Run these commands from a trusted CI job or administrator machine:

```bash
npm ci
npm run db:postgres:deploy
npm run db:postgres:generate
npm run db:bootstrap
```

`db:postgres:deploy` regenerates `prisma/schema.postgresql.prisma` from the canonical local schema and applies the dedicated PostgreSQL migration history. `db:bootstrap` is idempotent: it creates the first organization when the database is empty and pre-authorizes the configured owner email without resetting business data. It resolves the configured workspace name, refuses ambiguous/unrelated workspaces, and never silently promotes or reactivates an existing membership.

Do not run `npm run db:seed` against production. The demo seed intentionally resets local SQLite application records and now refuses PostgreSQL before any deletion.

### Moving from the previous SQLite setup

SQLite and PostgreSQL use separate Prisma migration histories because their generated SQL is not cross-provider compatible. Do not point the SQLite migrations in `prisma/migrations` at Supabase and do not mark them as applied there.

- For the normal Phase 1–5 demo/development database, create a fresh PostgreSQL database with `db:postgres:deploy`, run `db:postgres:generate`, then run `db:bootstrap`. Demo records do not need to be copied.
- If a local SQLite file contains business data that must be retained, back it up first and treat the move as a controlled data import after the PostgreSQL baseline. Preserve IDs and import in dependency order: organization/users/memberships, company profile, clients, projects/templates, documents/versions, plans/items, tasks/payments/reminders, then activity.
- An automated cross-provider data importer is not included in Phase 5. Do not migrate valuable local data with ad-hoc SQL; add and test an explicit ETL script against a disposable Supabase project first.

After the first PostgreSQL deployment, create future production migrations with the PostgreSQL schema/config and commit them under `prisma/migrations-postgresql`. Never regenerate or edit the applied baseline.

## 4. Activate the owner

1. Open `/signup` on the deployed application.
2. Use the exact `BIZFLOW_BOOTSTRAP_OWNER_EMAIL` value.
3. Confirm the Supabase email link.
4. Sign in. BizFlow links the verified Auth identity to the invited local user and activates the membership.

Owners and administrators can then create additional invitations at `/settings/members`. Invitation delivery is manual in this phase: share the `/signup` URL with the invited teammate.

## Security model

- Next.js `proxy.ts` refreshes Supabase cookies and redirects unauthenticated requests.
- Server Components resolve the organization from an active membership; they never accept an organization ID from the browser.
- Every mutation rechecks membership, role, resource ownership, and validated input on the server.
- Supabase RLS is enabled without browser policies on every Prisma-managed `public` table, so `anon` and `authenticated` PostgREST clients cannot query business records directly.
- The server-side Prisma database role is the only application-data path. Do not move business queries into browser Supabase clients without designing explicit tenant RLS policies first.

## Role boundaries

- `owner`: all workspace, member, review, and finance operations.
- `admin`: all operations except assigning or modifying an owner.
- `manager`: clients, projects, templates, documents, plans, tasks, and reminders.
- `finance`: payment updates plus read access.
- `reviewer`: document approvals plus read access.
- `member`: task and reminder updates plus read access.

## Deployment checks

```bash
npm run lint
npm run typecheck
npm run test:security
npm run db:postgres:generate
npm run test:supabase
npm run build
```

For a local production build backed by SQLite, set `BIZFLOW_DEMO_MODE=true` and run `npm run test:tenant` after the build. This test creates a temporary second organization, verifies that list/search/member/detail/edit/export routes do not expose it, and removes all temporary records.

After deployment, verify sign-in, invitation activation, tenant-scoped dashboard reads, a role-denied mutation, and an approved-document export. Live checks require real Supabase credentials and cannot be completed in local demo mode.

`test:supabase` runs PostgreSQL checks in read-only transactions, validates migration checksums and RLS for all 15 models, exercises anon/authenticated database roles, checks confirmed bootstrap-owner activation, and verifies Auth health plus anonymous REST denial. It does not create users or business fixtures. It complements, rather than replaces, a real authenticated owner/role/export session.
