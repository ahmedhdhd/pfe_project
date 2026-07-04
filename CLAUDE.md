# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

TeslaAcademy / QuetzLearn is a multi-tenant LMS split into three independently-run services in one repo:

- `frontend/` — Next.js 15 (App Router, React 19, TypeScript). Multi-tenant UI for Admin, Teacher, and Student roles.
- `backend/` — Express + Prisma + PostgreSQL API (TypeScript). Owns auth, business logic, and the database.
- `ai-service/` — Standalone FastAPI service. Owns *all* LLM/RAG/embeddings/transcription/playground-generation work.

There is no top-level build; each service has its own `package.json`/`requirements.txt` and is run separately. The root `package.json` only proxies Prisma commands (see below).

## Commands

### Backend (`backend/`)
```bash
npm install                    # from backend/
npm run dev                    # ts-node-dev, http://localhost:4000
npm run build                  # tsc -> dist/
npm start                      # run compiled dist/index.js
npm run prisma:push            # push schema to DB (dev)
npm run prisma:migrate         # deploy migrations (prod)
npm run prisma:studio
```
No test runner is configured for the backend.

### Frontend (`frontend/`)
```bash
npm install                    # from frontend/
npm run dev                    # next dev, http://localhost:3000
npm run dev:turbo              # next dev --turbopack
npm run build
npm run lint / npm run lint:fix
npm run type-check             # tsc --noEmit
```
No test runner is configured for the frontend.

### AI service (`ai-service/`)
```bash
cd ai-service
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
pytest                          # run all tests
pytest tests/test_theme_engine.py -k some_test   # single test
```
Requires `ffmpeg` on PATH for video transcription. Needs `DATABASE_URL`/`DIRECT_URL` (same Postgres as the backend) plus `AI_SERVICE_INTERNAL_TOKEN`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`.

### Prisma from repo root
The root `package.json` scripts (`prisma:generate`, `prisma:migrate:deploy`, `prisma:studio`) invoke the backend's local Prisma CLI against `backend/prisma/schema.prisma` using `backend/.env` — useful for running Prisma without `cd`-ing into `backend/`.

### Docker
`docker-compose.yml` at the repo root runs all three services together (backend:4000, frontend:3000, ai-service:8000), with the frontend depending on the backend and the backend depending on ai-service.

## Architecture

### Three-service split and the AI boundary
The backend has **no** LLM/embedding/ffmpeg dependencies — anything AI-related is proxied to `ai-service` over HTTP via `backend/src/utils/ai-service-client.ts`, which calls `ai-service`'s `/internal/v1/*` routes with an `X-Internal-Token` header that must match `AI_SERVICE_INTERNAL_TOKEN` on both sides (checked in `ai-service/app/deps.py`). When adding an AI-adjacent feature, the FastAPI endpoint goes in `ai-service/app/api/routes.py` + `app/services/*.py`, and the Express side just adds a thin proxy call — do not add LLM/RAG logic directly in the Express backend.

### Multi-tenancy
Every organization is scoped by `organizationId`, carried in the JWT payload and enforced in nearly every Prisma query in `backend/src/controllers/*`. There is no separate tenant DB/schema — isolation is row-level via `organizationId`.

On the frontend, `frontend/src/middleware.ts` resolves the tenant purely from the request host/path and rewrites into the `src/app/[client]/...` route tree:
- Known base domains (`teslaacademy.com`, `teslaacademy.in`, `teslaacademy.dedyn.io`, `NEXT_PUBLIC_MAIN_DOMAIN`) → admin/teacher/login/root routes served directly.
- `<tenant>.<base-domain>` or `<tenant>.localhost` → rewritten to `/[client]/...` with `?subdomain=<tenant>`.
- Vercel preview deployments and local dev without subdomains fall back to path-based (`/<tenant>/...`) or `?subdomain=` query-based tenant resolution.
When touching tenant routing, all of these fallback paths (subdomain, `.localhost`, Vercel preview, plain localhost with query param) need to stay in sync.

### Auth
- Two parallel auth flows: Admin/Teacher (`backend/src/controllers/adminAuth.controller.ts`, routes under `/admin/auth`) and Student (`studentAuth.controller.ts`, routes under `/api/auth`, supports phone+OTP in addition to email/password).
- Access token (15m) + refresh token (7d, persisted in the `refresh_tokens` table) issued by `backend/src/utils/jwt.ts`.
- `backend/src/middleware/auth.ts` verifies the access token and re-fetches the user from the DB on every request (except the hardcoded `SUPER_ADMIN`/`platform` bypass for the platform dashboard) — role guards are `requireAdmin`/`requireTeacher`/`requireStudent`.
- Frontend token storage/refresh lives in `frontend/src/lib/api/client.ts` (`tokenManager` + axios interceptors): a single shared cookie (`QUEZT_AUTH`) holds token/refreshToken/user, and a 401 triggers a queued refresh (`/admin/auth/refresh` or `/api/auth/refresh-token` depending on role) before retrying the original request.

### Routing structure (backend)
`backend/src/index.ts` mounts routers under two prefixes: `/admin/*` (admin/teacher-scoped) and `/api/*` (student/client-scoped). Several read-heavy routers (subjects/chapters/topics/contents) are intentionally shared between both prefixes since the underlying data is read-only for students. `/platform/*` is the separate super-admin surface, gated by `backend/src/middleware/superAdmin.ts`.

### Payments
Multiple payment integrations coexist — check which one applies before editing:
- **Konnect** (`backend/src/utils/konnect.ts`) — shared platform-level API key/wallet, primary gateway for batch/test-series checkout (`checkout` → hosted Konnect page → `verify-payment` → enrollment).
- **Stripe Connect** (`backend/src/utils/stripeConnect.ts`) — per-organization connected accounts (OAuth-based onboarding), used for org-level payout/collection rather than the shared Konnect wallet.
- **Paymee** — an alternate/fallback gateway (env-configured; see `PAYMEE_*` vars), for gateway switching.
Order/checkout flows live in `order.controller.ts` and `subscription.controller.ts`; don't assume there's a single payment path.

### Video upload & content
Multipart HLS upload flow: frontend requests a presigned multipart upload (`initiate`), uploads chunks directly to S3/Supabase Storage, then calls `complete` — the backend only orchestrates presigned URLs and never proxies file bytes (`backend/src/utils/s3.ts`, `frontend/src/hooks/use-multipart-upload.ts`). Content indexing for RAG (transcription + embeddings) is triggered from the backend but executed in `ai-service` (`ai-service/app/services/ingestion.py`, `embeddings.py`, `transcription.py`).

### Test scoring
Auto-scored on submit in `backend/src/controllers/attempt.controller.ts`: MCQ/True-False via `isCorrect` option flag, Numerical via exact float match, Fill-Blank via case-insensitive string match. Negative marking is applied for wrong answers; rank/percentile are computed against all completed attempts for the same test.

### Data model
`backend/prisma/schema.prisma` is the single source of truth (~40 models) shared by both the backend (via Prisma Client) and `ai-service` (via raw `psycopg` — see `ai-service/app/db/pool.py`, which prefers `DIRECT_URL` over the pooled `DATABASE_URL`). Any schema change affecting content/embeddings tables needs to stay compatible with ai-service's raw SQL queries, not just the Prisma-generated client.

### Live sessions
LiveKit powers live classes (`frontend` uses `@livekit/components-react`; backend has `utils/livekit-egress.ts` for recording egress to S3/Supabase Storage). Egress output feeds into `ai-service` transcription/summarization for post-session AI summaries.
