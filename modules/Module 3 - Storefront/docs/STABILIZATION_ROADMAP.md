# Storefront Stabilization & Agent Autonomy — Roadmap

> **Authority:** This file. For storefront code → `opticup-storefront/`. For ERP rules → `CLAUDE.md`.
> **Location:** `modules/Module 3 - Storefront/docs/STABILIZATION_ROADMAP.md`
> **Created:** 2026-04-18
> **Owner:** Daniel (strategic), opticup-strategic (authoring)

---

## Vision

Turn the storefront from "every change might break something" into a system
where agents can safely improve the site autonomously — with a safety net that
catches problems before they reach production.

**End state:** Daniel says "improve the homepage speed" or "fix SEO issues" →
an agent makes the change, runs automated tests, and either succeeds silently
or stops and reports what went wrong. Nothing reaches production without
passing all checks.

---

## Problem Statement

The storefront has 76 published pages across 3 languages, 8 CMS block types,
1,671 WordPress redirects, and a cross-repo dependency on the ERP's Studio
block schemas. Changes frequently cause unexpected breakage because:

1. No comprehensive automated test suite — `full-test.mjs` has 18 tests but
   doesn't cover all pages, all block types, or redirect integrity
2. No PageSpeed regression detection — the 89→47 regression (2026-04-18) was
   caught manually
3. Block renderers in Astro must match JSONB schemas in the ERP's Studio —
   no automated contract validation
4. `vercel.json` (8,600 lines, 1,671 redirects) is fragile and has no
   dedicated integrity check

---

## Phases

### Phase 1 — Safety Net ⬜

**SPEC:** `STOREFRONT_SAFETY_NET`
**Repo:** `opticup-storefront`
**Goal:** Build a comprehensive test suite that catches breakage before merge.

**Deliverables:**
- `scripts/safety-net.mjs` — single entry point, runs all checks
- Page health check — all 76 pages × 3 languages return HTTP 200
- Block rendering check — all 8 block types render without errors
- Redirect integrity — top 30 WordPress redirects verified
- PageSpeed baseline — Lighthouse CI with threshold (mobile ≥ 75)
- Console error check — zero errors on build
- Frozen file guard — `vercel.json`, `/api/image/`, `supabase.ts` flagged
- Pre-commit hook integration — `safety-net.mjs --quick` on every commit
- CI integration — full suite runs on every PR

**Success = "one command tells me if the site is healthy or what broke."**

### Phase 2 — Storefront Agent Skill ⬜

**SPEC:** `STOREFRONT_AGENT_SKILL`
**Repo:** `opticup` (skill lives in `.claude/skills/`)
**Goal:** A skill that knows everything about the storefront and can make
changes safely.

**Deliverables:**
- `SKILL.md` with full storefront knowledge:
  - 8 block types and their JSONB schemas
  - CMS content flow (Studio → DB → Views → Astro)
  - Frozen files list and why each is frozen
  - Mandatory safety-net run after every change
  - Block schema ↔ renderer contract rules
- Dispatch protocol — how to hand work to this skill from Cowork
- Bounded autonomy — change → test → pass? continue. Fail? stop & report.

**Success = "I tell the agent what to change, it does it correctly without
breaking anything, and runs all checks before presenting the result."**

### Phase 3 — Scheduled Autonomous Agents ⬜

**SPECs:** `STOREFRONT_SENTINEL`, `STOREFRONT_SEO_AGENT`, `STOREFRONT_PERF_AGENT`
**Goal:** Agents that run automatically and report findings.

**Deliverables:**

**3A — Storefront Sentinel (monitoring)**
- Scheduled task, runs daily
- Checks: all pages 200, redirects working, SSL valid, PageSpeed stable
- Reports only on problems — silent when healthy
- Writes to `docs/guardian/STOREFRONT_HEALTH.md`

**3B — SEO Agent (advisory)**
- Scheduled task, runs weekly
- Checks: missing meta descriptions, images without alt, thin content,
  broken internal links, sitemap accuracy
- Produces recommendations report — does NOT make changes autonomously

**3C — Performance Agent (advisory)**
- Scheduled task, runs weekly
- Checks: oversized images, unused CSS, Core Web Vitals regression,
  slow pages
- Produces recommendations report — does NOT make changes autonomously

**Success = "agents monitor and advise automatically. I act on their reports
when I choose to, through the Phase 2 skill."**

---

## Phase 4 (Future) — GitHub/Vercel Access Control ⬜

**Not a SPEC — manual configuration by Daniel.**

When ready to bring in an external developer:
- GitHub: branch protection on `main`, CODEOWNERS, collaborator with Write role
- Vercel: Project Developer role (no production deploy)
- Supabase: no direct access (service_role key marked Sensitive in Vercel)

Checklist will be prepared when Daniel decides to proceed.

---

## Execution Order

```
Phase 1 (Safety Net) ──→ Phase 2 (Agent Skill) ──→ Phase 3 (Scheduled Agents)
     ↑                                                      │
     └──────────── each phase depends on the previous ──────┘
```

Phase 4 is independent — can happen at any time.

---

## How to Continue Between Sessions

1. Read this file — it tells you which phase is current
2. Read the active SPEC folder under `docs/specs/STOREFRONT_*`
3. Read `SESSION_CONTEXT.md` for latest execution state
4. Pick up where the last session left off

---

*This roadmap tracks the stabilization initiative only. For Module 3 feature
work (homepage revisions, new pages, etc.) see `MODULE_3_ROADMAP.md`.*
