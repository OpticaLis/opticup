# M4 — Demo Static Short-Links Backfill — Architecture Brief

> **Sealed:** 2026-05-21 · **Architect:** opticup-architect
> **Source:** SPEC request `roles/campaign-overseer/briefs/2026-05-21_DEMO_STATIC_LINKS_BACKFILL_SPEC_REQUEST.md`
> **Source Analyst finding:** `roles/campaign-overseer/analyses/2026-05-21_short_links_screen_visibility.md`
> **Risk class:** LOW — demo-only, additive, idempotent INSERTs to `short_links`. No prizma writes, no DDL, no EF, no code changes (data backfill only).
> **Iron Rule 32 — Destructive Operations:** `None.` Additive INSERTs only.
> **Iron Rule 33 — config-parity:** This Brief INTENTIONALLY does NOT promote to prizma — prizma already has both rows. The backfill closes a demo deficit; promotion would create duplicates.

---

## 0. Live-DB Baselines (P-AR-02 probes — pinned 2026-05-21)

| Symbol | Value | Source query |
|---|---|---|
| `BASE_DEMO_TENANT_ID` | `8d8cfa7e-ef58-49af-9702-a862d459cccb` | `SELECT id FROM tenants WHERE slug='demo'` |
| `BASE_PRIZMA_TENANT_ID` | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` | `SELECT id FROM tenants WHERE slug='prizma'` |
| `BASE_DEMO_TEMPLATE_STATIC_COUNT` | **2** rows (`NCoQWzbd` takanon + `dsruWc1z` gamaf) | `SELECT count(*) FROM short_links WHERE tenant_id=BASE_DEMO_TENANT_ID AND link_type='template_static'` |
| `BASE_PRIZMA_TEMPLATE_STATIC_COUNT` | **4** rows (`f9Avttrn` takanon, `KvSzd3Zz` gamaf, `5CBy1Do4` stock, `CEiBGCWj` pricing) | `SELECT count(*) FROM short_links WHERE tenant_id=BASE_PRIZMA_TENANT_ID AND link_type='template_static'` |
| `BASE_EXPIRES_AT` | `2099-12-31 23:59:59+00` | All existing `template_static` rows pin this value |
| `BASE_TARGET_URL_STOCK` | `https://www.prizma-optic.co.il/supersale-stock/` | Prizma's existing `5CBy1Do4.target_url` (demo reuses prizma storefront — verified by demo's NCoQWzbd already pointing at `www.prizma-optic.co.il`) |
| `BASE_TARGET_URL_PRICING` | `https://www.prizma-optic.co.il/supersalepricescatalog/` | Prizma's existing `CEiBGCWj.target_url` |
| `BASE_CODE_UNIQUE_SCOPE` | **GLOBAL** — index `short_links_code_unique` is on `(code)` alone, NOT on `(tenant_id, code)` | `\d+ short_links` — see §6 Findings/Tech-Debt |
| `BASE_NOT_NULL_COLS` | `tenant_id, code, target_url, link_type, expires_at, click_count, created_at` | `information_schema.columns WHERE table_name='short_links'` |
| `BASE_DEFAULT_LINK_TYPE` | `'other'` — MUST be overridden to `'template_static'` | column default |
| `BASE_DEFAULT_CLICK_COUNT` | `0` | column default |
| `BASE_DEFAULT_CREATED_AT` | `now()` | column default |

## 1. Goal (one line)

Insert exactly 2 `template_static` short_links rows on demo (one for `/supersale-stock/`, one for `/supersalepricescatalog/`) using fresh globally-unique codes, idempotently — so demo's "קישורים סטטיים (משותפים)" screen renders 4 rows (matching prizma's 4) and Daniel's `event_registration_open` template change can be tested on demo under Iron Rule 33.

## 2. Background

The Performance Analyst's diagnosis (2026-05-21) established three facts the Executor MAY treat as locked:

1. The CRM short-links stats screen at `modules/crm/crm-short-links-tiles/template-static-card.js` renders any row where `tenant_id=current AND link_type='template_static' AND expires_at > NOW()`. No date / click filter.
2. Demo today has 2 such rows; prizma has 4. The deficit (`/supersale-stock/` + `/supersalepricescatalog/`) was never created on demo.
3. Demo's existing `template_static` rows already point at the production `www.prizma-optic.co.il` storefront — demo does NOT use a separate demo storefront for these static marketing pages. Therefore the backfill targets the production URLs directly. No 404 risk on `/r/<code>` resolution (the storefront pages exist).

