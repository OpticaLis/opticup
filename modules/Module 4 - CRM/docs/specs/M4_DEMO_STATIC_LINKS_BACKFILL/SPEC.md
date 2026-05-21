# SPEC — M4_DEMO_STATIC_LINKS_BACKFILL

> **Template version:** v3 (2026-05-14)
> **Location:** `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-21
> **Module:** 4 — CRM
> **Phase:** (config-parity backfill — not a numbered phase)
> **Author signature:** claude-code session, Architect handoff → Foreman 2026-05-21
> **Source Brief:** `modules/Module 4 - CRM/architecture-brief/M4_DEMO_STATIC_LINKS_BACKFILL_BRIEF.md`
> **Source Analyst:** `roles/campaign-overseer/analyses/2026-05-21_short_links_screen_visibility.md`
> **Source SPEC Request:** `roles/campaign-overseer/briefs/2026-05-21_DEMO_STATIC_LINKS_BACKFILL_SPEC_REQUEST.md`

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-21 (Architect-authored in same Claude Code session, then Foreman hat loaded).
- Target table `public.short_links` exists; schema probed live; canonical 2-policy RLS confirmed via prior session work.
- Every column / value / tenant_id the Brief asserts was grep-/SQL-verified against live DB.
- Brief assumptions and repo reality are aligned: see Live-DB Baselines below.
- Lessons applied from prior `FOREMAN_REVIEW.md` files: see §12.
- Pre-existing untracked files surveyed: `git status --porcelain | grep '^??'` returned 7 entries pre-Pipeline; one (`regopen_email_preview.html` at root — Daniel's untracked email-preview scratch) had 9 NUL bytes of EOF padding (offset 13271–13280) flagged by Iron Rule 31 integrity gate. **Repaired in Pipeline pre-work** per Iron Rule 31's own recipe (truncate to byte 13271 + trailing LF). HTML content preserved 100%; only Cowork-VM EOF padding removed. Documented in FINDINGS.md. Executor uses selective `git add` by filename throughout (no `git add -A`).
- Color-form check: N/A (no visual re-skin).
- Baselines from LIVE measurement: see table below.
- Inner-call arity audit: N/A (this SPEC creates no functions, only data rows).
- Smoke-touched schema audit: applied — see §0.2.

### 0.1 Live-DB Baselines (P-AR-02 probes pinned 2026-05-21)

| Symbol | Value | How measured |
|---|---|---|
| `BASE_DEMO_TENANT_ID` | `8d8cfa7e-ef58-49af-9702-a862d459cccb` | `SELECT id FROM tenants WHERE slug='demo'` |
| `BASE_PRIZMA_TENANT_ID` | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` | `SELECT id FROM tenants WHERE slug='prizma'` |
| `BASE_DEMO_TEMPLATE_STATIC_COUNT_PRE` | **2** | `SELECT count(*) FROM short_links WHERE tenant_id=BASE_DEMO_TENANT_ID AND link_type='template_static'` |
| `BASE_PRIZMA_TEMPLATE_STATIC_COUNT_PRE` | **4** | `SELECT count(*) FROM short_links WHERE tenant_id=BASE_PRIZMA_TENANT_ID AND link_type='template_static'` |
| `BASE_EXPIRES_AT` | `2099-12-31 23:59:59+00` | Value pinned by all 6 existing `template_static` rows |
| `BASE_TARGET_URL_STOCK` | `https://www.prizma-optic.co.il/supersale-stock/` | Prizma `5CBy1Do4.target_url` (demo reuses prizma storefront — verified by demo's `NCoQWzbd.target_url` also pointing to `www.prizma-optic.co.il`) |
| `BASE_TARGET_URL_PRICING` | `https://www.prizma-optic.co.il/supersalepricescatalog/` | Prizma `CEiBGCWj.target_url` |
| `BASE_CODE_UNIQUE_SCOPE` | **GLOBAL** — index `short_links_code_unique` on `(code)` only | `pg_index` definition (`CREATE UNIQUE INDEX short_links_code_unique ON public.short_links USING btree (code)`). Confirms Appendix A7 known IR18 violation. |
| `BASE_INTEGRITY_GATE_PRE` | `exit 0` after EOF-padding repair on `regopen_email_preview.html` | `npm run verify:integrity; echo $?` |

### 0.2 Smoke-touched schema audit (mandatory for SPECs with §14 smoke against DB rows)

Smoke cases (§14) read/write `short_links`. Audit:

| Table | Columns smoke uses | Fixtures expected | Live state |
|---|---|---|---|
| `short_links` | `id, tenant_id, code, target_url, link_type, expires_at, lead_id, event_id, broadcast_id, click_count, created_at` | 2 demo `template_static` rows pre-SPEC (`NCoQWzbd`, `dsruWc1z`); 4 prizma `template_static` rows pre-SPEC (`f9Avttrn`, `KvSzd3Zz`, `5CBy1Do4`, `CEiBGCWj`) | all confirmed present |
| `short_link_clicks` | (read-only for VFV via FK join) | N/A — VFV does not depend on click rows | irrelevant for smoke |
| `tenants` | `id, slug` | `demo`, `prizma` rows | both present |

All fixtures present — **0 fixtures missing**.

### 0.3 Not-null column matrix

Migration must populate the following NOT-NULL columns explicitly (defaults noted):

| Column | NOT NULL | Default | Migration value |
|---|---|---|---|
| `id` | YES | `gen_random_uuid()` | omit (use default) |
| `tenant_id` | YES | — | `BASE_DEMO_TENANT_ID` |
| `code` | YES | — | fresh 8-char base62, globally-unique loop |
| `target_url` | YES | — | `BASE_TARGET_URL_STOCK` or `BASE_TARGET_URL_PRICING` |
| `link_type` | YES | `'other'` | `'template_static'` (MUST override default) |
| `expires_at` | YES | — | `BASE_EXPIRES_AT` |
| `click_count` | YES | `0` | omit (use default) |
| `created_at` | YES | `now()` | omit (use default) |

---

## 1. Goal

Insert exactly 2 `link_type='template_static'` rows on the demo tenant — one targeting `BASE_TARGET_URL_STOCK`, one targeting `BASE_TARGET_URL_PRICING` — with fresh globally-unique 8-char codes, idempotently, so demo's "קישורים סטטיים (משותפים)" screen renders 4 rows and the `event_registration_open` template change under Iron Rule 33 demo-first protocol becomes testable.

---

## 2. Background & Motivation

The Performance Analyst diagnosed (2026-05-21) that demo's short-links stats screen renders only 2 `template_static` rows while prizma renders 4. Root cause: the stock + pricing-catalog static links were never created on demo (per-tenant content parity gap, not a UI bug). Daniel's mid-flight change to the `event_registration_open` template — swapping the stock link for the pricing-catalog short link `CEiBGCWj` — cannot be tested on demo per Iron Rule 33 until demo equivalents exist (otherwise `/r/<code>` would return 404 on demo).

The Campaign Overseer cannot fix this (Iron Rule 35 — short_links infrastructure is not in the config-authority surface). Hence Architect-routed SPEC.

### Already-done discovery contingency

If the executor's Step 1 DB pre-flight finds that demo already has rows matching `(tenant_id=demo, link_type='template_static', target_url=BASE_TARGET_URL_STOCK)` and/or `BASE_TARGET_URL_PRICING` — these have been backfilled by another session/process since this SPEC was authored. **Action:** the idempotency guard (`WHERE NOT EXISTS`) inserts 0 rows; report the pre-existing state in EXECUTION_REPORT.md §2; smoke S1/S2/S5/S6 will pass on the existing rows; continue with VFV. No escalation needed.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| S1 | New stock row on demo | exactly 1 row | `SELECT count(*) FROM short_links WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND link_type='template_static' AND target_url='https://www.prizma-optic.co.il/supersale-stock/'` → `1` |
| S2 | New pricing row on demo | exactly 1 row | `SELECT count(*) FROM short_links WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND link_type='template_static' AND target_url='https://www.prizma-optic.co.il/supersalepricescatalog/'` → `1` |
| S3 | Demo template_static total | exactly 4 (was 2 pre-SPEC) | `SELECT count(*) FROM short_links WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND link_type='template_static'` → `4` |
| S4 | Prizma template_static unchanged | exactly 4 (untouched) | `SELECT count(*) FROM short_links WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND link_type='template_static'` → `4` |
| S5 | Global code uniqueness honored | exactly 2 (just the new rows, no collisions) | `SELECT count(*) FROM short_links WHERE code IN (<NEW_DEMO_CODE_STOCK>, <NEW_DEMO_CODE_PRICING>)` → `2` |
| S6 | Idempotency — second migration apply is no-op | exactly 0 inserts on re-run | `SELECT count(*) FROM short_links WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND link_type='template_static' AND target_url IN (BASE_TARGET_URL_STOCK, BASE_TARGET_URL_PRICING)` returns `2` both before and after a re-apply attempt; row IDs unchanged |
| S7 | **VFV — Chrome MCP screenshot of demo `crm.html` → "קישורים קצרים" tab → "קישורים סטטיים (משותפים)" section** | shows exactly 4 rows including both new codes pointing to stock + pricing URLs | localhost-tester Tier C VFV; bug from Brief §1 verified RESOLVED |
| S8 | **/r/<NEW_DEMO_CODE_STOCK> resolver** | HTTP 302 with `Location: https://www.prizma-optic.co.il/supersale-stock/` | `curl -sI -o /dev/null -w '%{http_code} %{redirect_url}' https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/resolve-link?code=<NEW_DEMO_CODE_STOCK>` (or whatever the live `/r/` path is on app.opticalis.co.il) → `302 https://www.prizma-optic.co.il/supersale-stock/` |
| S9 | **/r/<NEW_DEMO_CODE_PRICING> resolver** | HTTP 302 with `Location: https://www.prizma-optic.co.il/supersalepricescatalog/` | same as S8 with pricing code |
| S10 | Demo pre-existing template_static rows untouched | `NCoQWzbd` + `dsruWc1z` unchanged on all fields | `SELECT code, target_url, expires_at, created_at FROM short_links WHERE code IN ('NCoQWzbd','dsruWc1z') ORDER BY code` returns the same 2 rows as pre-SPEC (created_at unchanged) |
| S11 | No writes to prizma anywhere | prizma row count + per-row hash unchanged | `SELECT md5(string_agg(id::text || ':' || code || ':' || target_url, '|' ORDER BY code)) FROM short_links WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND link_type='template_static'` returns the same md5 pre and post |
| S12 | **Integrity Gate (Iron Rule 31)** | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo / any DB row.
- Run read-only SQL (Level 1 autonomy) via Supabase MCP.
- Apply the migration via Supabase MCP `apply_migration` to demo (Level 2 — pre-authorized by this SPEC for `short_links` INSERTs scoped to `tenant_id=BASE_DEMO_TENANT_ID`).
- Create the migration file at `supabase/migrations/<TIMESTAMP>_m4_demo_static_links_backfill.sql`.
- Generate fresh 8-char base62 codes locally (alphanumeric, no special chars). Verify global uniqueness inside the migration's PL/pgSQL block; loop with regen up to 5 times.
- Commit and push to `develop` using selective `git add` by filename (NO `git add -A` / `git add .`).
- Run all standard verify scripts (`verify.mjs`, `verify-tree-integrity.mjs`).
- Hand off to Reviewer + Localhost-Tester per Pipeline; collect their reports.
- Apply executor-improvement proposals from recent FOREMAN_REVIEWs that directly apply.

### What REQUIRES stopping and reporting

- Any write to `tenants` table, any prizma write, any other table beyond `short_links` (the only authorized target).
- Any schema/DDL change (this SPEC is data-only).
- Code-generation loop exceeds 5 collision retries — STOP and write escalation (statistically near-impossible).
- Integrity gate (S12) exits with code 1 (null-byte ERROR).
- VFV evidence shows fewer or more than 4 demo `template_static` rows post-INSERT, or the new codes don't render on the screen.
- Resolver tests S8/S9 return anything other than `302 → <expected target_url>`.

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

1. **Pre-flight count divergence** — if `BASE_DEMO_TEMPLATE_STATIC_COUNT_PRE` is not 2 OR `BASE_PRIZMA_TEMPLATE_STATIC_COUNT_PRE` is not 4 at executor pre-flight time, STOP. Either the baselines drifted (another session backfilled) or the analyst's diagnosis was incomplete. (Already-done contingency in §2 covers the legitimate "demo target_url already present" case — that's NOT a stop.)
2. **Code-generation collision exhaustion** — `WHILE i < 5 LOOP regen END` — if loop exits without a free code, STOP.
3. **Idempotency self-test mismatch** — if the migration runs locally and S6 fails (second apply inserts rows), STOP. Either the `WHERE NOT EXISTS` guard is wrong or the INSERT didn't dedupe correctly.
4. **Resolver returns 404 on either new code** (S8 or S9) — STOP. Either the `resolve-link` EF has unexpected state OR the storefront target page is gone OR the code wasn't actually inserted.

