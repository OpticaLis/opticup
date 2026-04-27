# SPEC — Overnight M1+M3 Burndown (2026-04-26 → 2026-04-27)

> **Author:** opticup-strategic (Cowork session, 2026-04-26 evening)
> **Run time budget:** 12+ hours unattended
> **Branch:** develop only — never main
> **Bias:** progress + discovery > perfection. Daniel approved aggressive scope on develop ("worst case we know where it went wrong and fix later").
> **Master goal:** close as many of the remaining ROADMAP rows as safely possible, AND run a comprehensive audit pass that surfaces unknown bugs across Module 1 + Module 3 so we have a prioritized list for tomorrow.

---

## 1. Run Structure

The activation prompt sequences **12 work items** across 4 tiers. The executor
attempts them in order. After each item:

- Match expected outcome → continue.
- Stop-on-deviation → halt the queue, write what's done so far to OVERNIGHT_REPORT.md, exit cleanly. Daniel reviews in morning.

Hard time budget: **12 hours**. If the queue isn't done, that's fine — the audit pass (Tier 4) is the most important deliverable and runs even if Tier 2-3 items get skipped.

| Tier | Items | Risk | Notes |
|------|-------|------|-------|
| 1 — Quick wins | T1-T6 | low | small SPECs, well-scoped patterns from this batch |
| 2 — Medium scope | T7-T10 | low-med | additive features, image processing, perf invest |
| 3 — Speculative | T11-T12 | med | Edge Function debug, perf optimization (no deploy without QA) |
| 4 — Comprehensive audit | T13 | zero (read-only) | Sentinel-style sweep across M1 + M3, surfaces unknown bugs |

## 2. The 13 Work Items

Inline mini-specs. The activation prompt enforces the order + stop triggers.

### T1 — D4-followup value normalization (5 min)
Update Studio Products dropdown values to match LEGACY value space:
- `storefront-products.html:84-86` and `:96-97`: change `value="shop"` to `value="store_all"`.
- `storefront-products.js:116`: update `modeLabels` and `modeTags` keys.
Single file pair. Two-commit pattern.

### T2 — B5 selected-only filter server-side (15 min)
Pattern from B1: `inventory-table.js:248-262` (`toggleSelectedFilter`) currently filters local `invData`. Move it to a server query that fetches by `id IN (selected_ids)`. Stop-on-deviation: if `invSelected.size > 500`, the query must batch — use the same approach as Excel export (`inventory-export.js:127-144`). Two-commit pattern.

### T3 — B2+B3+B4 three new inventory filters (45 min)
Add three `<select>` dropdowns to `inventory.html` after existing filters (lines 190-196):
- B2: חברה (brand name) — populated from `brands.name` for current tenant
- B3: סוג מותג (`brand_type`) — values: `luxury`, `brand`, `regular`
- B4: סוג סנכרון (`website_sync`) — values: `full`, `display`, `none`
Wire to `loadInventoryPage()` query. Each filter as separate `.eq()` clause when set. Verify filter composition (each combines AND-style with existing ones). Two-commit pattern.

### T4 — D1+D2 Brands tab UX simplification (30 min)
Per ROADMAP D1+D2: collapse "סנכרון" + "מצב תצוגה" + "תצוגה באתר" (3 columns in `storefront-brands.js:57-123`) to 2 logical columns:
- Show/hide toggle (single boolean) → maps to `exclude_website` for OFF, plus appropriate display_mode for ON.
- Display mode dropdown with first option "default (from inventory setting)" → empty/null override.
Live-edit semantics preserved. Two-commit pattern.

### T5 — A4 cleanup failed-sync-files (5 min)
Delete the 151 files in `failed-sync-files` Storage bucket (47 KB total). Use service-role admin API. No code changes. One commit (no source changes; doc-only ROADMAP update + audit log entry). After delete, verify `SELECT count(*) FROM storage.objects WHERE bucket_id='failed-sync-files'` = 0.

