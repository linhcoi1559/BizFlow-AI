# BizFlow AI

BizFlow AI is an AI Business Document & Workflow Assistant for agencies, consultancies, freelancers, SMEs, and service businesses. It is organized around **clients and projects**, not files: documents, plans, tasks, payments, reminders, and activity attach to the business context that created them.

Phase 1 through Phase 5 are implemented. Local development remains zero-config with SQLite and a demo workspace; production can use PostgreSQL/Supabase with SSR authentication and organization roles.

The application interface is Vietnamese-first, including authentication, navigation, validation, activity, generated plans, starter document templates, and DOCX/PDF export labels.

## Current features

### Phase 1 foundation

- Responsive SaaS shell with sidebar, top navigation, global search, mobile navigation, activity, and user menu
- Live dashboard metrics, recent projects, attention signals, quick actions, and recent activity
- Client search/filter/create/detail/edit workflows
- Project search/status/client filters, creation, role-gated editing, and central project workspace
- Project Overview, Activity, and polished future-module states
- Editable company profile
- SQLite demo database with realistic Vietnamese agency data
- Server-side Zod validation, transactional activity logging, and organization-scoped writes

### Phase 2 AI Workspace

- Real `/ai-workspace` powered by Google Gemini
- Vietnamese and English natural-language business request extraction
- Structured client, project, financial, KPI, missing-information, and document-suggestion output
- Safe JSON parsing, Zod validation, normalization, and one repair attempt
- Editable review screen before any database write
- Possible duplicate-client warnings with existing-client selection
- Transactional client/project/activity creation after explicit confirmation
- Persisted AI source request, provider/model provenance, monthly fee, duration, and suggested documents
- Project Overview and Documents surfaces for the persisted AI context

### Phase 3 Documents and Templates

- Versioned proposal, quotation, contract, and custom templates
- Three starter templates installed for each organization
- Editable structured document drafts generated from company, client, and project data
- Immutable document version history with change notes
- Explicit Draft, In Review, and Approved workflow with audit activity
- DOCX and PDF export of the approved current version
- Project document workspace and creation actions from saved AI suggestions

### Phase 4 Project Execution

- Editable delivery-plan previews generated from approved documents or project context
- Explicit plan activation that transactionally creates tasks, payments, and reminders
- Task ownership, priorities, due dates, status tracking, and automatic project progress rollups
- Payment schedules with invoice references, collection states, overdue signals, and currency-safe summaries
- Automatic task/payment reminders plus manual in-app project reminders
- Portfolio pages for Tasks, Payments, and Reminders
- Project tabs for Plan, Tasks, Payments, and Reminders
- Dashboard execution metrics and overdue attention signals

### Phase 5 Authentication and Multi-tenancy

- Optional Supabase SSR authentication with Next.js 16 `proxy.ts` session refresh
- Invitation-only account activation, sign-in, callback, and sign-out flows
- Organization-scoped `User` and `OrganizationMembership` records
- Owner, admin, manager, finance, reviewer, and member roles enforced in Server Actions
- Member invitation and access management UI for owners and administrators
- SQLite demo fallback when Supabase variables are intentionally omitted
- Separate PostgreSQL schema, baseline migration, and Prisma deployment config
- Deny-by-default Supabase RLS on all Prisma-managed `public` tables

## Technology

- Next.js 16 App Router
- React 19 and strict TypeScript
- Tailwind CSS 4
- Prisma 6 with SQLite locally and PostgreSQL/Supabase in production
- Supabase SSR authentication (`@supabase/ssr`, `@supabase/supabase-js`)
- Zod 4 validation
- Google Gen AI SDK (`@google/genai`)
- Lucide icons
- Server Components for reads and Server Actions for mutations

## Environment variables

Copy `.env.example` to `.env` and keep real secrets out of Git:

```env
DATABASE_URL="file:./dev.db"
BIZFLOW_DEMO_MODE="true"
# GEMINI_API_KEY="your-real-server-side-key"
```