Daniel-decision STOP: **none in this SPEC** — all decisions are pre-baked in the Brief.

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:

```sql
-- Demo-only DELETE, tenant-scoped + link_type-scoped + target_url-scoped.
-- Iron Rule 32: this DELETE is the Rollback path, declared in §7.
DELETE FROM public.short_links
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND link_type = 'template_static'
  AND target_url IN (
    'https://www.prizma-optic.co.il/supersale-stock/',
    'https://www.prizma-optic.co.il/supersalepricescatalog/'
  );
```

- Git reset to `pre-m4-demo-static-links-backfill` tag (set by executor as Commit-1 prerequisite).
- Notify Foreman; SPEC marked REOPEN, not CLOSED.

Full rollback SQL lives in `ROLLBACK.md` adjacent to this SPEC (per template §6 doc-context rule for DELETE-containing rollback scripts).

---

## 7. Destructive Operations

**None.** Forward operation is additive INSERT only. The rollback path (DELETE in `ROLLBACK.md`) is NOT exercised in this SPEC's forward run; it is the rollback artifact only. If the executor ever invokes rollback, that is a separate event requiring fresh confirmation per CLAUDE.md §9 stop-on-deviation protocol.

(Iron Rule 32 declaration. Per Iron Rule 32 enforcement: an undeclared destructive op encountered mid-run requires escalation; this SPEC's forward path emits no destructive op.)

---

## 8. Out of Scope (explicit)

- **Prizma writes** — prizma already has both rows. Touching it creates duplicates. Migration scope is `tenant_id=BASE_DEMO_TENANT_ID` only.
- **DDL on `short_links`** — no schema change. The known `short_links_code_unique` global-not-tenant-scoped index (Brief §6 + Appendix A7) is a separate tech-debt SPEC, NOT this one.
- **`modules/crm/**` JS/HTML/CSS edits** — the screen renders correctly; the Analyst §4.2 helper-text UX clarity is a separate optional SPEC.
- **Sentinel mission additions** — Analyst §4.3 parity monitoring is deferred to a separate SPEC.
- **Edits to `event_registration_open` template** — Campaign Overseer's job AFTER demo verification passes.
- **Storefront repo** — not touched.
- **Any other DB table** — only `short_links` is written.

---

## 9. Expected Final State

### New files

- `supabase/migrations/20260521<HHMMSS>_m4_demo_static_links_backfill.sql` — single migration with 2 idempotent INSERTs on demo.
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/SPEC.md` — this file.
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/ROLLBACK.md` — rollback SQL (DELETE).
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/EXECUTION_REPORT.md` — Executor-written.
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/FINDINGS.md` — Executor-written (will document the `regopen_email_preview.html` repair).
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/REVIEW.md` — Reviewer-written.
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/TEST_REPORT.md` — Localhost-Tester-written.
- `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/FOREMAN_REVIEW.md` — Foreman-written at close.

### Modified files

- `regopen_email_preview.html` (at repo root) — Cowork-VM EOF padding (9 NUL bytes at offset 13271–13280) truncated per Iron Rule 31 recipe. HTML content preserved 100%. **Note:** file remains untracked — pre-existing Daniel scratch artifact, not staged for commit. The Executor verifies this stays untracked; selective `git add` by filename ensures no accidental staging.

### Deleted files

- None.

### DB state

- Demo `short_links` row count: increased by exactly 2 in the `template_static` bucket (2 → 4).
- 2 new rows with `tenant_id=BASE_DEMO_TENANT_ID`, `link_type='template_static'`, `expires_at=BASE_EXPIRES_AT`, `target_url ∈ {BASE_TARGET_URL_STOCK, BASE_TARGET_URL_PRICING}`, fresh globally-unique codes, all other relations (`lead_id`/`event_id`/`broadcast_id`/`message_log_id`) NULL.
- Prizma `short_links` untouched (S4 + S11 verify).

### Build-side-effect file expectations

- This SPEC runs no build step. No build artifacts expected.

### Docs updated (MUST include)

- `MASTER_ROADMAP.md` — single line under SPEC close mentions M4_DEMO_STATIC_LINKS_BACKFILL closure.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — note the backfill in the live state.
- **NOT updated:** `docs/GLOBAL_SCHEMA.sql` (no schema change) and `docs/GLOBAL_MAP.md` (no new function/contract). `CHANGELOG.md` for M4 may add a one-line entry but not required for data-only backfill.

---

## 10. Commit Plan

| # | Commit | Files | Type |
|---|---|---|---|
| C1 | `feat(m4): backfill demo static_template short_links (stock + pricing-catalog)` | migration file + SPEC.md + ROLLBACK.md | feat |
| C2 | `docs(m4): execution report + findings for M4_DEMO_STATIC_LINKS_BACKFILL` | EXECUTION_REPORT.md + FINDINGS.md | docs |
| C3 | `docs(m4): reviewer + localhost-tester reports for M4_DEMO_STATIC_LINKS_BACKFILL` | REVIEW.md + TEST_REPORT.md | docs |
| C4 | `docs(m4): foreman close for M4_DEMO_STATIC_LINKS_BACKFILL + master-doc update` | FOREMAN_REVIEW.md + MASTER_ROADMAP.md + SESSION_CONTEXT.md | docs |

**Pre-commit tag** (set by Executor before C1): `pre-m4-demo-static-links-backfill` at the current HEAD on `develop`. Used by Rollback (§6).

---

## 11. Dependencies / Preconditions

- Branch on `develop`, clean working tree apart from authorized files (executor enforces).
- Supabase MCP `apply_migration` available for demo project (`tsxrrxzmdxaenlvocyit`).
- Demo + prizma tenant rows present (verified at §0).
- `resolve-link` EF deployed and reachable for S8/S9 (used by existing prizma static codes; assumed already healthy).
- Chrome MCP available for S7 VFV (Localhost-Tester phase).

### Browser readiness pre-flight (executor instructs at start)

This SPEC's §3 has S7 which IS a browser action (Chrome MCP screenshot of demo `crm.html`). Localhost-Tester phase MUST confirm Chrome is running with `--remote-debugging-port=9222` before VFV. If not, surface BEFORE any DB write: "Browser-QA required by S7 — Chrome debug-port not detected — please start Chrome with `--remote-debugging-port=9222` before I proceed past commit." S8/S9 are HTTP/curl only — no browser required for those.

---

## 12. Lessons Already Incorporated

- From SPEC_TEMPLATE v3 (2026-05-14) and Foreman patterns:
  - **P-AR-02 live-DB probe at Brief authoring**: APPLIED — every numeric baseline in §0.1 cites the live query that produced it. No memory estimates.
  - **P-AR-15 VFV surfaces + bug-regression queries**: APPLIED — S7 explicitly names the surface, the screenshot conditions, and binds the bug ("demo screen reaches parity, including stock + pricing rows").
  - **P-AR-16 user-approved mockup MANDATORY input**: N/A — no mockup file exists for this SPEC; the diff is data-only.
  - **Pre-existing untracked files survey** (Appendix A4): APPLIED — surveyed at §0; Iron Rule 31 ERROR on `regopen_email_preview.html` repaired transparently per the rule's own recipe.
  - **Smoke-touched schema audit**: APPLIED at §0.2.
  - **Inner-call arity audit**: N/A — no SECDEF functions created.
  - **Status-column semantics probe (P-AUTHOR-1 from SECURITY_HOTFIX_3)**: N/A — no status-column policy added.
  - **Runtime semantics rehearsal (P-AUTHOR-2 from SECURITY_HOTFIX_2)**: N/A — no new RPC/policy/view.
  - **CSS layout hypothesis DOM-state rehearsal (P-AUTHOR-1 from M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2)**: N/A — no CSS change.
  - **Migration file naming convention**: matches existing repo standard `YYYYMMDDHHMMSS_<slug>.sql` (Supabase canonical), NOT the template's `_up.sql` hint. The repo convention wins (Authority Matrix §7).
  - **Backups gitignore-aware (P-AUTHOR-2 from SECURITY_HOTFIX_3)**: N/A — no backup folder created.
  - **From `STATUS_CHANGE_TRIGGERS_FRAMEWORK` FOREMAN_REVIEW**: live baselines, not memory — applied at §0.1.
  - **From `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX` FOREMAN_REVIEW**: pre-flight DB probe — applied at executor Step 1.5 in Brief.

### Concurrent-Pipeline orthogonality envelope

This SPEC touches **`public.short_links` (demo tenant only)**, **1 new migration file in `supabase/migrations/`**, and **files inside `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/`**. It WILL NOT conflict with any concurrent Pipeline operating on:

- Prizma `short_links` rows (only prizma writes are zero in this SPEC).
- Any other DB table (no other table touched).
- Any other module's `docs/specs/` folder.
- `modules/crm/**` code files (none modified).
- Storefront repo (not touched).

If a concurrent Pipeline's commits interleave between C1–C4, that is acceptable as long as the interleaved commits stay outside the scopes above. The Executor WILL abort if an interleaved commit touches `public.short_links` (regardless of tenant) or any file inside this SPEC's folder.

The active Pipeline lock for this SPEC was claimed via `node scripts/pipeline-coordination.mjs claim --spec-slug M4_DEMO_STATIC_LINKS_BACKFILL --branch-owned develop --files-owned-globs "supabase/migrations/**,modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/**"` before SPEC authoring began.

---

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria (S1–S12) pass with actual values captured in `EXECUTION_REPORT.md §2`.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2 after C1, C2, C3, C4. Null-byte ERROR (exit 1) blocks closure.
- [ ] `git status --short` returns empty (clean tree) after C4.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + REVIEW.md + TEST_REPORT.md + FOREMAN_REVIEW.md all present in the SPEC folder.
- [ ] **EXECUTION_REPORT.md §7 SPEC_TEMPLATE Version Footprint present** (literal string "No new template improvements to footprint this run" if empty).
- [ ] `MASTER_ROADMAP.md` + M4 `SESSION_CONTEXT.md` updated.
- [ ] Pipeline session lock released via `node scripts/pipeline-coordination.mjs release --spec-slug M4_DEMO_STATIC_LINKS_BACKFILL` after FOREMAN_REVIEW.md.

---

## 14. Smoke Test Cases

| Case | Type | Inputs | Expected | Pass/Fail rule |
|---|---|---|---|---|
| 1 | db | S1 query (stock row on demo) | count = 1 | exact match |
| 2 | db | S2 query (pricing row on demo) | count = 1 | exact match |
| 3 | db | S3 query (demo template_static total) | count = 4 | exact match |
| 4 | db | S4 query (prizma template_static unchanged) | count = 4 | exact match |
| 5 | db | S5 query (new codes globally unique) | count = 2 | exact match |
| 6 | db | S6 — re-apply migration | 0 new inserts; row IDs unchanged | exact match (idempotency contract) |
| 7 | visual-browser | S7 — open `http://localhost:3000/crm.html?t=demo` → "קישורים קצרים" tab → "קישורים סטטיים (משותפים)" section | 4 rows visible, new 2 codes shown with new target URLs | manual + chrome-devtools MCP screenshot |
| 8 | api | S8 — curl `/r/<NEW_DEMO_CODE_STOCK>` | HTTP 302 with `Location: BASE_TARGET_URL_STOCK` | shape + status |
| 9 | api | S9 — curl `/r/<NEW_DEMO_CODE_PRICING>` | HTTP 302 with `Location: BASE_TARGET_URL_PRICING` | shape + status |
| 10 | db | S10 — pre-existing demo rows untouched | NCoQWzbd + dsruWc1z fields unchanged (incl. created_at) | per-field comparison |
| 11 | db | S11 — prizma row hash unchanged | md5 string_agg pre = md5 string_agg post | exact match |
| 12 | code-review | S12 — `npm run verify:integrity; echo $?` | `0` or `2` | exact match (no `1`) |

S7 is `visual-browser` — runs in the Localhost-Tester phase (daytime, Chrome MCP active per §11 browser readiness pre-flight). S8/S9 are `api` (curl) and can run alongside DB smoke in the Reviewer + Tester phases.

---

*End of SPEC. Executor reads this + ROLLBACK.md sibling + applies migration via Supabase MCP `apply_migration` to demo. The 4-agent chain Foreman → Executor → Reviewer → Localhost-Tester → Foreman runs end-to-end per CLAUDE.md §11 Bounded Autonomy.*