Iron Rule 35 prevents the Campaign Overseer from doing this work (templates / rules / broadcasts only, not infrastructure rows). Hence Architect-routed SPEC.

## 3. Scope — IN

- **2 INSERTs** into `public.short_links`, demo tenant only:
  1. stock → target `BASE_TARGET_URL_STOCK`
  2. pricing-catalog → target `BASE_TARGET_URL_PRICING`
- Both with: `tenant_id = BASE_DEMO_TENANT_ID`, `link_type = 'template_static'`, `expires_at = BASE_EXPIRES_AT`, `lead_id / event_id / broadcast_id / message_log_id = NULL`, a freshly-generated 8-character globally-unique `code` per row.
- **Idempotency contract** — re-running the migration MUST be a no-op. Use a `WHERE NOT EXISTS` clause keyed on `(tenant_id, link_type, target_url)` to gate the INSERT. The (tenant_id, link_type, target_url) triple is sufficient because the screen filter and the storefront URL together identify the operational identity of a static link; a re-run cannot create duplicates.
- **Code generation** — generate fresh 8-character base62-ish codes (alphanumeric, case-sensitive, matching the existing `f9Avttrn` / `5CBy1Do4` / `CEiBGCWj` shape). Verify each generated code is absent from the global `short_links.code` namespace before INSERT (the unique index is global per §6 finding). If a collision is detected, regenerate and retry up to 5 times; abort with explicit error if still colliding (statistically near-impossible at 8 chars × ~62 alphabet but the loop is there for correctness).
- **Verification** — Chrome MCP screenshot of demo's "קישורים סטטיים (משותפים)" section showing 4 rows including stock + pricing, AND a `/r/<new_code>` HTTP probe returning 302 → matching target URL (the `resolve-link` EF + storefront page both resolve correctly).

## 4. Scope — OUT

- No prizma writes of any kind. Prizma already has stock + pricing; touching it creates duplicates.
- No DDL — no schema changes, no UNIQUE-constraint fix (see §6 deferred finding).
- No code edits in `modules/crm/crm-short-links-tiles/*.js` — the screen is rendering correctly; UI clarity polish (Analyst §4.2) is deferred (see §7).
- No Sentinel mission addition for static-link parity (Analyst §4.3) — deferred (see §7).
- No "+ create static link" UI affordance — the campaign team's immediate need is the 2 demo rows; a creation UI is a separate SPEC if Daniel chooses to open one later.
- No edit to the `event_registration_open` template body — that is the Campaign Overseer's job, executed AFTER this SPEC closes and demo verification passes.

## 5. Iron-Rules Compliance Checklist

| Rule | Compliance |
|---|---|
| **Iron Rule 14** (tenant_id NOT NULL) | ✅ Each INSERT specifies `tenant_id = BASE_DEMO_TENANT_ID` explicitly. |
| **Iron Rule 15** (RLS) | ✅ `short_links` already carries canonical 2-policy RLS (`service_bypass` + JWT-claim). The migration runs via service_role, bypassing RLS appropriately. |
| **Iron Rule 18** (tenant-scoped UNIQUE) | ⚠️ NOT applied — `short_links.code` is GLOBALLY unique (existing index `short_links_code_unique`). This is a pre-existing IR18 deviation, NOT introduced by this SPEC. Deferred to §6 finding. The SPEC MUST honor the global-unique reality by generating codes that don't collide with ANY existing code in `short_links`. |
| **Iron Rule 21** (No Orphans, No Duplicates) | ✅ Idempotency guard via `WHERE NOT EXISTS` ensures a second run is a no-op. The Executor MUST verify the 2 target URLs are not already present on demo BEFORE the INSERT block executes. |
| **Iron Rule 22** (defense-in-depth on writes) | ✅ Each INSERT specifies `tenant_id` explicitly even though RLS would enforce it. |
| **Iron Rule 23** (no secrets) | ✅ No secrets touched. |
| **Iron Rule 32** (Destructive Ops declared) | ✅ Declaration: `None.` (this Brief; the SPEC inherits). |
| **Iron Rule 33** (demo-first) | ✅ This Brief IS the demo-first protocol's missing prerequisite. The Brief does NOT promote to prizma; prizma already has the 4 rows. |
| **Iron Rule 34** (UI VFV) | ⚠️ Partial — no `.js` / `.html` is modified, so the strict trigger does not fire. However P-AR-15 mandates VFV when the success criterion is user-observable. The Localhost-Tester MUST capture a Chrome MCP screenshot of demo's short-links stats screen showing 4 rows, OR Daniel hand-verifies on demo (operator's discretion at close). |
| **Iron Rule 35** (config-vs-infrastructure boundary) | ✅ This is infrastructure (short_links INSERTs), correctly routed to Architect-authored SPEC, not Campaign Overseer. |