- `DATABASE_URL` points Prisma to the local SQLite database.
- `GEMINI_API_KEY` is used only by the server-side Gemini provider. It is never exposed with a `NEXT_PUBLIC_` variable or returned to the browser.
- Local development defaults to demo mode; `BIZFLOW_DEMO_MODE=true` is required for an explicit production-like demo deployment.
- Set both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in staging/production and remove `BIZFLOW_DEMO_MODE`. Partial or missing production auth configuration fails closed at `/configuration-error`.
- `BIZFLOW_BOOTSTRAP_OWNER_EMAIL` and `BIZFLOW_ORGANIZATION_NAME` initialize the first production workspace.
- Without a Gemini key, all Phase 1 functionality still works and AI Workspace displays setup guidance.

See [Supabase deployment](docs/deployment-supabase.md) for PostgreSQL URLs, migrations, Auth redirect settings, bootstrap, and deployment order.
The guide also explains why existing SQLite migrations cannot be replayed on PostgreSQL and how to handle any local data that must be retained.

## Local setup

Requirements: Node.js 20.9+ and npm. Node.js 22 LTS or newer is recommended.

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3002](http://localhost:3002). The development script uses port `3002` explicitly so local authentication redirects and browser testing remain consistent.

On Windows PowerShell systems that block npm `.ps1` shims, use `npm.cmd` and `npx.cmd`.

## Useful commands

```bash
npm run dev          # Start local development
npm run lint         # ESLint
npm run typecheck    # TypeScript without emitting files
npm run build        # Production build
npm run test:security # Auth-mode, roles, RLS, seed safety, and safe redirects
npm run test:supabase # Read-only checks against the configured Supabase database/Auth
npm run test:tenant   # Production HTTP tenant-isolation smoke test (SQLite only, after build)
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Create/apply a development migration
npm run db:seed      # Reset and populate demo data
npm run db:bootstrap # Create the initial production organization/owner invitation
npm run db:studio    # Open Prisma Studio
npm run db:postgres:generate # Generate Prisma Client for PostgreSQL
npm run db:postgres:deploy   # Apply PostgreSQL production migrations
```

The local database is `prisma/dev.db` and is ignored by Git. Migrations and the seed script are committed so the database can be recreated.

## AI request lifecycle

```text
User input
→ server-only Gemini call
→ schema-constrained JSON
→ safe parse
→ Zod validation
→ normalization
→ editable review and duplicate warning
→ user confirmation
→ server validation
→ Prisma transaction
→ project detail
```

Gemini never writes directly to the database. Invalid JSON or schema output receives one repair attempt; persistent failure returns a clear user-facing error.

## Architecture

```text
prisma/                         schema, migrations, realistic seed
src/app/                        routes and Server Actions
src/app/ai-workspace/           extraction/confirmation actions and state
src/components/ai/              AI input and editable review UI
src/components/layout/          responsive application shell
src/components/ui/              reusable UI primitives and feedback
src/lib/                        Prisma, organization context, validation, utilities
src/lib/supabase/               browser/server clients and proxy session refresh
src/services/documents/         structured templates, deterministic drafts, and DOCX/PDF rendering
src/services/execution/         plan preview generation and execution validation
src/app/execution/actions.ts    plan activation, task, payment, and reminder mutations
src/services/ai/provider.ts     provider-neutral contract
src/services/ai/gemini-provider.ts
src/services/ai/business-request-schema.ts
src/services/ai/business-request.ts
src/services/ai/client-matching.ts
```

`getCurrentOrganization()` resolves the authenticated user's active organization membership when Supabase is configured and falls back to the seeded workspace only in explicit demo mode. Prisma remains server-only. Mutations validate input, verify organization ownership and role, write related data in transactions, and revalidate affected routes.

Production authentication is fail-closed: an incomplete Supabase configuration never falls back to demo access. Gemini extraction also requires a workspace editor role before the provider call, preventing unauthorized quota use.

## Demo workspace

- Organization: BizFlow Agency Mẫu
- Demo owner: Minh Nguyen (`minh@bizflow.demo`)
- Company profile: BizFlow Marketing Việt Nam, tax code `0101234567`, Hà Nội, Việt Nam
- Clients: Nova Beauty JSC, GreenHub Vietnam, TechVision Solutions, Aurora Education
- Six seeded projects and activity history

Re-running `npm run db:seed` resets local demo records.

## Roadmap

- **Phase 1 — complete:** Dashboard, clients, projects, company profile, activity, and local foundation
- **Phase 2 — complete:** Gemini AI Workspace, structured extraction, review, duplicate handling, and confirmed transactional creation
- **Phase 3 — complete:** Documents, proposals, quotations, contracts, templates, immutable versioning, approval, and export
- **Phase 4 — complete:** Plans, tasks, payments, deadlines, reminders, and project progress rollups
- **Phase 5 — complete in code:** PostgreSQL/Supabase deployment path, SSR authentication, invitations, membership roles, authorization, and tenant scoping
- **Phase 6 — next:** Production hardening, background notifications, observability, organization switching, and operational workflows

## Phase 5 verification — 2026-10-01

Both SQLite and PostgreSQL builds, lint, typecheck, 12 security tests, tenant isolation and local workflow HTTP tests passed. The Supabase migration baseline is up to date with no schema drift; all 15 business tables deny anon/authenticated access through RLS. Live checks used read-only transactions and did not reset business data.

Project editing is available from the project detail page for owners, admins and managers. The client remains fixed and task-derived progress is protected. Approved documents, activated plans and existing payment milestones retain their historical values after project edits.

The demo seed now rejects PostgreSQL. Bootstrap preserves membership role/status and selects only the configured workspace. Runtime authentication cannot automatically create an owner.

For local integration verification, use a disposable SQLite database with DATABASE_URL=file:./phase5-verification.db, generate the SQLite client, apply migrations and seed that database. Build with NEXT_DIST_DIR=.next-phase5-demo, BIZFLOW_DEMO_MODE=true and both public Supabase variables empty. Start that build on port 3015, then run npm run test:workflows. Run npm run test:tenant with the same database/build. These tests are separate from the live Supabase configuration; restore the PostgreSQL client before running the live app.

Current app: http://localhost:3002/login, using .next-phase5-verified and PostgreSQL. Full authenticated Supabase owner/role/export walkthrough remains pending a real test session. GEMINI_API_KEY is now configured; minimal live text/JSON checks passed, but full extraction currently receives provider HTTP 503 high-demand errors. npm audit reports three high advisories in the Prisma toolchain; the proposed forced downgrade was not applied.

## ChatGPT plan connection and AI service contracts — 2026-10-01

The existing project now supports personal locally running ChatGPT plan usage through official Sign in with ChatGPT. This is separate from Supabase login and does not read ChatGPT conversations. Availability and limits depend on OpenAI and the connected account. There is no automatic API billing fallback.

1. Sign into BizFlow at http://localhost:3002.
2. Open `/settings/ai`, choose **Continue with ChatGPT**, then sign in and authorize plan usage on OpenAI's page.
3. Back in BizFlow, select an available account-specific model and save the ChatGPT provider selection.
4. Open `/contracts/new`. Enter an individual or business customer, address, optional date of birth/identity information, service scope, dates, total VND price and payment terms. Choose an existing client/template if appropriate.
5. Generate the preview. Paste a complete request into the contract chat to let AI revise the whole draft, explain its changes and point to any structured fields that require manual editing. No business rows are written at this point.
6. Review and explicitly confirm to save an unapproved draft. If AI still shows warnings but an authorized employee finds the draft acceptable, the employee can explicitly accept those warnings and save. Then edit, submit for review and approve through the existing document workflow before exporting Word/PDF for manual delivery.

The wizard is for service contracts. It does not provide e-signature, automatic email/Zalo delivery or arbitrary contract-type support. Each saved preview creates a linked project; selecting an existing client reuses it without changing its client record. Personal details are retained in the immutable contract snapshot and original project input; no Prisma schema or live migration is required.

`BIZFLOW_AI_SECRET` is a persistent server-only random 32-byte hex key, used for encrypted local OAuth records and short-lived signed review receipts. It must be configured even for Gemini review confirmation. `BIZFLOW_CHATGPT_LOCAL=true` explicitly enables the personal local connection flow. Credentials are AES-256-GCM encrypted under Git-ignored `.bizflow-ai/`, scoped by organization and BizFlow user. Keep `.env` and this directory private to the Windows user. Run the local server bound to `127.0.0.1`; do not enable this integration on a publicly hosted/shared server. Changing the encryption key requires reconnecting saved accounts. Stop the server before clearing a stale `.bizflow-ai/<scope>.lock` left by an abrupt process exit.

The connection uses dynamic OAuth registration, a persistent per-user installation host ID, random state/nonce, PKCE, an ephemeral loopback callback listener, verified RS256 OIDC identity, granted plan-use scope, serialized token refresh and remote revocation on disconnect. AI inference uses only the public Responses API with `store:false`, `stream:true`, developer messages and account-discovered model slugs. Partial, failed, incomplete and quota-failed streams never become successful previews. Existing Gemini remains selectable; provider/model provenance is signed by the server instead of hardcoded Gemini values.

`npm run test:ai` verifies credential encryption/tamper rejection, review expiry and tenant/user binding, initial/returning client identity, OIDC signature/issuer/audience/nonce/expiry/subject, completed streams, mid-stream usage failure, split UTF-8, input dates and fixed contractual facts. OAuth sign-in and a real ChatGPT generation still require the user's consent; unit/integration tests do not imply a connected Plus session.

Official references: [registration](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions).

Verification status: format/lint/typecheck and SQLite/PostgreSQL builds passed, with 32 routes. Existing security tests (12), AI tests (8), local tenant/workflow tests and the new `test:ai:workflows` confirmation/approval/export fixture passed. The new workflow test requires the disposable SQLite server on port 3015 and `NEXT_DIST_DIR=.next-ai-demo`; never run it against live PostgreSQL. Live Supabase read-only checks passed with original row counts preserved. Latest local server is `.next-ai-verified` on port 3002, bound to 127.0.0.1. The actual live company profile needs its address, representative and tax details; actual ChatGPT consent/model availability/inference still require user interaction. No real OpenAI inference result is claimed by the fixture tests.

2026-10-02 correction: the connection button and other new AI-form controls now explicitly submit their forms; the connection shows a pending state. Workflow verification now checks the rendered submit controls as well as the Server Action responses. The previous direct-post fixture alone did not catch the default type=button issue.

2026-10-02: `/contracts/new` now automatically saves entered fields on the current browser and restores them when reopened. Drafts are separated by user and organization and remain until **Xóa bản nhập đã lưu** is used. Client/template availability is checked on restoration. AI output and confirmation consent are not saved; creating business records still requires explicit confirmation. Storage failures show a visible message. `npm run test:ai` includes draft validation tests; the actual wizard was also checked in headless Edge with mock AI actions. Latest local build: `.next-autosave-verified`, bound to 127.0.0.1:3002.

The contract wizard now includes a free-form, multi-turn assistant. Users can paste a full instruction and ask AI to revise the complete contract directly; each response updates the preview, explains the changes and identifies exact form fields that need manual edits. Signed user/organization-scoped tickets protect every turn. AI warnings no longer block an authorized employee from saving: the employee must explicitly accept remaining warnings and confirm the draft. Latest verified build: `.next-contract-chat-verified`.
