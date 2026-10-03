<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BizFlow AI Persistent Project Context

This file is the source of truth for product direction, architecture, completed work, current phase, and recommended next tasks. Before major implementation work, read this file, `README.md`, `prisma/schema.prisma`, and the current source tree. Preserve working functionality and existing user changes. After completing a phase, update this context with the completed work, architecture decisions, schema changes, remaining issues, and recommended next phase.

## Product vision

BizFlow AI is an AI Business Document & Workflow Assistant for SMEs, agencies, freelancers, consultancies, and service businesses. The product is organized around structured business relationships rather than files:

```text
Organization
  Company Profile
  Clients
    Projects
      Documents
      Plans
      Tasks
      Payments
      Reminders
  Templates
  Activity
```

Client and Project are the center of the system. The long-term flow is: natural-language business request → structured client/project data → proposal/quotation/contract → plan/tasks/payments/reminders → project tracking.

## Technology and coding rules

- Next.js 16 App Router, React 19, strict TypeScript, and Tailwind CSS 4.
- Read relevant local Next.js 16 guidance from `node_modules/next/dist/docs/` before using framework APIs.
- Prisma 6 with SQLite is for local development; preserve PostgreSQL/Supabase portability.
- Prisma access is server-only. Server Components perform reads; Server Actions perform mutations.
- Validate all untrusted form and AI data with Zod on the server.
- Scope every database read/write to the authenticated organization returned by `getCurrentOrganization()` and enforce capability roles on every mutation.
- Use transactions for related client/project/activity writes.
- Never expose secrets to Client Components or use `NEXT_PUBLIC_` for provider keys.
- Never create business records directly from AI output. The required flow is parse → validate → normalize → editable review → explicit confirmation → transaction.
- Keep provider SDK code behind `AIProvider`; business workflows must not import vendor SDKs directly.
- Preserve existing working routes and reusable UI patterns. Avoid dead buttons or claims that unfinished modules work.
- Run Prisma validation, lint, typecheck, and build before completing a phase.

## Architecture

- `src/app/`: routes and Server Actions.
- `src/components/`: client forms, workspace UI, layout, and reusable UI primitives.
- `src/lib/prisma.ts`: development-safe Prisma singleton.
- `src/lib/organization.ts`: authenticated membership resolution, demo fallback, and role capabilities.
- `src/lib/supabase/` and `src/proxy.ts`: Supabase SSR clients, verified claims, and session cookie refresh.
- `src/services/ai/provider.ts`: provider-neutral AI contract.
- `src/services/ai/provider-factory.ts`: active provider selection.
- `src/services/ai/gemini-provider.ts`: server-only Google Gemini SDK integration.
- `src/services/ai/business-request-schema.ts`: JSON response schema, Zod schemas, and confirmation validation.
- `src/services/ai/business-request.ts`: extraction, safe parsing, Zod validation, normalization, and one repair attempt.
- `src/services/ai/client-matching.ts`: organization-scoped possible-duplicate detection.
- `src/app/ai-workspace/actions.ts`: extraction-without-writes and confirmed transactional creation.
- `src/services/execution/`: deterministic plan previews and Phase 4 validation.
- `src/app/execution/actions.ts`: plan activation, task progress rollups, payment updates, and reminder mutations.

## Completed phases

### Phase 1 — Foundation (complete)

- Responsive SaaS shell, sidebar, topbar, global search, mobile navigation, and error/loading states.
- Database-backed dashboard with metrics, recent projects, attention signals, quick actions, and activity.
- Client search/filter/create/read/edit and client detail with projects/activity.
- Project search/filter/create/read and project detail with Overview and Activity functionality.
- Editable company profile.
- Placeholder routes for AI Workspace, Documents, Templates, Tasks, Plan, and Payments.
- Seeded demo organization, four clients, six projects, and activity history.
- Provider-neutral AI interface prepared without an API integration.

### Phase 2 — AI Workspace + Gemini (complete)