## 6. Findings / Tech-Debt opened by this Brief

| ID | Finding | Severity | Disposition |
|---|---|---|---|
| F-IR18-SHORT-LINKS-CODE | The `short_links_code_unique` index is on `(code)` only, not `(tenant_id, code)`. This violates Iron Rule 18 ("UNIQUE constraints must include tenant_id"). Today's tenants happen not to collide; tenant #3 could collide if a code is reused. Fix shape: drop the global UNIQUE and add `(tenant_id, code) UNIQUE` plus a partial unique on `(code) WHERE tenant_id IS NOT NULL` if needed for `/r/<code>` resolution to remain O(1). Resolver behavior must be re-validated (it currently lookups by `code` alone — would need to add tenant scoping or another disambiguation). | MEDIUM (SaaS-litmus failure for tenant #3+; tenants 1+2 unaffected) | **Deferred** — separate SPEC `M4_SHORT_LINKS_CODE_UNIQUE_TENANT_SCOPING` to be queued post-cutover. Adding to TECH_DEBT register. |

## 7. Deferred / Related (NOT in this SPEC's scope)

These items were surfaced by the Analyst (§4.2, §4.3 of the analysis doc) but are explicitly NOT in this SPEC. Captured here so they don't get lost:

- **Static-card UX clarity** — add a helper line under "קישורים סטטיים (משותפים)" stating "אינו מושפע מהמסננים למטה" so future operators don't repeat Daniel's confusion. UI change, IR34 applies. Queue as `M4_SHORT_LINKS_STATIC_CARD_HELPER_TEXT` if Daniel later requests it.
- **Parity monitoring** — extend Sentinel Mission 11 (config parity) or the IR33 sync scripts to treat `link_type='template_static'` rows as part of M4 config-parity scope. Catches future drift automatically. Queue as `M4_STATIC_LINKS_IR33_PARITY_MONITOR`.
- **Create-static-link UI** — Daniel did not request this; operators currently rely on the Architect-routed SPEC mechanism whenever a static link is needed. No SPEC queued.
- **F-IR18-SHORT-LINKS-CODE fix** — see §6.

## 8. Success Criteria (P-AR-15 — VFV surfaces + bug-regression queries explicit)

The SPEC's §7 Success Criteria MUST include all of:

### 8.1 Data criteria (post-INSERT DB probe)

- (S1) `SELECT count(*) FROM short_links WHERE tenant_id=BASE_DEMO_TENANT_ID AND link_type='template_static' AND target_url='https://www.prizma-optic.co.il/supersale-stock/'` returns **1**.
- (S2) `SELECT count(*) FROM short_links WHERE tenant_id=BASE_DEMO_TENANT_ID AND link_type='template_static' AND target_url='https://www.prizma-optic.co.il/supersalepricescatalog/'` returns **1**.
- (S3) `SELECT count(*) FROM short_links WHERE tenant_id=BASE_DEMO_TENANT_ID AND link_type='template_static'` returns **4** (was 2 before; +2 from this SPEC).
- (S4) `SELECT count(*) FROM short_links WHERE tenant_id=BASE_PRIZMA_TENANT_ID AND link_type='template_static'` STILL returns **4** (prizma untouched).
- (S5) Both new demo `code` values do not appear anywhere else in `short_links.code` (global-unique constraint respected): `SELECT count(*) FROM short_links WHERE code IN (<new_demo_code_stock>, <new_demo_code_pricing>)` returns **2** (exactly the rows we just inserted, no collisions).
- (S6) Idempotency — running the migration a second time results in **0 rows inserted** (the `WHERE NOT EXISTS` guard fires).

### 8.2 VFV criteria (per P-AR-15)

