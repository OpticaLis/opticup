# DIAGNOSIS — M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT

> **Written by:** opticup-executor (Pre-flight phase, Full-Auto Pipeline mode)
> **Written on:** 2026-05-11
> **Companion to:** `SPEC.md` (this folder)
> **Purpose:** Capture all pre-execution evidence — env-var resolution, page-route audit, DB baselines, branch choice — so the Vercel provisioning and DB UPDATE steps run against verified facts, not Brief assumptions.

---

## 1. Storefront repo audit (read-only consumption)

Repo location on disk: `C:\Users\User\opticup-storefront\` (sibling of opticup).

### 1.1 Pages directory (`src/pages/`)

Verified via `ls` on 2026-05-11:

```
[...slug].astro        — CMS catch-all (serves /supersale/, thank-you pages, any CMS-managed slug)
404.astro              — error page on form-submission failure path
accessibility.astro    — accessibility statement (CMS-static)
api/                   — server endpoints (image proxy, etc.) — out-of-scope for forms
branches/              — branch landing pages — out-of-scope
brands/                — brand catalog — out-of-scope
categories/            — category landing pages — out-of-scope
category/              — singular-form category routes — out-of-scope
en/                    — English locale tree — out-of-scope
event-register/        — event registration form (Brief's primary lead-capture surface)
index.astro            — homepage — out-of-scope (Phase 1 = forms only)
product-category/      — legacy product category — out-of-scope
products/              — product catalog — out-of-scope
quick-register/        — WhatsApp walk-in registration form (Brief's secondary form)
r/                     — short-link resolver (/r/[code])
ru/                    — Russian locale tree — out-of-scope
search.astro           — search — out-of-scope
sitemap-dynamic.xml.ts — sitemap generator — out-of-scope
supersale-stock/       — supersale stock page (informational, related to flow)
supersale-takanon/     — supersale terms-and-conditions (informational, related)
unsubscribe/           — one-click unsubscribe (related to messaging path)
בלוג.astro             — Hebrew blog route — out-of-scope
```

### 1.2 Form-flow routes confirmed for Phase 1

These will be smoke-verified on the demo Vercel deploy:

| Route | Source on disk | §3 SC reference |
|---|---|---|
| `/r/[code]` | `r/` (Astro file routing) | SC #8 |
| `/event-register/[...]` | `event-register/` | SC #9 |
| `/quick-register/` | `quick-register/` | SC #10 |
| `/supersale/` | served by `[...slug].astro` (CMS row) | implicit (loads as CMS page, not form route) |
| `/supersale-stock/` | `supersale-stock/` | not required, but won't 5xx |
| `/supersale-takanon/` | `supersale-takanon/` | not required, but won't 5xx |
| `/unsubscribe/` | `unsubscribe/` | not required, but reachable post-send |
| `/404` | `404.astro` | terminal page on form failure |

### 1.3 Brief's assumed routes vs reality reconciliation

| Brief assumption | Repo reality | Resolution |
|---|---|---|
| `/supersale/register/` is a form route | Not a file route — `/supersale/` is a CMS page; the actual registration form lives at `/event-register/[slug]/` (event-scoped) | SPEC §3 SC #9 names `/event-register/` directly. Brief's `/supersale/register/` will resolve via `[...slug].astro` to either a CMS page or a redirect — out-of-scope to characterize further. |
| `/thanks/` is a thank-you page | No dedicated file route; thank-you content typically lives in form-component success-state or as CMS slug | Out-of-scope for Phase 1 SCs; form-component success state is part of the form route's compiled output. |
| Brief lists 5 form routes + error | Phase 1 verifies 3 critical routes (`/r/`, `/event-register/`, `/quick-register/`); other related routes (`/supersale-stock/`, `/supersale-takanon/`, `/unsubscribe/`) are exercised only as "must not 5xx" via the smoke phase's curl sweep | Captured in §3 SC #8–10. |

---

## 2. Storefront env-var audit (escalation B resolution)

### 2.1 Authoritative source

`opticup-storefront/CLAUDE.md §13` — the storefront repo's own Authority Matrix-equivalent for environment variables.

### 2.2 Names confirmed

```
PUBLIC_SUPABASE_URL          .env + Vercel    Supabase project URL
PUBLIC_SUPABASE_ANON_KEY     .env + Vercel    Anon key (Views read)
SUPABASE_SERVICE_ROLE_KEY    .env + Vercel    Image proxy only, server-side
PUBLIC_DEFAULT_TENANT        .env + Vercel    Default tenant slug (`prizma`)
```

### 2.3 Resolution

- Brief assumed: `PUBLIC_DEFAULT_TENANT_SLUG=demo`
- Actual var: `PUBLIC_DEFAULT_TENANT=demo`
- **Escalation B (Brief §5) is RESOLVED-AT-AUTHOR-TIME** — the Executor uses `PUBLIC_DEFAULT_TENANT=demo` in the Vercel project config and does NOT escalate.
- Brief's §2 note "Verify that `opticup-storefront` already supports `PUBLIC_DEFAULT_TENANT_SLUG`... If yes — done" → answer: storefront supports `PUBLIC_DEFAULT_TENANT` (current name, no rename needed); no code change to the storefront repo.

### 2.4 Astro config cross-check

`opticup-storefront/astro.config.mjs` hardcodes:

```js
site: 'https://www.prizma-optic.co.il',
```

**Implication:** the demo build will have the canonical `site` URL baked in as `https://www.prizma-optic.co.il`. This affects:
- Sitemap generation (uses the canonical URL prefix)
- `<link rel="canonical">` tags in rendered pages
- Open Graph absolute URLs

This is **NOT a blocker** for Phase 1's goal (forms only). Forms POST to Edge Functions, not to the canonical site URL. SEO-leakage and canonical-tag pollution are out-of-scope per Brief §3 ("Mirror of Prizma's non-form pages... Phase 2+ if needed"). A future Phase 2 SPEC will need to per-tenant the `site` value (probably via `import.meta.env.PUBLIC_SITE_URL` with a per-tenant config, or via Vercel build args).

**Logged as finding M3-FINDINGS-01** in `FINDINGS.md` (canonical-URL leakage on demo Vercel — LOW severity, Phase 2 follow-up).

---

## 3. Database baselines (pre-UPDATE snapshots — Supabase MCP, project `tsxrrxzmdxaenlvocyit`)

Captured 2026-05-11 via `execute_sql`:

```
[
  {
    "id":         "8d8cfa7e-ef58-49af-9702-a862d459cccb",
    "slug":       "demo",
    "storefront_url": "https://demo.opticalis.co.il",
    "updated_at": "2026-03-29 08:33:43.906+00"
  },
  {
    "id":         "6ad0781b-37f0-47a9-92e3-be9ed1477e1c",
    "slug":       "prizma",
    "storefront_url": "https://prizma-optic.co.il",
    "updated_at": "2026-03-19 09:54:27.256+00"
  }
]
```

These values match the predecessor SPEC `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FOREMAN_REVIEW.md §5` spot-check (both `updated_at` timestamps bit-identical to the 2026-05-11 closure of that SPEC). The cross-check confirms no other writes have touched either row in the intervening hours.

**§3 SC #11 reference:** demo's UPDATE will advance `updated_at` past `2026-03-29 08:33:43.906+00` and set `storefront_url` to the new Vercel URL. Captured here for post-UPDATE comparison.

**§3 SC #12 reference (regression-zero):** Prizma's row must remain at `2026-03-19 09:54:27.256+00` and `https://prizma-optic.co.il` for the duration of this SPEC. If either changes from any source other than this Executor's actions — STOP per §5 stop-trigger ("Pre-UPDATE Prizma `tenants.updated_at` changes from a source unrelated to this SPEC").

Prizma's storefront_url has no `www.` prefix in the tenants row (`https://prizma-optic.co.il`) while `astro.config.mjs` uses `https://www.prizma-optic.co.il`. Both resolve to the same Vercel project (Vercel auto-routes apex+www). Not a blocker.

---

## 4. Branch choice for new demo Vercel project

**Recommendation:** `main` (same as Prizma's auto-deploy source).

**Reasoning:**
- Prizma's Vercel project auto-deploys from `main` per storefront `CLAUDE.md §12` ("`main` = Production. Auto-deploys to Vercel.").
- Mirroring Prizma's choice keeps demo's code identical to what Prizma's customers run — the cleanest baseline for Daniel's manual test cycle (any divergence would muddle "does the test reflect production?").
- `develop` is an option for staging-parity QA (see what's about to ship before Prizma sees it). Daniel can flip the branch source any time post-provisioning.

**Daniel can override** in his Escalation A response (option a: branch override; option b: he creates the project manually and picks the branch at that time).

---

## 5. Escalation A scaffold (pre-filled — not yet emitted)

When the Executor reaches the Vercel provisioning step, the escalation file will be:

```
modules/Module 3 - Storefront/escalations/{ISO_TS}_vercel_access_request.md
```

Contents will request:
1. Project name confirmation (suggested: `opticup-storefront-demo`)
2. Branch source (suggested: `main`, alternative `develop`)
3. One of two response paths:
   - (a) **CLI token** + naming + branch — Executor creates the project via `vercel projects add` (or equivalent) + configures env vars + triggers deploy
   - (b) **Manual creation** — Daniel creates project in Vercel dashboard, pastes back the live URL — Executor proceeds to env-var verification + DB UPDATE phase
4. Env vars list to configure:
   - `PUBLIC_DEFAULT_TENANT=demo`
   - `PUBLIC_SUPABASE_URL=https://tsxrrxzmdxaenlvocyit.supabase.co`
   - `PUBLIC_SUPABASE_ANON_KEY=<same as Prizma's project — Daniel-confirmed at provisioning time>`
   - `SUPABASE_SERVICE_ROLE_KEY=<same as Prizma's project — Daniel-confirmed at provisioning time>`

---

## 6. Daniel's response (filled in post-escalation)

*This section is appended in commit 4 after Daniel parses the escalation file and responds.*

> **(awaiting Daniel response — to be populated in commit 4)**

---

## 7. Pre-execution checklist (Step 1.5 DB Pre-Flight equivalent)

Per opticup-executor SKILL.md Step 1.5 — for SPECs that touch DB. This SPEC only UPDATEs one existing row and INSERTs+DELETEs one smoke row on `short_links`; no DDL, no new tables, no new columns, no new RPCs.

| Check | Status | Evidence |
|---|---|---|
| Read `docs/GLOBAL_SCHEMA.sql` | N/A — no schema changes | n/a |
| Read module's `docs/db-schema.sql` | N/A — no schema changes | n/a |
| Name-collision grep for new DB objects | N/A — no new DB objects | n/a |
| Field-reuse check | N/A — `storefront_url` and `short_links` are pre-existing | DIAGNOSIS §3 captures the existing shape of `tenants.ui_config.storefront_url` |
| FIELD_MAP / T-constant plan | N/A — no new fields/T-constants | n/a |
| Iron Rule 21 Cross-Reference Check | ✅ confirmed in SPEC §12 — 0 collisions, 1 pre-existing-name confirmed (`PUBLIC_DEFAULT_TENANT`) | SPEC §12 |
| Iron Rule 31 Integrity Gate | ✅ exit 0 at session start, exit 0 post-commit-1 | session log |
| Iron Rule 32 Destructive Operations declaration | ✅ §7 of SPEC declares 3 destructive ops; pre-commit hook accepted commit 1 | git log `05260f8` + hook output |

---

*End of DIAGNOSIS. Ready for commit 2 (`chore(spec): M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT — pre-flight diagnosis + env-var audit`).*
