# AI Business Software Builder — Architecture & Technical Guide

This document is the technical reference for the platform. It defines the approved stack, the architecture OpenCode should follow, the authentication/authorization model, and the phased delivery roadmap. It is intentionally opinionated: **one tool per responsibility**, validated as it is adopted.

---

## 1. Principles

1. **Pick one approach per responsibility.** Never install multiple libraries that solve the same problem (e.g., two state managers, two ORMs, two query layers).
2. **Keep the initial `package.json` small.** Add dependencies only when a feature is actually implemented — never pre-install a stack.
3. **Abstract behind services.** AI providers, email, storage, analytics, and payment providers are accessed through small service interfaces so they can be swapped later.
4. **Validate twice, never once.** Every user input is validated client-side (RHF + Zod) and again server-side (Zod).
5. **Do not run generated commands on the main server.** Builds/tests/security scans of generated projects run in an isolated sandbox worker.
6. **Build in vertical slices**, not as one large horizontal build.

---

## 2. High-level architecture

```text
                    AI BUSINESS SOFTWARE BUILDER
                              │
             ┌────────────────┴────────────────┐
             │                                 │
        Builder UI                         Developer UI
             │                                 │
             └───────────────┬─────────────────┘
                             │
                         Next.js
                             │
                    Application Services
                             │
        ┌────────────┬───────┼────────┬─────────────┐
        │            │       │        │             │
     Blueprint     AI      Projects  Auth/AuthZ  Billing
     Engine       Engine    Engine    Engine       Engine (*)
        │            │
        │       AI Orchestrator
        │            │
        │      ┌─────┼─────┐
        │      │     │     │
        │   Analyst Architect Developer
        │                 │
        │              QA/Security
        │                 │
        │             Verification
        │
        └──────────────┬──────────────────────┐
                       │                      │
                   PostgreSQL              Redis
                       │                      │
                    Prisma                 BullMQ
                                              │
                                              ↓
                                         Worker System
                                              │
                                      ┌───────┴────────┐
                                      │                │
                                   Sandbox          AI Jobs
                                      │
                               Generated Project
                                      │
                       ┌──────────────┼──────────────┐
                       │              │              │
                    Build           Test          Security
                       │              │              │
                       └──────────────┼──────────────┘
                                  Verification
                                      │
                                      ↓
                                   Deploy

(*) Billing is NOT part of the MVP. Added only when billing ships.
```

---

## 3. Approved technology decisions

> Table of responsibilities. "Current" = already installed/used in this repo today.

