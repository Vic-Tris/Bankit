# Bankit

A production-grade fintech platform for multi-role payment verification and financial visibility. Staff can verify customer payments without exposing sensitive company financial data.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/bankit-web run dev` — run the web app (port 20866, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (access tokens in memory) + refresh tokens (localStorage)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (single source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (users, transactions, transfers, bankAccounts, beneficiaries, auditLogs, receipts)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, users, transactions, transfers, accounts, beneficiaries, reports, tax, audit)
- `artifacts/api-server/src/lib/` — Shared helpers (auth.ts JWT/bcrypt, audit.ts, cplid.ts CPLID generator)
- `artifacts/bankit-web/src/` — React frontend

## Architecture decisions

- JWT access tokens stored in memory (not localStorage) for security; refresh tokens in localStorage
- Role-based field masking: dashboard stats and revenue data are null for sales_rep role, returned only for account_officer/admin
- CPLID format: `BKT-XXXXXXXX` (8 random alphanumeric chars), globally unique, generated at transaction creation
- Public `/api/verify/:cplid` endpoint requires no auth — safe for QR code scanning
- Audit log fires on every sensitive action (login, payment verification, user creation, transfers, role changes, report downloads)

## Product

- **Sales Rep**: Verify payments by CPLID / reference / phone, view own verified transactions, generate receipts. Cannot see balances or revenue.
- **Account Officer**: All of sales rep + revenue reports (daily/weekly/monthly/annual), export reports as JSON.
- **Admin**: Full access — user management, bank account management, fund transfers, tax dashboard, audit logs.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bankit.ng | Admin@123 |
| Account Officer | officer@bankit.ng | Officer@123 |
| Sales Rep | sales@bankit.ng | Sales@123 |

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after changing DB schema files
- bcrypt is installed in `artifacts/api-server` — cannot import it in the code-execution sandbox (use bash instead for hashing)
- `ExportReportQueryParams` in api-zod is the correct name for the export report query schema (not `ExportReportParams`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