- (S7) **VFV on surface `crm.html` → "קישורים קצרים" tab → "קישורים סטטיים (משותפים)" section (demo tenant)**: Chrome MCP screenshot at 1920×1080 shows exactly **4** rows; the 2 new rows display the new codes + their target URLs. **Bug from Brief §1 Goal verified RESOLVED:** demo screen now reaches parity with prizma's 4-row screen for the static-shared section.
- (S8) **`/r/<new_stock_code>` HTTP resolution check**: cURL or browser probe against `https://app.opticalis.co.il/r/<new_stock_code>` (or the local equivalent of `resolve-link` if tested via localhost) returns **HTTP 302** with `Location: https://www.prizma-optic.co.il/supersale-stock/`. The `resolve-link` EF + storefront page both resolve correctly. **Bug from Brief §3 IN-scope verified RESOLVED:** `/r/<code>` resolution works for both new codes.
- (S9) **`/r/<new_pricing_code>` HTTP resolution check**: same as S8 but for pricing-catalog URL.

### 8.3 Negative criteria (regression guards)

- (S10) Demo's 2 pre-existing `template_static` rows (`NCoQWzbd`, `dsruWc1z`) remain untouched — same `code`, same `target_url`, same `expires_at`, same `created_at` post-INSERT as pre-INSERT.
- (S11) Prizma's 4 `template_static` rows remain untouched (no writes to prizma anywhere in this SPEC).
- (S12) Integrity gate (`npm run verify:integrity`) exits 0 at SPEC closure.

## 9. Suggested commit shape (Module Strategist refines)

The SPEC SHOULD ship as **1 migration file + 0 code files**, e.g.:

- `supabase/migrations/<TIMESTAMP>_m4_demo_static_links_backfill.sql` — single migration containing:
  - 2x `INSERT INTO short_links (...) SELECT ... WHERE NOT EXISTS (SELECT 1 FROM short_links WHERE tenant_id = ... AND link_type='template_static' AND target_url = ...)` using PL/pgSQL helper for fresh code generation (use `substr(md5(random()::text || clock_timestamp()::text), 1, 8)` as the code source, with a `DO` block that loops until the code is not present in `short_links.code`).
  - Header comment block stating provenance (this Brief path + source SPEC request path + Analyst doc path).

The Localhost-Tester's VFV (S7–S9) runs on demo after migration apply.

## 10. Open questions for the Module Strategist (opticup-strategic)

None — the Brief locks all material decisions. The Module Strategist's job is to translate this Brief into a SPEC.md inside `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/` and route execution. Standard Full Auto Pipeline.

## 11. Authority Surfaces touched

| Surface | Touched? | How |
|---|---|---|
| `public.short_links` (DB table) | YES — write | 2 INSERTs on demo only |
| Any other DB table | NO | — |
| Any EF | NO | — |
| `modules/crm/**` JS/HTML/CSS | NO | — |
| `supabase/migrations/` | YES | 1 new file added |
| Storefront repo | NO | — |
| Sentinel missions / docs/guardian/ | NO | — |
| `docs/GLOBAL_SCHEMA.sql` / `docs/GLOBAL_MAP.md` | NO | data backfill only, no schema change |

## 12. Read List for the Module Strategist

Mandatory inputs the strategic skill MUST read before authoring SPEC.md:

- This Brief (the file you are reading)
- `roles/campaign-overseer/briefs/2026-05-21_DEMO_STATIC_LINKS_BACKFILL_SPEC_REQUEST.md` — original ask
- `roles/campaign-overseer/analyses/2026-05-21_short_links_screen_visibility.md` — Analyst's diagnosis
- `modules/crm/crm-short-links-tiles/template-static-card.js` — the screen's exact filter
- `CLAUDE.md` Iron Rules 14/15/18/21/22/23/32/33/34/35 — applicable rules per §5

Optional (open if questions arise):

- `docs/PUBLIC_DATA_LAYER.md` — separate concern, not touched here
- `supabase/functions/resolve-link/` — the `/r/<code>` resolver behavior; consult only if S8/S9 fails

---

## 13. Architect's note to the Module Strategist

This Brief is intentionally over-specified for a 2-INSERT SPEC because the verification criteria (S7–S9 VFV) carry the actual value — they prove the demo screen reaches parity and the resolver works, which is the entire point of the SPEC. A minimal "just run the INSERTs" approach would close 🟢 without proving the Campaign Overseer's blocker is actually cleared. P-AR-15 demands explicit bug-regression queries; this Brief delivers them.

§6 IR18 finding (global vs tenant-scoped UNIQUE on `code`) is the one strategic surprise from the live-DB probe. Do NOT fix it in this SPEC. Note it in the SPEC's findings section so the closure ceremony surfaces it as a separate queue item.

---

*Brief sealed. Module Strategist's job is to read this + write SPEC.md. Execution proceeds via Full Auto Pipeline.*