| Responsibility | Decision | Current | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | ✅ | Next 15 |
| UI | React + TypeScript | ✅ | |
| Styling | Tailwind CSS | ✅ | Tailwind v3 for now |
| Icons | `lucide-react` | ✅ | |
| UI primitives | Radix UI (`@radix-ui/*`) | ✅ | shadcn/ui-style components in `src/components/ui` |
| Class management | `class-variance-authority`, `clsx`, `tailwind-merge` | ✅ | `cn()` helper in `src/lib/utils.ts` |
| Forms | `react-hook-form` + `@hookform/resolvers` | ✅ | Create-project modal (zodResolver) |
| Validation | `zod` | ✅ | Strictly server-side too |
| ORM | Prisma | ✅ | + `prisma.config.ts` |
| Database | PostgreSQL | ✅ | Hosted on **Supabase** (transaction pooler, `prisma/migrations`) |
| Authentication | **NextAuth (Auth.js) v5** | ✅ | Credentials + optional Google/GitHub. **Not** Better Auth. |
| RBAC | Custom, Prisma-backed | ✅ | `Organization → Membership → Role → Permissions` |
| Client state | `zustand` | ⏳ planned | Only when needed |
| Server state | `@tanstack/react-query` | ✅ | Cursor-paginated `useInfiniteQuery`, SSR prefetch + `HydrationBoundary`, optimistic remove |
| API | Next.js Route Handlers + Zod + typed service layer | ✅ | `src/server/*`, `src/validations/*` |
| AI SDK | `ai` + `@ai-sdk/react` | ⏳ planned | Behind `AIService` abstraction |
| AI providers | `@ai-sdk/openai`, then adapters | ⏳ planned | Enabled one at a time via env config |
| Background jobs | `bullmq` + `ioredis` + Redis | ⏳ planned | Required for AI generation |
| Real-time | SSE first, WebSockets later | ⏳ planned | Job progress in UI |
| Code parsing | TypeScript API + `ts-morph` | ⏳ planned | |
| Code formatting | `prettier` + `eslint` | ✅ | Standardized configs for generated projects |
| Git (remote) | `octokit` (+ GitHub App later) | ⏳ planned | |
| Git (local) | `simple-git` | ⏳ planned | |
| Testing | `vitest` + Testing Library | ✅ (`vitest`) | `@testing-library/*` present |
| E2E / a11y | Playwright + `axe-core` | ⏳ planned | Verification pipeline |
| Object storage | `StorageService` (S3-compatible abstraction) | ⏳ planned | Not locked to AWS |
| Email | `EmailService` (Resend or SMTP) | ⏳ planned | |
| Payments | Stripe / Chapa (Ethiopia) | ⏳ planned | Not in MVP |
| Workflows | Custom representation → Temporal/Inngest later | ⏳ planned | Not in MVP |
| Observability | Structured logs (`pino`) + Sentry | ⏳ planned | No random `console.log` long-term |
| Analytics | `AnalyticsService` (PostHog later) | ⏳ planned | Isolated from business logic |
| Markdown | `react-markdown`, `remark-gfm` | ⏳ planned | Blueprint/architecture docs |
| Code editor | `@monaco-editor/react` | ⏳ planned | Developer workspace |
| Visual builder | `@xyflow/react` | ⏳ planned | Workflow/architecture views |
| Charts | `recharts` | ⏳ planned | Dashboards |
| Dates | `date-fns` | ⏳ planned | |
| IDs | `nanoid` (client) / Prisma UUID (DB) | ⏳ planned | |
| Env validation | `env.ts` with Zod | ⏳ planned | Centralized at startup |

### Packages deliberately NOT installed

- **Multiple of the same category:** only one state manager (Zustand), one ORM (Prisma), one HTTP flavor (Route Handlers — tRPC only if we later remove REST), one queue (BullMQ).
- **Heavy frameworks early:** no Redux/MobX, no Axios, no monolithic UI kit, no payment SDKs, no workflow engine until needed.

---

## 4. Authentication & authorization (NextAuth v5)

**Decision:** NextAuth (Auth.js) v5 with JWT sessions and the Prisma adapter. Better Auth was considered and **rejected** to avoid splitting the auth stack.

### Current implementation

- **Providers:** Credentials (email + bcrypt password) always present. Google and GitHub OAuth are registered **only when their env vars are set** (`src/auth.ts`).
- **Cookie compatibility:** middleware checks both `authjs.*` and legacy `next-auth.*` session cookies (Auth.js v5 uses `authjs.session-token`).
- **Normalization:** all emails are stored/compared lowercased and trimmed (`src/validations/auth.ts`, `normalizeEmail()` in `src/lib/utils.ts`). Prevents duplicate accounts.
- **Server-side validation:** signup enforces name/email/password policy with Zod (`signupSchema`), never trusting the client.
- **Rate limiting:** in-memory fixed-window limiter on `signup` and `forgot-password` (`src/lib/rate-limit.ts`). Replace with Redis-backed limiting once workers exist.
- **Session integrity:** `session.user.id` is read from the JWT token, not the (often undefined) `user` object.
- **Enumeration protection:** `forgot-password` always returns the same message whether or not the account exists.
- **Env secrets:** `NEXTAUTH_SECRET` / `AUTH_SECRET` generated and stored per-environment (Vercel + `.env*`), never committed.

### Authorization model

```text
Organization
    ↓ 1:N
Membership (userId, organizationId, role: OWNER | MEMBER)
    ↓
Role
    ↓
Permissions (add `permissions` later as project grows)
```

