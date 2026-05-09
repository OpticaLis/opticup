# Activation Prompt — Overnight M1+M3 Burndown

> Daniel: copy everything between `--- BEGIN PROMPT ---` and `--- END PROMPT ---` into Claude Code. This is a 12+ hour unattended run.

--- BEGIN PROMPT ---

Load the `opticup-executor` skill. Read this SPEC in full first:

`modules/Module 1 - Inventory/docs/specs/M1_FIXES_2026_04_26/OVERNIGHT_M1_M3_BURNDOWN/SPEC.md`

Then execute the **13-item queue** below in order under maximal autonomy. Daniel approved this for an unattended overnight run on develop branch with explicit "fail forward" semantics — if you make a mistake, log it clearly, we'll fix tomorrow. **Bias to ship work; only stop on safety-rail violations** (listed below). **Documentation discipline is non-negotiable.**

## Global rules

1. **Branch:** develop only. Never main.
2. **In each item:** First Action protocol → execute → commit (two-commit pattern when source changes) → move to next.
3. **Stop-on-deviation triggers** (from each task's mini-spec) → halt the queue, write current state to `OVERNIGHT_REPORT.md`, exit cleanly. Don't loop.
4. **Hard safety rails (NEVER cross):**
   - No view modification (Iron Rule 29).
   - No DDL — `ALTER`, `CREATE`, `DROP` against any table.
   - No Edge Function deploy.
   - No commit to main.
   - No `git add -A` or wildcard git.
   - No edits to the `opticup-storefront/` sibling repo.
   - Don't touch the pre-existing dirty `outputs/`, `docs/guardian/*`, `event-open-email.html`, test artifacts, or any `*.test-*` files.
5. **Pre-existing dirty state:** carries forward from C1/D5/B1/D3+D4 — same option-B as before. Selective-add only.
6. **All work assumes scope-list mode:** each task lists its in-scope files; anything outside = stop trigger for that task (move to next item, don't halt the whole queue unless the violation is a safety rail).
7. **Time budget:** 12 hours. After T13 (audit) is done OR 12 hours elapsed, write `OVERNIGHT_REPORT.md` and exit.
8. **Documentation:** every item that does work writes its own EXECUTION_REPORT in its sub-folder. Final OVERNIGHT_REPORT summarizes everything.

## Queue

### T1 — D4-followup value normalization
Folder: create `M1_FIXES_2026_04_26/D4_FOLLOWUP_VALUE_NORMALIZATION/`.
**Goal:** Studio Products dropdown values must match LEGACY value space (`store_all`, `catalog`, `hidden`, empty=default), not the orphan `shop`.
**In-scope files:**
- `storefront-products.html` (lines 81-86 + 96-97 — replace `value="shop"` with `value="store_all"`)
- `modules/storefront/storefront-products.js` (line 116 — `modeLabels` and `modeTags` keys: `shop` → `store_all` with appropriate Hebrew label)
- ROADMAP.md status row update
- `D4_FOLLOWUP_VALUE_NORMALIZATION/SPEC.md` (write a brief 1-page sub-SPEC anchoring the change)
- `D4_FOLLOWUP_VALUE_NORMALIZATION/EXECUTION_REPORT.md`
**Two commits:** `fix(storefront): align Studio dropdown values with display_mode space (D4-followup)` + `chore(spec): close D4-followup with retrospective`.

### T2 — B5 selected-only filter server-side
Folder: `M1_FIXES_2026_04_26/B5_SELECTED_ONLY_SERVER_SIDE/`.
**Goal:** `toggleSelectedFilter()` (`inventory-table.js:248-262`) currently filters local 50-row page; must fetch all selected from server.
**Approach:** when `_selectedOnlyFilter` is true, run a query with `query.in('id', Array.from(invSelected))`. If `invSelected.size > 1000`, batch in 500-id chunks and union (URL length safety). Pattern reference: `inventory-export.js:127-144` already does the all-selected fetch.
**In-scope files:**
- `modules/inventory/inventory-table.js` (rewrite `toggleSelectedFilter` + thread the filter into `loadInventoryPage`)
- ROADMAP.md
- SPEC.md + EXECUTION_REPORT.md in the sub-folder
**Two commits:** `fix(inventory): selected-only filter fetches all selected from server (B5)` + chore-spec.

### T3 — B2+B3+B4 three new inventory filters
Folder: `M1_FIXES_2026_04_26/B2_B3_B4_INVENTORY_FILTERS/`.
**Goal:** add 3 dropdowns to inventory.html and wire to query.
**Filters:**
- B2 — חברה / brand_id → populate from `brands.name` for current tenant; sets `query.eq('brand_id', selected_id)`.
- B3 — סוג מותג / `brand_type` (values: `luxury`, `brand`, `regular`); sets `query.eq('brand_type', value)`.
- B4 — סוג סנכרון / `website_sync` (values: `full`, `display`, `none`); sets `query.eq('website_sync', value)`.
**Hebrew labels:** B2=חברה, B3=סוג מותג, B4=סוג סנכרון. Default option in each = "הכל".
**Verify:** all 3 + existing filters compose AND-style.
**In-scope:** `inventory.html`, `modules/inventory/inventory-table.js`, ROADMAP, SPEC + EXECUTION_REPORT.
**Two commits.**

### T4 — D1+D2 Brands tab UX simplification
Folder: `M1_FIXES_2026_04_26/D1_D2_BRANDS_TAB_UX/`.
**Goal:** collapse 3 confusing columns in `storefront-brands.js:57-123` to 2 columns:
- Show/hide toggle — boolean. ON = visible on storefront (clears `exclude_website`); OFF = hidden (sets `exclude_website=true`).
- Display mode dropdown — first option "ברירת מחדל (לפי המוצר)" maps to override null/empty; other options match LEGACY value space (`catalog`, `store`, `store_all`, `hidden`).
**Pattern:** keep the existing change-handlers; just consolidate the column rendering and update the labels.
**In-scope:** `modules/storefront/storefront-brands.js`, possibly `storefront-brands.html` if column headers live there, ROADMAP, SPEC + EXECUTION_REPORT.
**Two commits.**

### T5 — A4 cleanup failed-sync-files
Folder: `M1_FIXES_2026_04_26/A4_FAILED_SYNC_CLEANUP/`.
**Goal:** delete 151 files (47 KB) from `failed-sync-files` Storage bucket. No source code change.
**Approach:** use Supabase service-role admin API. List bucket → delete in batches of 100.
**Verify:** post-delete `count(*)` = 0 in storage.objects WHERE bucket_id='failed-sync-files'.
**In-scope:** SPEC.md + EXECUTION_REPORT.md only (no source). One commit: `chore(storage): clean failed-sync-files bucket (A4)`.

### T6 — A3 cleanup demo supplier-docs
Folder: `M1_FIXES_2026_04_26/A3_DEMO_SUPPLIER_DOCS_CLEANUP/`.
**Goal:** delete 119 PDFs (~64 MB) from `supplier-docs` bucket WHERE tenant_id = `8d8cfa7e-ef58-49af-9702-a862d459cccb` (demo). DO NOT TOUCH Prizma's 1 PDF.
**Approach:** filter on object metadata or path prefix. Verify per-tenant counts before + after.
**Stop trigger:** if any object's tenant_id is ambiguous → STOP, do not delete that one.
**One commit.**

### T7 — A1 image compression (27 product images)
Folder: `M1_FIXES_2026_04_26/A1_PRODUCT_IMAGE_COMPRESSION/`.
**Goal:** compress 27 images in `media-library/products/` (Prizma only) to ~200-300 KB each via 1200px max + WebP q80.
**Approach:**
1. List the 27 files. Capture original sizes + dimensions.
2. **Backup first:** copy each original to `media-library/products-backup-2026-04-26/<same-name>` BEFORE compressing. If backup fails for any file, skip that file and log it; don't proceed without backup.
3. Compress with `sharp` (in package.json — verify) or fallback to `node:sharp` import.
4. Upload compressed version to a NEW path `media-library/products/<id>.webp`. KEEP the original path intact temporarily.
5. Update `inventory_images.url` and `inventory_images.thumbnail_url` to point to the new compressed file (update one row at a time; verify each update before proceeding).
6. ONLY AFTER all 27 inventory_images rows are updated and a sanity check loads the storefront successfully, delete the original (now-orphaned) full-resolution files.
7. Stop trigger: if any single file fails to compress (corrupted, unsupported format) → log and skip that file, don't fail the whole batch.
**Demo tenant:** skip entirely.
**In-scope:** if a script is needed, add it as `scripts/compress-product-images.mjs`. Otherwise just docs.
**Two commits** (one if no source changes).

### T8 — Documentation commit
Folder: none (these are root-level docs in already-existing SPEC folders).
**Goal:** commit the pending Foreman docs that have piled up:
- `C1_PERMISSIONS_UPSERT/FOREMAN_REVIEW.md`
- `D5_HIDDEN_PRODUCT_RECOVERY/FOREMAN_REVIEW.md`
- `B1_NO_IMAGES_FILTER_SERVER_SIDE/FOREMAN_REVIEW.md` + `ACTIVATION_PROMPT.md`
- `D3_D4_DISPLAY_MODE_RECONCILIATION/FOREMAN_REVIEW_PHASE_B.md` + `RECONCILIATION_DECISION.md` + `ACTIVATION_PROMPT_PHASE_B.md`
- This SPEC folder + ACTIVATION_PROMPT
- `M1_FIXES_2026_04_26/ACTIVATION_PROMPT_C1_D5.md` (legacy combined prompt — also commit)
**Single commit:** `chore(spec): commit Foreman reviews + activation prompts from M1_FIXES batch`.

### T9 — A2 auto-compression on upload (90 min)
Folder: `M1_FIXES_2026_04_26/A2_AUTO_COMPRESSION_ON_UPLOAD/`.
**Goal:** wire image compression into the upload flow so future uploads land already-compressed.
**Steps:**
1. Grep the codebase for the upload flow — likely `inventory-images.js` or a similar file.
2. **Stop trigger:** if uploads go through an Edge Function, halt and log "needs Daniel sign-off" — do NOT modify Edge Functions.
3. If upload is browser-side: use Canvas resize before Storage write.
4. If upload is server-side / Node script: use `sharp`.
5. Target: same as T7 (1200px max, WebP q80).
6. Behavior: only the compressed version goes to Storage; no fallback to original.
**Two commits.**

### T10 — D7 media library performance (read-only investigation)
Folder: `M1_FIXES_2026_04_26/D7_MEDIA_LIBRARY_PERF_INVESTIGATION/`.
**Goal:** investigate `studio-media.js:52-123` — quantify the slow-loading problem.
**Steps:**
1. Read the file. Document the 3 known issues (count: 'exact', ilike 4 cols, parallel signed URLs).
2. Probe live Supabase REST endpoint (service role) — measure actual query times for the queries the file makes. Capture before-state metrics.
3. Propose a fix path: use `count: 'estimated'` instead of 'exact' for paginated lists, add an index on the search columns or use `or(...)` instead of multiple `ilike`s, batch signed URL requests in groups of 20.
4. Output: T10_MEDIA_LIBRARY_PERF_REPORT.md with measurements + proposed fix sketch.
**No source code changes** in this item. One commit: `chore(spec): D7 media library perf investigation`.

### T11 — D6 AI Content investigation (read-only)
Folder: `M1_FIXES_2026_04_26/D6_AI_CONTENT_INVESTIGATION/`.
**Goal:** investigate why AI content generation fails.
**Steps:**
1. Read `storefront-content.js:459-511` (the JS-side EF call).
2. Read the Edge Function source in `supabase/functions/<ai-content-related>/`.
3. Compare contracts: what headers/params does the JS send vs what does the EF expect.
4. Reproduce the failure by direct curl probe to the EF endpoint with the JS's exact payload.
5. Identify root cause: missing Authorization header? Malformed body? Permission gate?
6. Propose fix path. NO Edge Function deploys.
**Output:** `T11_AI_CONTENT_INVESTIGATION.md` with root cause + proposed JS-side patch.
**One commit:** `chore(spec): D6 AI content investigation`.

### T12 — Brand UI duplication housekeeping investigation (read-only)
Folder: `M1_FIXES_2026_04_26/T12_BRAND_UI_CONSOLIDATION/`.
**Goal:** decide which of `studio-brands.js` (Brand Page Editor) and `storefront-brands.js` (Brand Mode Manager) should remain.
**Steps:**
1. Compare features: what does each let admins do?
2. Recent commit history: which was recently improved?
3. Recommend: keep both / merge / delete one.
4. Output: `T12_BRAND_UI_CONSOLIDATION_PROPOSAL.md`.
**One commit.**

### T13 — COMPREHENSIVE AUDIT PASS (the most important deliverable)
Folder: `M1_FIXES_2026_04_26/T13_COMPREHENSIVE_AUDIT/`.

**Mission:** sweep Module 1 (Inventory) + Module 3 (Storefront/Studio) for unknown bugs, anchored in the patterns we discovered today. **Read-only.** No fixes, just findings + recommendations.

**Patterns to scan (each yielded a real bug today):**

1. **`onConflict` ↔ PK mismatch (C1 pattern):**
   `grep -rn "onConflict:" --include="*.js"` → for each hit, identify the table, look up its PK in `docs/GLOBAL_SCHEMA.sql` or `migrations/`, flag any mismatch. Especially check: `tenant_id` should be in onConflict for any multi-tenant table.

2. **Client-side filter on paginated result (B1 pattern):**
   `grep -A 5 "\.range(" --include="*.js"` → check if any `.filter(` call follows that mutates the data shape. Also scan for `count: 'exact'` followed by client-side .filter post-process. Each is a B1-class bug.

3. **Unrecoverable management UI states (D5 pattern):**
   grep for management-tab loaders that filter out a state (e.g., `if (resolved === ...) return false`). Flag any UI page that silently hides items based on a value the user could have set, without offering a way to revert.

4. **Schema split-brain (D3+D4 pattern):**
   read `docs/GLOBAL_SCHEMA.sql` columns. Look for pairs like `*_mode` + `*_status`, `*_override` + `*_default`, two columns whose values overlap conceptually. Cross-check with JS readers/writers.

5. **Dropdown ↔ value-space mismatch (D4-followup pattern):**
   for each `<option value="...">` in HTML, find the corresponding write site in JS, check the value lands in a column whose enum/CHECK constraint or canonical value list doesn't include it.

6. **Direct `sb.from()` instead of `DB.*` wrapper (Iron Rule 7):**
   `grep -c "sb\.from(" *.js modules/**/*.js` → top 5 offending files. List counts.

7. **UNIQUE without tenant_id (Iron Rule 18):**
   `grep -rn "UNIQUE" migrations/ docs/GLOBAL_SCHEMA.sql` → flag any UNIQUE that doesn't include `tenant_id`.

8. **Non-canonical RLS policies (Iron Rule 15):**
   read `modules/Module 3.1 - Project Reconstruction/db-audit/04-policies.md` → grep `auth.uid()`. Each hit is a Rule-15 violation.

9. **Files >350 lines (Iron Rule 12):**
   `find modules/ -name "*.js" -exec wc -l {} \; | sort -rn | head -30`. Flag any >350.

10. **`innerHTML` with non-escaped user input (Iron Rule 8):**
    `grep -rn "innerHTML\s*=" --include="*.js"` → for each, check if right-hand side is wrapped in `escapeHtml()` or is a string literal. Flag the rest.

**For each finding produce:**
```
### Finding N — <one-line title>
- **Severity:** CRITICAL | HIGH | MEDIUM | LOW
- **Pattern:** (number from list above)
- **Location:** file:line
- **Description:** what's wrong (1-3 sentences)
- **Recommended fix:** one-line action item
- **Estimated effort:** XS / S / M / L
```

**Output structure for `T13_COMPREHENSIVE_AUDIT_REPORT.md`:**
1. Executive summary (5 lines)
2. Findings ranked by severity → frequency
3. Pattern coverage table (which patterns yielded findings, sample counts)
4. Top 10 highest-priority items for tomorrow
5. Patterns that scanned clean (good news section)
6. Methodology notes (which greps/probes were used)

**Time budget for T13:** 3-4 hours. Aim for breadth > depth. If a single finding takes >10 minutes to verify, log it as "preliminary, needs deeper investigation" and move on.

One commit: `chore(audit): comprehensive M1+M3 bug surface audit`.

## Final step — OVERNIGHT_REPORT.md

After T13 (or 12 hours, whichever first):
- Folder: `OVERNIGHT_M1_M3_BURNDOWN/`
- File: `OVERNIGHT_REPORT.md`
- Content:
  - Items attempted (T1-T13): completed / partial / skipped (with reason)
  - Total commit hashes (sequential list)
  - Total findings count from T13 by severity
  - Recommendations for tomorrow's session (top 5 items)
  - Honest self-assessment (1-10) on adherence, autonomy, completeness, doc currency
  - List of "asked Daniel zero questions" claim (or, if you DID stop, why)

One commit: `chore(spec): close OVERNIGHT_M1_M3_BURNDOWN with summary`.

## Stop-on-deviation triggers (queue-level, NOT task-level)

The following halt the WHOLE queue (write OVERNIGHT_REPORT and exit):
- Safety rail violation (any of the 6 listed above)
- Auth credentials exhausted / `pin-auth` returns 401 repeatedly
- More than 3 consecutive task failures (something systemically wrong)
- 12-hour wall-clock elapsed
- Unexpected "main branch checked out" state
- `npm run verify:integrity` fails on a tracked file (corruption — investigate)

Anything else: log it as a finding in OVERNIGHT_REPORT, move to the next task. **Bias to ship; failures of individual tasks are OK.**

## Final report (chat output)

Single message back when run is complete (or queue halted):
- Items completed: list of T-numbers
- Commit hashes (count + range)
- Findings count from T13
- Verdict: "Overnight burndown done — N items closed, M findings logged. Awaiting Foreman review."

--- END PROMPT ---
