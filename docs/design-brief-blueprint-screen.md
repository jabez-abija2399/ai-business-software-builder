# Design Brief — Next Screen: Blueprint (/projects/:id/blueprint)

This file is the "what to spec next" brief. Fill in the numbered sections below
(the same style as the Overview spec you pasted) and paste it back so it can be
built to spec. Defaults I will apply if a section is left unanswered are marked
`[default]`.

Rule that applies to every section (identical to Overview): **never invent
numbers or states.** Reuse `docs/ARCHITECTURE.md` conventions — everything is
derived from real data or shown as an honest empty/“—” state.

---

## Route & data context

- Route: `Projects` → project → **Blueprint** (already wired as a tab in the
  shared `ProjectDetailShell`).
- Backing models: `BusinessBlueprint`, `Requirement`, `ProjectFeature`,
  `Approval`, `Decision`, `KnownIssue`, `AgentRun` (task type `TESTS`, etc.).
- Existing API routes (already live, can be extended):
  - `POST /api/projects/[projectId]/blueprint` — save/create a blueprint
  - `POST /api/projects/[projectId]/blueprint/analyze` — run the AI analysis
    (creates an `AgentRun`; returns run id `runId`)
  - `POST /api/projects/[projectId]/blueprint/clarify` — answer a clarifying
    question (accepts `questionId`/`answer`)
  - `POST /api/projects/[projectId]/blueprint/approve` — approve the current
    version (`killBuildIfActive` flag)
  - `GET  /api/projects/[projectId]/blueprint` — fetch blueprint(s)

---

## Sections to describe (numbered, paste back)

### A. States & flow

1. **Empty state** — project has no blueprint yet. What copy, CTA, and layout?
   Where does the primary CTA lead (analyze directly vs. build-up wizard)?
2. **Description input** — the starting input. Free-text? Min/max length? Is
   it a big textarea or step-by-step questions? Any "templates / examples"
   affordance? `[default: bare textarea + "Analyze my idea" button, the old
   page's shape.]`
3. **Analyzing state** — what the user sees while `analyze` runs. Streamed
   transcript? Skeleton? Progress bar? Cancel affordance? Tie-in to the real
   `AgentRun` status (QUERIED→RUNNING→COMPLETED/FAILED). `[default: animated
   "Fleet is analyzing your idea" panel + live run status chip]`
4. **Clarification loop** — how questions appear (inline card? queue?), how
   answers are entered, whether the agent can ask multiple rounds, and how the
   user can end the loop ("skip for now" / "continue"). `[default: one
   question card at a time, answer input, auto-re-analyze after answer]`
5. **Blueprint view** — the full blueprint document. Which of these sections
   must be shown and from which JSON field:
   | UI section | Source (`business_context_json` etc.) |
   |---|---|
   | Business context | `businessContextJson` |
   | Goals | `goalsJson` |
   | Personas | `personasJson` |
   | Roles & permissions | `rolesJson`, `permissionsJson` |
   | Features | `featuresJson` |
   | Entities (data model) | `entitiesJson` |
   | Workflows | `workflowsJson` |
   | Business rules | `businessRulesJson` |
   | Integrations | `integrationsJson` |
   | Non-functional requirements | `nfrJson` |
   | Notes | `notes` |
6. **Review & approve flow** — the approve action. Where it lives, the confirm
   dialog (risk level from `Approval`, impact summary), and post-approve
   redirect (→ Design screen?). Reject / request-changes semantics.
7. **Version history** — v1, v2… list; how a user opens an older version;
   whether diffing between versions is required.
8. **Consistency/completeness indicator** — is a "blueprint completeness" %
   shown? If so, define the formula honestly (based on which stored fields are
   non-empty). `[default: checklist of non-empty blueprint fields, no fake %]`

### B. Actions & errors

9. **Analyze failure** — what the inline error looks like when `analyze` fails
   mid-stream; the retry affordance; whether partial results persist.
10. **Approve button states** — disabled conditions (no blueprint / already
    approved / analyze running), optimistic vs. server-confirmed behavior, and
    what happens when approval is blocked by a known issue / open decision.
11. **Clarify failure** — same as #9 for the clarify endpoint.
12. **All actions trigger real agents** — confirm which actions should create
    `AgentRun` rows so the Overview usage data stays honest (analyze → yes).

### C. Layout & navigation

13. Per-section card layout — which blueprint sections are collapsible, which
    pinned, ordering. `[default: sticky right rail "Blueprint outline" nav +
    scrollable section cards, collapsible after first render]`
14. Header/CTA position — which controls live in the in-page header vs. the
    shared shell (shell already owns the primary action button — should the
    shell CTA now point to Blueprint when `blueprintStatus != APPROVED`?).
15. Next-step affordances — where "Continue to Design" appears after approve;
    does it disable until approval completes.
16. Copy/export affordances — copy blueprint JSON, print? `[default: none]`
17. Decision & risk inline — where `Decision` and `KnownIssue` items surface
    inside the blueprint sections, if at all.

---

## What I will do regardless of your spec (defaults)

- Reuse the premium design language already shipped (Overview cards, section
  blocks, real-state skeletons, inline `SectionError` + retry).
- Server layout keeps the auth + access guard; page stays SSR prefetch +
  `HydrationBoundary`, with blueprint + run status queries.
- All writes (`analyze`, `clarify`, `approve`) go through the existing API
  routes and create real `AgentRun`/`Approval` records.
- Empty/loading/error/permission states for every action, per the honesty rule.

---

## Remaining roadmap after Blueprint (step by step)

| # | Phase | Route | Notes |
|---|---|---|---|
| 1 | **Blueprint** (current brief) | `/projects/:id/blueprint` | Fill in this brief |
| 2 | **Design** | `/projects/:id/design` | UI/UX + architecture + DB design (`DesignArtifact`, `ArchitectureArtifact`), generate + review |
| 3 | **Build** | `/projects/:id/build` | Live agent output/stream, artifacts (`ProjectArtifact`), rerun/failure recovery |
| 4 | **Quality** | `/projects/:id/quality` | Tests/security/a11y/performance (`TestRecord`, `KnownIssue`, `VerificationRecord`) report |
| 5 | **Preview** | `/projects/:id/preview` | Live preview environment, open/hot-restart |
| 6 | **Deploy** | `/projects/:id/deploy` | Environments, deployment list, health, rollback links |
| 7 | **Teardown** | everywhere | Delete now superseded legacy client pages; remove duplicate "Project / X" breadcrumbs; final lint/build/typecheck; update `docs/ARCHITECTURE.md`; seed demo project; commit + push per phase |