Rules enforced today in API routes:
- Every protected route starts with `if (!session?.user?.id) → 401`.
- Project access requires the user to be the project **owner** **or** an **organization member** of the project's org.
- Mutations (update/delete/approve) require the **owner** role.

### Future hardening (tracked, not MVP blockers)

- Move rate limiting behind Redis (shared across serverless instances).
- Role → permission table for fine-grained RBAC (e.g., `CAN_DEPLOY`, `CAN_APPROVE_BLUEPRINT`).
- Password reset "consume token" endpoint + page (token is generated today but email delivery/consumption is not wired).
- Email verification with a real `EmailService` (currently auto-verified on signup).
- CSRF is handled by Auth.js; re-check after switching cookie handling on Vercel.
- Security headers (see §9).

---

## 5. Data flow rules

```text
User input
   ↓
React Hook Form
   ↓
Zod validation
   ↓
Route Handler
   ↓
typed service layer (src/server)
   ↓
Prisma + PostgreSQL (Supabase)
```

```text
Server state    →  TanStack Query (when introduced)
UI builder state →  Zustand (when introduced)
Form state      →  React Hook Form
Database        →  Prisma + PostgreSQL
```

---

## 6. AI system design

**No AI provider SDK is called directly in the app** — everything goes through
the registry in `src/server/ai` (see §7 for the implemented runtime).

```text
AIService (src/server/ai)
 ├── generate()
 ├── analyze()
 ├── extractRequirements()
 ├── generateBlueprint()
 ├── generateArchitecture()
 ├── review()
 ├── repair()
 └── evaluate()
        ↓
Task Router (reasoning vs. tooling)
        ↓
Provider Registry (src/server/ai/providers/registry.ts)
   openai · openrouter · groq · xai · google · anthropic
   mistral · deepseek · together · cerebras · deterministic
```

### Provider selection (implemented)

- **Active provider** is chosen by `FLEET_AI_PROVIDER=<id>`; otherwise the first
  provider whose `<ID>_API_KEY` is present wins, in registry order
  (openai → openrouter → groq → xai → google → anthropic → mistral → deepseek
  → together → cerebras). Google accepts `GEMINI_API_KEY` **or** `GOOGLE_API_KEY`.
  With no keys configured the deterministic provider remains the active default.
- **Model** per provider: `<ID>_MODEL` override, otherwise the provider's default.
- **Request shape** follows the provider: OpenAI-compatible (OpenAI, OpenRouter,
  Groq, xAI, Google, Mistral, DeepSeek, Together, Cerebras) via the shared
  adapter; Anthropic via the Messages API (`x-api-key` + `anthropic-version`).
  `jsonMode` providers use `response_format: { type: "json_object" }`; the rest
  pin JSON in the prompt and recover it with an `extractJson` parser.
- **Routing by task tier** (implemented):

| Task | Provider |
|---|---|
| Reasoning (`analyzeBlueprint`, `generateDesign`) | the selected hosted provider (falls back to deterministic) |
| Tooling (code, quality, preview) | deterministic — file/analysis work, not model calls |

A long AI job is never kept inside one HTTP request — it goes through the job system (§7).

---

## 7. Background jobs & real-time

AI generation takes minutes → **queue it**.

```text
User → API → Create AI Job → Queue → Worker → AI Agents
   → Verification → Database → UI updates (polls the real run)
```

- **Queue (implemented):** a Postgres-backed queue with optimistic
  compare-and-swap (`updateMany` CAS flips `QUEUED → RUNNING`); no
  infrastructure beyond the existing database. `reclaimStaleRuns` /
  `reclaimStaleDeployments` requeue work whose worker died mid-flight. BullMQ +
  Redis remains the documented upgrade path if throughput demands it.
- **Worker (implemented):** `src/server/jobs/worker.ts`, run in its **own
  process** via `npm run worker` (poll) or `npm run worker:once` (drain a
  batch). Entry: `src/worker.ts`. It is resilient to transient DB blips (backoff
  + retry instead of crashing).