- Official `@google/genai` SDK integrated server-side through `AIProvider`.
- Gemini model: `gemini-3.8-flash`; provider key is read only from `GEMINI_API_KEY`.
- Real `/ai-workspace` input with Vietnamese/English examples, loading, configuration, validation, API, and retry errors.
- Gemini structured JSON response schema covering client, project, financials, KPI, missing fields, and suggested documents.
- Defensive JSON parsing, Zod validation, deterministic normalization, derived totals/end dates, and at most one repair request.
- Editable review UI with Client Information, Project Information, Financial Information, KPI, Missing Information, and Suggested Documents.
- No extraction writes to the database. Records are created only after explicit “Create Client & Project” confirmation.
- Possible duplicate clients are matched by normalized company identity or tax code. Users can select an existing client or explicitly create a new one; edits are checked again at confirmation time.
- Confirmed creation is one transaction covering optional client creation, project creation, and activity entries.
- AI source request, provider/model provenance, monthly fee, duration, and document suggestions are persisted on the Project for future phases.
- Project Overview displays AI source/financial context; Documents displays saved suggestions without generating documents.

### Phase 3 — Documents + Templates (complete)

- Organization-scoped `Template`, `Document`, and `DocumentVersion` models with project/client relationships, immutable version history, status workflows, and audit activity.
- Starter proposal, quotation, and service-contract templates are installed for existing organizations by migration and recreated by the demo seed.
- Template creation and edits produce current versioned records while historical versions remain immutable.
- Project-linked document drafts are generated deterministically from validated structured templates and trusted company, client, and project data.
- Document edits create immutable structured versions and reset the current document to Draft for renewed review.
- Explicit Draft → In Review → Approved workflow records the reviewer and approval time; further edits revoke the previous approval.
- DOCX and PDF exports are available only for the approved current version. Rendering remains provider-neutral and blocks external URL access.
- Saved AI document suggestions now link to preselected, editable document creation without creating or approving records automatically.
- Documents and Templates have searchable/list/detail/create workflows, project integration, dashboard activity, and organization-scoped server validation.

### Phase 4 — Project Execution (complete)

- Organization-scoped `Plan`, `PlanItem`, `Task`, `PaymentMilestone`, and `Reminder` models linked to Client and Project.
- Project plan previews are generated deterministically from the latest approved document when available, otherwise from trusted project context.
- Plans remain fully editable drafts with milestone owners, dates, priorities, descriptions, and payment percentages until explicit activation.
- Activation is one transaction that claims the draft once, creates tasks, payment milestones, and due-date reminders, and moves eligible projects into Active status.
- Task status updates synchronize plan-item status and recalculate project progress from non-cancelled tasks.
- Payment milestones support Scheduled, Invoiced, Paid, Overdue, and Waived states with invoice references and currency-safe portfolio summaries.
- In-app reminders support task, payment, milestone, and manual follow-ups with completion/dismissal status.
- `/tasks`, `/payments`, and `/reminders` provide portfolio views; project tabs provide plan editing and project-scoped execution workflows.
- Dashboard execution signals surface overdue tasks, outstanding payment counts, open reminders, and task-level attention items.
- Seed data includes one active execution plan and one editable draft plan for immediate workflow testing.

### Phase 5 — Authentication + Production Multi-tenancy (complete in code)

- Supabase SSR authentication uses `@supabase/ssr`, verified claims, cookie refresh in Next.js 16 `src/proxy.ts`, and login/sign-up/callback/sign-out routes.
- Auth is optional only for local demo mode: omitting both public Supabase variables resolves the seeded organization and owner; configuring them requires an authenticated active membership.
- `User` and `OrganizationMembership` model invitation, active, and suspended access with owner, admin, manager, finance, reviewer, and member roles.
- Invited emails can activate an account through Supabase; the verified Auth user ID is linked server-side and the invitation becomes active.
- Owners/admins manage invitations, roles, and statuses at `/settings/members`; administrators cannot assign or modify owners, and users cannot alter their own membership.
- Server Actions enforce capability-specific roles in addition to organization ownership: workspace editors, document reviewers, finance users, member administrators, and standard members.
- The application shell shows the authenticated user/workspace, hides administrative navigation and creation UI when unauthorized, and supports sign-out.
- SQLite remains canonical for local development. `scripts/prepare-postgres-schema.mjs` produces the PostgreSQL schema, while `prisma.postgresql.config.ts` and `prisma/migrations-postgresql` provide an isolated Supabase deployment path.
- The PostgreSQL baseline enables deny-by-default RLS on all Prisma-managed public tables. Browser Supabase clients are used for Auth only; business data remains server-side through Prisma.
- `prisma/bootstrap.ts` safely initializes the first production organization and owner invitation without running the destructive demo seed.
- Production auth now fails closed: partial Supabase configuration or missing production auth never falls back to demo access. Explicit `BIZFLOW_DEMO_MODE=true` is required for production-like demo runs and cannot be combined with Supabase Auth.
- Demo mode requires a real seeded active owner membership; no synthetic owner fallback can hide a broken seed or membership state.
- Gemini extraction requires a workspace-editor role before making the provider request, protecting provider quota as well as database writes.
- Security tests cover auth-mode configuration, the complete role matrix, membership administration boundaries, and RLS coverage for every PostgreSQL model.
- A production HTTP tenant-isolation test creates a temporary second organization and verifies list, search, member, detail, edit, and export isolation before removing all test records.