### T6 — A3 cleanup demo supplier-docs (10 min)
Delete 119 PDFs from `supplier-docs` bucket WHERE tenant_id = demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`). Total ~64 MB. Do NOT touch Prizma's 1 file. Verify post-delete count for demo = 0, Prizma unchanged.

### T7 — A1 image compression (60 min)
Compress the 27 product images in `media-library/products/` from avg 2.5 MB to 200-300 KB target. Approach:
- Tools: `sharp` is already in package.json (verify), or Node-native `node:sharp`.
- Target: 1200px max width, WebP quality 80.
- Workflow: download original → compress → upload as new file → update `inventory_images.url` + `inventory_images.thumbnail_url` to new path → delete originals only AFTER URL update succeeds.
- Tenant scope: only Prizma (real production). Skip demo (no value).
- Two-commit pattern: code commit (the script if added) + chore commit (report + ROADMAP).
- **Backup:** keep originals in a `media-library/products-backup-2026-04-26/` folder until Daniel signs off (manual cleanup later).

### T8 — Documentation commit (10 min)
Commit the 4-5 pending Foreman docs that have accumulated:
- `C1_PERMISSIONS_UPSERT/FOREMAN_REVIEW.md`
- `D5_HIDDEN_PRODUCT_RECOVERY/FOREMAN_REVIEW.md`
- `B1_NO_IMAGES_FILTER_SERVER_SIDE/FOREMAN_REVIEW.md`
- `D3_D4_DISPLAY_MODE_RECONCILIATION/FOREMAN_REVIEW_PHASE_B.md`
- `D3_D4_DISPLAY_MODE_RECONCILIATION/RECONCILIATION_DECISION.md`
- `D3_D4_DISPLAY_MODE_RECONCILIATION/ACTIVATION_PROMPT_PHASE_B.md`
- `B1_NO_IMAGES_FILTER_SERVER_SIDE/ACTIVATION_PROMPT.md`
Single chore commit: `chore(spec): commit Foreman reviews + activation prompts from M1_FIXES batch`.

### T9 — A2 auto-compression on upload (90 min)
Add image compression to the upload flow in `inventory-images.js` (or wherever uploads happen — grep first). Approach:
- Hook into the upload pipeline before Storage write.
- Use `sharp` (Node) or browser-native `Canvas` resize — pick whichever fits the existing flow.
- Target same as T7: 1200px max width, WebP quality 80.
- For each new upload: original → compressed → upload only the compressed version.
- Two-commit pattern.
- **Stop trigger:** if the upload flow uses an Edge Function, STOP — no Edge Function deploys without Daniel sign-off.

### T10 — D7 media library performance investigation (60 min)
Read-only investigation of `studio-media.js:52-123`. Identify:
- The 3 issues flagged in ROADMAP (count: 'exact' on every reset, ilike across 4 cols, parallel signed URL requests).
- Concrete metrics: how slow is "very slowly"? Time the actual queries via direct Supabase REST probes.
- Propose a fix path with specific changes + estimated impact.
- Output: `T10_MEDIA_LIBRARY_PERF_REPORT.md` in this SPEC folder. NO source code changes.

### T11 — D6 AI Content investigation (60 min)
Read-only debug of `storefront-content.js:459-511`. Identify:
- Missing Authorization header? Reproduce by reading the Edge Function call construction.
- Error handling gaps (lines 499-508 log to console only).
- Edge Function's actual contract — read its source in `supabase/functions/`.
- Propose fix path. NO Edge Function deploys.
- Output: `T11_AI_CONTENT_INVESTIGATION.md` in this SPEC folder.

### T12 — Brand UI duplication housekeeping investigation (30 min)
Read-only follow-up to D3+D4 finding 3-B (the two parallel Brands UIs). Determine:
- Which UI is more recent/canonical?
- What features does each have that the other doesn't?
- Recommend: consolidate / delete one / leave both.
- Output: `T12_BRAND_UI_CONSOLIDATION_PROPOSAL.md` in this SPEC folder.

### T13 — COMPREHENSIVE AUDIT PASS (3-4 hours, the most important deliverable)

Sentinel-style sweep across **Module 1 (Inventory)** + **Module 3 (Storefront/Studio)**. The executor's mission is to surface bugs/issues we don't know about yet, anchored in the patterns we've discovered today.

**Patterns to scan for explicitly (each one yielded a real bug today):**

| Pattern | What to find | Inspired by |
|---------|--------------|-------------|
| `onConflict` clauses missing tenant_id | grep all `.upsert(_, { onConflict: '...' })`, cross-check against PK definitions in db-schema. Flag mismatches. | C1 |
| Client-side filters on paginated results | grep `.filter()` calls AFTER `.range()` in `loadXxxPage()` patterns. Flag any that change `count`/`totalCount`. | B1 |
| UI rows that disappear with no recovery path | grep `if (resolved === ... ) return false;` patterns. Flag any management UI that filters out a state without offering a way to undo. | D5 |
| Schema split-brain (two columns/fields with overlapping semantics) | scan db-schema for column pairs like `display_*` + `storefront_*`, `mode` + `status`, etc. Cross-check JS readers/writers. | D3+D4 |
| Dropdown value-space mismatches | for each `<option value="...">` in HTML files, check if the value matches what the storefront/view actually accepts. | D4-followup |
| Direct `sb.from()` calls instead of DB wrapper | grep, count per file. Top offenders go in report. | Iron Rule 7 |
| UNIQUE constraints missing tenant_id | grep CREATE UNIQUE INDEX in migrations + db-schema. | Iron Rule 18 |
| RLS policies not matching canonical JWT pattern | parse db-audit/04-policies.md for any `auth.uid()` usage. | Iron Rule 15 |
| Files exceeding 350 lines | `find . -name "*.js" | wc -l` filter. | Iron Rule 12 |
| Innerhtml with non-escaped user input | grep `innerHTML\s*=\s*[^'"]` patterns where the right side isn't `escapeHtml(...)`. | Iron Rule 8 |

**Output:** `T13_COMPREHENSIVE_AUDIT_REPORT.md` in this SPEC folder, with each finding formatted:

```
### Finding N — <one-line title>
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **Pattern:** (which pattern from the table above)
- **Location:** file:line
- **Description:** what's wrong
- **Recommended fix:** what to do (NO fixing yet — just recommendations for tomorrow's prioritization)
```

Findings are RANKED by severity then frequency. Report includes:
- Total findings count by severity
- Top 5 highest-priority items
- Pattern coverage table (which patterns yielded findings, which were clean)
- Recommendations for next priority sprint

**Crucial:** the audit pass is READ-ONLY. NO source code changes. NO DB writes (read-only DB probes are fine). The output is a roadmap for tomorrow's work.

## 3. Safety Rails (non-negotiable)

The executor MUST NOT do any of the following without stopping:
- Edit files in `opticup-storefront/` (sibling repo) — out of scope for this run.
- Modify any view (`v_*`) — Iron Rule 29.
- Run any DDL (`CREATE`, `ALTER`, `DROP`) — Level 3 SQL.
- Deploy any Edge Function — needs Daniel sign-off.
- Commit to main branch — only Daniel authorizes.
- `git add -A` or any wildcarded git operation.
- Touch the pre-existing dirty `outputs/`, `docs/guardian/*`, test artifacts (option B from C1 still applies).

## 4. Deliverable

A single `OVERNIGHT_REPORT.md` in this SPEC folder summarizing:
- Items attempted, items completed, items skipped (with reason)
- Commit hash list
- Findings count from T13
- Recommendations for the next session
- Any deviations + how they were handled
- Honest self-assessment

## 5. Foreman expectations after run

When Daniel reviews in the morning, I (Foreman) will:
1. Read OVERNIGHT_REPORT.md first.
2. Read each EXECUTION_REPORT for items the executor closed.
3. Spot-check 2-3 commits.
4. Read T13_COMPREHENSIVE_AUDIT_REPORT carefully and prioritize findings.
5. Author tomorrow's session SPECs based on the audit's top items.

## 6. Activation Prompt

Lives in the sibling file: `ACTIVATION_PROMPT.md`.