- **AIService:** `src/server/ai` — registry of provider adapters (OpenAI,
  OpenRouter, Groq, Grok/xAI, Google Gemini, Anthropic, Mistral, DeepSeek,
  Together, Cerebras + deterministic). Selection via `FLEET_AI_PROVIDER` or
  first-configured key; model override per provider (`<ID>_MODEL`). Reasoning
  tasks (blueprint analysis, design) may use a hosted model; tooling tasks (code
  generation, quality checks, preview) run deterministically because they are
  file/analysis work. Every `AgentRun` records real `provider`/`model`
  provenance. Providers fail honestly when a key is missing: the run records
  `FAILED` with a clear "not configured" reason.
- **Workspace:** generated files land in `.fleet-workspace/<projectId>/`
  (gitignored, never served statically) and are recorded as `ProjectArtifact`
  rows with checksums. Previews are provisioned as real static HTML and served
  from `/api/preview/<deploymentId>`.
- **Honest limitations:** dependency install has no network-enabled sandbox in
  this environment, so `INSTALL_DEPENDENCIES` fails with `SANDBOX_UNAVAILABLE`;
  staging/production deployments fail with an explicit "no provider configured"
  reason. Both are truthful, actionable failures — never fabricated success.
- Workers run **isolated** from the Next.js server.
- CPU-risky work (npm install/test/build/lint, git) runs in a **sandbox worker**, never on the main server.

```text
Builder API → Job Queue → Sandbox → Generated Project
   → Install → Build → Test → Security checks → Result → Deploy
```

---

## 8. Verification pipeline (per generated deliverable)

```text
TypeScript → ESLint → Unit tests → Integration tests
   → Playwright → Accessibility (axe-core) → Build → Deploy
```

---

## 9. Security checklist (MVP)

- [x] bcrypt password hashing (12 rounds)
- [x] Server-side Zod validation on all auth inputs
- [x] Email normalization to prevent duplicate accounts
- [x] Rate limiting on signup / forgot-password (in-memory MVP)
- [x] No OAuth provider activated without configured credentials
- [x] Secrets excluded from git (`.env*` ignored); per-environment in Vercel
- [x] Prisma migrations deployed to production (Supabase)
- [ ] `helmet`/security headers on responses
- [ ] Redis-backed rate limiting (shared across instances)
- [ ] Complete password-reset flow (consume-token endpoint + page)
- [ ] Email verification via `EmailService`
- [ ] GitHub secrets scanning, CodeQL, Dependabot
- [ ] Audit logging on auth events
- [ ] Sanitize/scan generated code before it touches users

---

## 10. Phased roadmap

Build in vertical slices; each slice ends in a working, verified feature.

**Phase 1 — Foundation** (mostly done)
Foundation → Auth+RBAC → Projects → Blueprint → AI clarification → Blueprint persistence → Verification

**Phase 2 — Generation** (engine implemented)
Design generation → App generation → Preview: all driven by the worker
(`src/server/jobs`), which now actually transitions runs and writes artifacts.
See §7 for the runtime details.

**Phase 3 — Workspace** (Code workspace implemented; GitHub/testing/deploy next)
Code workspace (`/code`) → GitHub → Testing → Repair loop

Implemented: the Code workspace screen reads the **real** generated files from
the worker's sandbox (latest artifact per path, honest "no longer on disk"
state when content was purged), the check history per task type, and a **repair
loop** (`/code/repair`) that re-queues genuinely failed build-task runs
(`INSTALL_DEPENDENCIES` is exempt — it fails for environmental reasons, not
code bugs).

**Phase 4 — Release** (in progress)
Deployment → Monitoring → Usage/analytics

**Phase 5 — Advanced**
Advanced agents → Workflow engine → Integrations → Business AI (email, payments, etc.)

### Current honest-state contract (post-blueprint pipeline)

Every stage after the Blueprint renders **only genuinely persisted state** — it
never fabricates progress, URLs, IDs, live previews, scores, or infrastructure.
See `docs/design-brief-blueprint-screen.md` for the shared rules; each pipeline
stage extends the exact same discipline:

- **Design** (`/design`, `design/editor` GET + `design/generate` POST): requires
  an APPROVED blueprint. `design/generate` creates a real `AgentRun`
  (`DESIGN_GENERATION` / `DESIGN_AGENT`); the `DesignArtifact` (auto-incremented
  version) is written when the run completes. States: locked → empty →
  queued/running (polls the real run) → completed design → completed-no-content
  → failed + retry.
- **Build** (`/build`, `build/editor` GET + `build/start` POST): requires an
  APPROVED blueprint. `build/start` creates the 10 `BUILD_TASK_TYPES` agent runs
  (`CODE_GENERATOR`); `build/editor` returns **only** build-type runs (it never
  aggregates runs from other stages, unlike the deleted `build/status` route).
  The worker writes generated files as `ProjectArtifact` rows and runs real
  local checks (TypeScript parse + deterministic lint logs). The one task this
  environment cannot do honestly — dependency install — fails with
  `SANDBOX_UNAVAILABLE` rather than faking it.
- **Quality** (`/quality`, `quality/editor` GET + `quality/run` POST): requires
  ≥1 COMPLETED build run. `quality/run` creates `TESTS`/`SECURITY`/
  `ACCESSIBILITY`/`PERFORMANCE` runs; the worker evaluates the **real generated
  files** and writes real `TestRecord` rows — no overall score, coverage
  percentage, or fabricated Lighthouse `lcp/fid/cls` (deleted `quality/report`).
- **Preview** (`/preview`, `preview/editor` GET + `preview/create` POST):
  requires ≥1 COMPLETED build run. `preview/create` writes one real
  `Deployment` row (`environment: "preview"`); the worker provisions static HTML
  to the workspace and sets `deploymentUrl = /api/preview/<id>` once it is
  READY. `deploymentUrl` stays `null` until provisioning writes one. Never a
  `*.vercel.app` guess or fake websocket.
- **Deploy** (`/deploy`, `deploy/editor` GET + `deploy/create` POST): requires
  ≥1 READY preview. `deploy/create` writes real `Deployment` rows for
  `staging`/`production`; the worker fails these honestly when no
  deployment provider is configured (explicit reason, `deploymentUrl` null).
- **Code** (`/code`, `code/editor` GET + `code/repair` POST): requires an
  APPROVED blueprint. `code/editor` returns the real `ProjectArtifact` rows
  (newest per path) with content read from the worker's sandbox — files purged
  from disk show "no longer on disk" with their recorded checksum, never
  reconstructed content — plus the latest check run per task type and the
  repairable set. `code/repair` re-queues only the genuinely failed build-task
  runs (`INSTALL_DEPENDENCIES` excluded) and 409s while a build is in flight.

Run-status vocabulary lives in `src/lib/pipeline.ts` and is shared by the API
routes and feature modules. Server-side gate/access helpers live in
`src/server/db/stage-shared.ts` (with per-stage editor-data modules
`project-design.ts`, `project-build.ts`, `project-quality.ts`,
`project-preview.ts`, `project-deploy.ts`, `project-workspace.ts`).

---

## 11. Repository layout (target)

```text
src/
├── app/                 # Next.js App Router (pages + route handlers)
├── components/
│   ├── ui/             # shadcn/Radix primitives
│   └── <feature>/      # feature components
├── lib/                # utils, prisma, rate-limit, api-response
├── server/
│   ├── ai/             # AIService, model router, provider adapters
│   ├── db/             # typed data-access layer
│   ├── jobs/           # Postgres queue, workspace store, handlers, worker loop
│   └── services/       # EmailService, StorageService, AnalyticsService
├── types/
├── validations/        # Zod schemas (server + shared)
└── auth.ts             # NextAuth v5 configuration
prisma/
├── schema.prisma
└── migrations/         # Git-managed, deployed with `npm run db:deploy`
docs/
└── ARCHITECTURE.md     # this file
```