## AI architecture

```text
User input
  → server-only Gemini provider
  → schema-constrained JSON
  → safe JSON parsing
  → Zod validation
  → one repair attempt when invalid
  → normalization and derived values
  → editable review + duplicate warning
  → explicit user confirmation
  → server-side revalidation
  → Prisma transaction
```

Gemini output is never trusted directly. Hidden form values are also untrusted: confirmation validates all fields again, rechecks organization ownership and client matches, and assigns provider/model provenance from server constants.

## Environment requirements

- `DATABASE_URL`: local Prisma database, normally `file:./dev.db`.
- `GEMINI_API_KEY`: server-only Gemini Developer API key. It belongs in local `.env` and deployment secret storage. Never commit a real key.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: both are required to enable Supabase Auth; omit both for local demo mode.
- `BIZFLOW_ORGANIZATION_NAME` and `BIZFLOW_BOOTSTRAP_OWNER_EMAIL`: initial production workspace bootstrap values.
- `DIRECT_URL`: direct PostgreSQL connection used for production migrations; deployed runtime `DATABASE_URL` should use the Supabase session pooler.
- `BIZFLOW_DEMO_MODE`: optional locally; must be explicitly `true` for a production-mode demo and must be absent when Supabase Auth is configured.

The app and Phase 1 features can run without `GEMINI_API_KEY`; AI extraction shows a clear configuration state until it is supplied.

## Database state and migrations

Core models: `Organization`, `User`, `OrganizationMembership`, `CompanyProfile`, `Client`, `Project`, `Template`, `Document`, `DocumentVersion`, `Plan`, `PlanItem`, `Task`, `PaymentMilestone`, `Reminder`, and `Activity`.

Phase 2 migration: `20260930043126_phase2_ai_workspace`.

Phase 2 added these Project fields:

- `monthlyFee Decimal?`
- `durationMonths Int?`
- `sourceRequest String?`
- `createdWithAi Boolean`
- `aiProvider String?`
- `aiModel String?`
- `suggestedDocuments Json?`

Phase 2 also added the `ai_workflow_created` activity type; document records were introduced later in Phase 3.

Phase 3 migrations:

- `20260930045941_phase3_documents_templates`
- `20260930051500_phase3_template_metadata_and_starters`

Phase 3 added document/template enums, normalized models, immutable structured content versions, approval metadata, starter templates, and template/document activity types.

Phase 4 migration:

- `20261001015504_phase4_project_execution`

Phase 4 added plan/task/payment/reminder enums and models, project execution relations, progress rollups, due-date indexes, and execution audit activity types.

Phase 5 local migration:

- `20261001084500_phase5_membership_auth`

Phase 5 adds membership roles/statuses, users, organization memberships, auth identity linking, and membership indexes. PostgreSQL has a separate full baseline at `prisma/migrations-postgresql/20261001093000_baseline` because SQLite migration SQL is not portable.

## Current phase

Phase 5 is complete and verified locally and against a live Supabase staging database. The staging owner is activated and linked to Supabase Auth. A full authenticated browser walkthrough and live Gemini verification remain manual steps; do not start Phase 6 until they are complete or explicitly deferred.

Verification refreshed on 2026-10-01 after resuming the interrupted work:

