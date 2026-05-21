# TEST_REPORT — M4_DEMO_STATIC_LINKS_BACKFILL

**Date:** 2026-05-21
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch develop, HEAD `d789014`
**Status:** 🟢 **GREEN**
**Pipeline mode:** Full-Auto (single Claude Code session, end-to-end)

---

## Servers

| Server | URL | Status | Response time |
|---|---|---|---|
| ERP | http://localhost:3000 | 200 | 225ms |
| Storefront | http://localhost:4321 | 200 | 2227ms |

Both servers up at start of Phase 4 — no `start-local.ps1` invocation required.

---

## Baseline (`tests/smoke/baseline.test.mjs`)

**8/8 passed** (current baseline is v1.1 with the M4 lint test added).

| # | Test | Result | Duration |
|---|---|---|---|
| 1 | PIN login returns JWT with tenant_id=demo | PASS | 992ms |
| 2 | Create CRM lead succeeds (M4) | PASS | 162ms |
| 3 | Read inventory count for demo tenant (M1) | PASS | 351ms |
| 4 | Storefront homepage returns 200 | PASS | 1342ms |
| 5 | Storefront /supersale lead-form page returns 200 | PASS | 951ms |
| 6 | Cross-module: lead from test-2 visible via crm_leads SELECT | PASS | 117ms |
| 7 | No 5xx on critical pages (HEAD only) | PASS | 1135ms |
| 8 | Layer D lint module declared in crm.html (M4_TEMPLATE_VALIDATION_UI_LINT) | PASS | 0ms |

Cleanup: test #2 deleted the lead it created (RLS-safe).

---

## SPEC-specific (DB + resolver smoke + Tier C VFV)

### DB smoke (S1–S6 + S10 + S11 + S12) — re-verified at Phase 4 start

| # | Criterion | Expected | Actual | Status |
|---|---|---|---|---|
| S1 | demo stock row present (target=`/supersale-stock/`) | `1` | `1` (code `bdf88e3c`) | ✅ |
| S2 | demo pricing row present (target=`/supersalepricescatalog/`) | `1` | `1` (code `c2d22d16`) | ✅ |
| S3 | demo template_static total | `4` | `4` | ✅ |
| S4 | prizma template_static total (unchanged) | `4` | `4` | ✅ |
| S5 | global code uniqueness on `bdf88e3c` + `c2d22d16` | `2` | `2` | ✅ |
| S6 | idempotency — full DO-block re-apply | `0` new inserts; count stays `4` | confirmed (Phase 2) | ✅ |
| S10 | demo pre-existing rows untouched | `NCoQWzbd` + `dsruWc1z` present | both present | ✅ |
| S11 | prizma row hash unchanged | `3cdf03ce26719849786647d8c9840f6d` | `3cdf03ce26719849786647d8c9840f6d` (identical to post-C1) | ✅ |
| S12 | Integrity gate exit | `0` or `2` | `0` | ✅ |

### HTTP resolver smoke (S8 + S9) — re-verified at Phase 4

| # | Criterion | Expected | Actual | Status |
|---|---|---|---|---|
| S8 | `resolve-link?code=bdf88e3c` | `HTTP 302 → https://www.prizma-optic.co.il/supersale-stock/` | `HTTP 302 → https://www.prizma-optic.co.il/supersale-stock/` | ✅ |
| S9 | `resolve-link?code=c2d22d16` | `HTTP 302 → https://www.prizma-optic.co.il/supersalepricescatalog/` | `HTTP 302 → https://www.prizma-optic.co.il/supersalepricescatalog/` | ✅ |

Test endpoint: `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/resolve-link?code=<X>`. Demo + prizma share the same EF; the EF resolves by `code` globally (per the existing global-unique constraint).

---

## Visual Functional Verification (Tier C, MANDATORY)

### VFV — Surface 1: CRM → "קישורים קצרים" tab → "קישורים סטטיים (משותפים)" section (demo tenant)

**URL:** `http://localhost:3000/crm.html?t=demo`
**Viewport:** 1920×1080 (default desktop)
**Screenshots:**
- Viewport-only: `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/screenshot_S7_demo_static_links_4rows.png`
- Full page: `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/screenshot_S7_demo_static_links_4rows_fullpage.png`

**Layout integrity:** PASS — sidebar (right), header "קישורים קצרים" + subtitle, static-card panel with 4-column table (קוד / יעד / קליקים / קליק אחרון), filter-bar (רק עם קליקים checked / 30 ימים / סוג קישור הכל), broadcasts table with bot-noise caption, all visible and well-spaced.

**Overlap check:** PASS — no sidebar overlap; no element occludes another.

**Clipping check:** PASS — no clipping; table cells render full target URLs (with truncation ellipsis for the long gamaf URL, by design).

**Data visible:** PASS — exactly **4 rows** in "קישורים סטטיים (משותפים)":

| Row | Code | Target | Clicks | Last click |
|---|---|---|---|---|
| 1 | `NCoQWzbd` | `https://www.prizma-optic.co.il/supersale-takanon/` | 2 | 14/05/2026 20:45 |
| 2 | `dsruWc1z` | `https://gpw.gamaf.co.il/?id=IzQNzbZPhyDU&sid=…` (truncated, full URL in `href`) | 1 | 14/05/2026 20:24 |
| 3 | **`bdf88e3c`** (NEW) | **`https://www.prizma-optic.co.il/supersale-stock/`** | 1 | 21/05/2026 11:07 |
| 4 | **`c2d22d16`** (NEW) | **`https://www.prizma-optic.co.il/supersalepricescatalog/`** | 1 | 21/05/2026 11:07 |

The "1 click" on each new code corresponds to the S8/S9 HTTP curl probes from Phase 2 — the `resolve-link` EF logs every successful redirect to `short_link_clicks` (expected behavior, confirms the resolver path is fully wired end-to-end including click-tracking).

**Error state:** PASS — no red text, no "auth required" banner, no console errors, no "no data" placeholders.

**Navigation state:** PASS — "קישורים קצרים" sidebar entry is highlighted (`focused`) and active.

**Bug regression check:** Brief §1 stated the goal as "demo's screen renders 4 rows matching prizma's 4 rows so Iron Rule 33 demo-first testing of `event_registration_open` becomes possible." Verified **RESOLVED** — demo screen now shows 4 `template_static` rows including the stock and pricing-catalog links Daniel needs to swap into the template. The per-tenant content parity gap is closed for these 2 URLs.

**Overall surface verdict:** 🟢 PASS

### Mockup Fidelity Check

**Not applicable.** This SPEC is a data backfill — no UI mockup was authored in the Brief. The Brief explicitly excluded the optional static-card helper-text improvement (FINDINGS F-04) from scope.

---

## Failures

None. All Phase 4 verification PASS.

---

## Hand-off

🟢 GREEN — handing back to Foreman for FOREMAN_REVIEW.md (Phase 5).

**Foreman's remaining work:**
- Write `FOREMAN_REVIEW.md` per template.
- Update `MASTER_ROADMAP.md` + `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` (C4 per SPEC §10).
- Commit C3 (REVIEW.md + this TEST_REPORT.md) + C4 (FOREMAN_REVIEW.md + master-doc updates).
- Release Pipeline session lock via `scripts/pipeline-coordination.mjs release`.

**Final English status line (Localhost-Tester chat):**
`✓ Smoke 8/8 PASS + VFV 🟢 (M4_DEMO_STATIC_LINKS_BACKFILL). New codes: bdf88e3c (stock), c2d22d16 (pricing).`