- Continued the original checkout at D:\BizFlow AI; existing changes were preserved. No new project or replacement repository was created.
- Project editing is complete at /projects/[id]/edit with a role-gated detail-page button, validated transactional update and project_updated activity. Client reassignment is rejected, archived parent clients remain visible, and editing cannot overwrite task-derived progress.
- Fixed the suspended-owner reinvitation path: administrators cannot use invitations to modify owners or themselves. Existing linked Auth users activate only invited memberships after verified matching email; suspended memberships are not automatically reactivated.
- Removed automatic runtime owner provisioning. Initial production access comes from db:bootstrap and verified invitations only.
- Bootstrap matches the configured workspace, rejects ambiguity or unrelated existing workspaces, preserves current role/status, and refuses silent promotion of existing members.
- Demo seed rejects non-SQLite URLs before deleting any records. Seed was exercised only against the disposable phase5-verification.db, never against live PostgreSQL or the original local database.
- Prisma format and validation passed for SQLite and PostgreSQL. Original dev.db has six applied migrations and no schema drift; all six migrations also deploy successfully into the isolated verification database.
- Live PostgreSQL has one applied baseline, matching migration checksum, no schema drift, 15 business tables with RLS and no business-table policies. Read-only SQL checks for anon and authenticated both returned zero visible rows across every business table. Anonymous REST tests also exposed no rows; Auth health returned 200.
- Live data was preserved: 1 organization, 1 user, 1 active owner membership, 1 company profile, 1 client, 1 project, 1 template and 3 activities; no documents or execution records. Owner Auth email is confirmed.
- ESLint, TypeScript and 12 auth/role/RLS/seed/redirect security tests passed. Added test:supabase and test:workflows scripts.
- Production HTTP tenant isolation passed including project edit and document export. Local real-form tests passed for project update, immutable client, task progress, archived client, forged cross-tenant mutation, lower-role mutation, suspended-owner reinvitation denial, draft-export denial, approved PDF/DOCX export and bootstrap idempotence/no promotion/no reactivation.
- Production fail-closed test passed: missing Auth redirects to /configuration-error. Supabase production HTTP checks passed for login/signup/access-denied and 19 protected route requests redirecting to /login.
- SQLite and PostgreSQL production builds passed on Next.js 16.3.8, including 30 routes. Latest artifacts: .next-phase5-demo and .next-phase5-verified. The live-configured application is restarted on port 3002 with the verified PostgreSQL build.
- Database/Auth/bootstrap env variables exist only in Git-ignored .env. GEMINI_API_KEY is now configured. Minimal live text/JSON requests passed; full extraction is pending due to provider HTTP 503 high-demand responses.
- npm audit still reports three high advisories in prisma, @prisma/config and deepmerge-ts. Its proposed fix is a downgrade to Prisma 6.12.0; no forced downgrade or unsupported override was applied.

## Remaining limitations and issues

- Supabase PostgreSQL and owner activation are live-tested. A complete authenticated owner browser walkthrough, lower-role denial test, and approved-document export still require an authenticated test session.
- Invitation delivery is manual; there is no transactional email integration or service-role admin provisioning.
- The UI currently resolves the first active organization membership and does not yet offer an organization switcher.
- AI extraction requires the user to provide a valid Gemini API key and is subject to provider quotas/network availability.
- Duplicate matching is advisory normalization, not a database uniqueness constraint.
- No e-signature, external approval portal, email delivery, or document deletion/archive controls.
- Document templates and exports are Vietnamese-first and use a fixed business layout without branding/logo customization.
- Plans become immutable after activation; task owner/date editing and plan revision workflows are not included yet.
- Reminders are in-app only; there is no email, calendar, push, or background notification delivery.
- Activated plans and existing documents/payment milestones remain snapshots when project commercial values change; plan revision and automatic financial rescheduling are not implemented.
- npm audit reports three high-severity advisories in the Prisma 6 toolchain. Remediation requires a separately verified dependency change; no forced downgrade was applied.
- Supabase public tables intentionally have no browser RLS policies because all business access is server-side Prisma; adding direct browser data access requires explicit tenant policies first.

## Phase 5 staging handoff

Supabase staging database deployment is complete. Current handoff status:

1. Complete: Supabase staging project and local Git-ignored database/Auth configuration.
2. Complete: organization and bootstrap owner configuration with `BIZFLOW_DEMO_MODE` absent.
3. Complete: PostgreSQL baseline deployment, Prisma client generation, migration-status verification, and idempotent bootstrap. Never run the destructive demo seed against staging or production.
4. Complete: the exact bootstrap owner email has signed up, linked to Supabase Auth, and activated the owner membership. Pending: verify authenticated owner navigation, a denied lower-role mutation, and approved-document export with a real browser session. Automated tenant isolation already passes.
5. Pending: add `GEMINI_API_KEY` as a server-only secret and execute one real extraction/review/confirmation flow. Do not expose this key through a `NEXT_PUBLIC_` variable.

## Recommended Phase 6

Production hardening and operational automation:

1. Run authenticated cross-role and cross-tenant browser integration tests using the activated staging owner. The missing reusable authenticated test session is the current external blocker.
2. Add organization switching and a controlled organization-creation/onboarding workflow for multi-workspace users.
3. Add transactional invitation email, password reset, audit actor IDs, login/security telemetry, rate limits, and centralized error monitoring.
4. Add scheduled background delivery for overdue task/payment reminders through email and calendar integrations.
5. Add backup/restore runbooks, deployment health checks, dependency remediation, and production incident procedures before onboarding real customers.

Final verification note: browser automation could not initialize (sandbox setup refresh error), so no authenticated Supabase browser-session result was claimed. Latest production server on port 3002 passed the public/protected route smoke test; the final read-only Supabase verification also passed.

## Gemini configuration update — 2026-10-01

GEMINI_API_KEY is now configured only in Git-ignored .env. The supplied key successfully accessed gemini-3.8-flash metadata and generated both a minimal text response and a minimal schema-constrained JSON response. Full BizFlow business extraction requests repeatedly received HTTP 503 UNAVAILABLE with the provider message that the model is experiencing high demand; no business records were created. Complete extraction/review/confirmation remains pending a successful full extraction. Authorization is now awaited before any provider request and outside the provider-error catch; 503 has a clear user-facing retry message. Build, lint, typecheck and 12 security tests passed; server restarted on port 3002. Never copy the key into tracked source, documentation or logs.

## User-authorized addition — ChatGPT connection and AI service-contract wizard

User explicitly authorized the proposed Plus connection and contract flow on 2026-10-01. This proceeds without recreating the repository and explicitly defers the previously pending manual Phase 5 walkthrough as a dependency of this requested feature.

- `/settings/ai`: per-BizFlow-user/organization local ChatGPT OAuth connection, saved registration selection, reconnect, disconnect/revocation, account-specific models and Gemini/ChatGPT provider selection.
- `/contracts/new`: individual/company customer inputs, optional birthdate/identity details, service purpose, dates, VND price/payment terms, existing client/template reuse, provider-neutral AI clauses, missing-information questions, preview without writes, explicit confirmation, transactional client/project/document/activity creation and the existing edit/review/approval/export workflow.
- Immutable contract content contains personal-party facts without changing Prisma models. No migration or live seed is needed. New previews create linked projects. Automatic customer delivery and e-signatures remain outside this implementation.
- `BIZFLOW_CHATGPT_LOCAL=true` enables only a personal local runtime; bind Next to 127.0.0.1. `BIZFLOW_AI_SECRET` is a persistent 32-byte hex encryption/HMAC key in Git-ignored .env. Never expose it to a Client Component or log OAuth credentials/URLs. `.bizflow-ai/` is Git-ignored, encrypted and scoped by SHA-256 of organization/user IDs; protect this directory and .env with the user's OS permissions.
- OAuth follows the official dynamic-agent registration flow, PKCE/state/nonce, 127.0.0.1 ephemeral listener, issued-client retention, RS256/JWKS issuer/audience/expiry/nonce/subject verification, plan-scope checks, token refresh serialized via per-scope file lock and remote revocation. Reconnect retains registration identity; each newly added account retains its own profile.
- ChatGPTProvider stays behind AIProvider. Business extraction awaits provider selection; review provenance is signed and no longer hardcodes Gemini. ChatGPT Responses requests use store:false/stream:true and discovered model slugs; no backend-api endpoints or API-cost fallback. Successful output requires response.completed.
- AI contract clauses cannot replace server-generated parties, commercial terms or line items. Confirmations require a 30-minute organization/user-bound signed preview, revalidation, live company/template/client checks and unique document reference for repeat-submission idempotence.
- New `test:ai` suite covers encryption, signing scopes/expiry, registration identity, OIDC, stream completion/failure/UTF-8, dates and fixed contract facts. No real ChatGPT sign-in/generation is claimed before user consent.

Verification for the user-authorized AI addition passed on 2026-10-01: formatting, lint, typecheck, SQLite and PostgreSQL production builds (32 routes), 12 existing security tests, 8 new AI tests, real-action AI contract fixture confirmation/approval/PDF/DOCX exports, existing local workflows and tenant isolation. Latest local runtime on port 3002 is `.next-ai-verified`, bound to 127.0.0.1 with the restored PostgreSQL Prisma client. Live Supabase read-only verification passed with all original counts unchanged (no documents created). The disposable SQLite test server is stopped. `.bizflow-ai` has restricted Windows ACLs for the current user and SYSTEM.

Remaining user steps: the existing live company profile has no address, representative or tax code; supply the actual company details in `/settings/company`. Then connect ChatGPT and approve plan usage at `/settings/ai`, select and save an available model. Actual Plus OAuth consent, account eligibility, model discovery and first real inference remain unverified until that interaction. No OpenAI API key or automatic billable API fallback was configured. The existing Prisma-toolchain audit advisories remain open.

## Submit-button correction — 2026-10-02

Fixed the user-reported inert Continue with ChatGPT button. Shared Button defaults to type=button; all new settings-AI and contract-wizard form submission controls now explicitly use type=submit. The primary connection control reuses FormSubmit with immediate pending feedback. Existing HTTP tests had posted forms directly and missed the inert UI; test:ai:workflows now asserts real rendered submit controls on connection, settings-save and contract-generation forms before testing actions. Disposable SQLite workflow passed again, including OAuth redirect/state/denial and contract approval/exports. No live business data was mutated.

## Contract completion assistant — 2026-10-02

- `/contracts/new` provides a free-form, multi-turn contract chat. A user can paste one complete instruction, ask AI to finish or revise the whole draft, and immediately see the updated contract plus a concise explanation of the changes.
- Each turn opens the current 30-minute organization/user-bound signed ticket, sends only the authoritative current contract and the new message to the provider, validates the full structured response, and seals a new ticket. Server-generated party and commercial facts remain immutable through chat.
- When a request concerns identity, dates, scope, price or payment fields, AI returns a specific manual-change instruction and the interface links directly to the relevant input. AI can apply balanced defaults to mutable clauses and keep only decisions that truly require human judgment as warnings.
- A save ticket is now issued even when AI has warnings. An authorized employee may explicitly accept the remaining warnings and save the draft after review; unresolved warnings and the override are recorded in the immutable version note. Normal confirmation, live company/template/client checks and the transaction remain required.
- Validation passed: lint, typecheck, SQLite and PostgreSQL Prisma validation, SQLite and PostgreSQL production builds, 12 security tests, 13 AI/draft tests, the real Server Action confirmation/approval/export workflow, and actual React wizard verification in Edge for free-form chat, revised preview, manual-field navigation and human override. Mocked browser AI did not mutate live data.
- Latest production runtime artifact: `.next-contract-chat-verified`, bound to `127.0.0.1:3002` after restart.

## Contract input autosave — 2026-10-02

- Added browser-local autosave for `/contracts/new` input fields, including individual-party details, service scope, dates, price, payment terms, requirements and client/template selections. Controlled inputs preserve entered data after a preview action fails or React resets the form.
- Storage keys are scoped to the current authenticated organization and user. Restoration validates a versioned Zod schema and drops unavailable client/template selections. Form controls remain disabled until restoration finishes.
- Shows saved/restored/storage-error feedback and an explicit clear button. The draft remains on this browser until cleared; it is not synced between devices. AI output/tickets and confirmation/duplicate acknowledgements are never persisted. Database creation still requires the existing explicit server-validated confirmation.
- SQLite/PostgreSQL Prisma validation, lint, typecheck, production PostgreSQL build and existing 12 security/8 AI tests passed. Three new draft tests cover incomplete/personal inputs, corrupt/oversized storage and exclusion of consent/tickets.
- Real Edge headless UI verification exercised the actual React wizard with mock AI actions: reload restoration, personal fields, client/template reuse, account scoping, consent reset, failed preview retention, clear and storage failures. No real provider calls or live business mutations were made. Fixture: `reports/verify-autosave-browser.mjs` (uses bundled Playwright and installed Edge).
- Latest production runtime: `.next-autosave-verified` on 127.0.0.1:3002. Authenticated live workflow and real ChatGPT inference remain user-dependent as previously documented.
