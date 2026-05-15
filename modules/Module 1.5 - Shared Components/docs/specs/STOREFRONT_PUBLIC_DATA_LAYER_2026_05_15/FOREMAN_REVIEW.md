# FOREMAN_REVIEW — STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15

**Reviewer:** opticup-strategic (Foreman hat, post-execution).
**Pipeline mode:** Full-Auto, single Claude Code chat, Opus 4.7 (1M context).
**Date:** 2026-05-15 evening.
**Verdict:** 🟢 **CLOSED**.

---

## 1. SPEC quality audit

The SPEC was authored under tight constraints (replacing a retired stub same-day, foundational architectural scope, 2-3 day estimate compressed to single chat) and is **mostly good** with 3 distinct defects caught + corrected in-flight by the Executor.

### Strengths

- **Measurable success criteria** — 32 criteria with explicit expected values (file counts, line counts, BASE_PRIZMA_* row counts, advisor delta, latency caps, smoke 7/7). Each is independently verifiable post-execution. Strong template adherence.
- **Pre-flight discipline** — §1.5 captured live `pg_get_viewdef` for all 8 views, RLS state for the 8 base tables, anon GRANT state, latency baseline, and ai_content.status semantics probe (P-AUTHOR-1 lesson from HOTFIX_3 applied correctly). Caught the 3-extra-base-tables Brief omission + the `ai_content.status='published'` 0-row trap BEFORE seal.
- **Pattern A vs B decision with reasoning** — §6 dimension-by-dimension comparison ending in Pattern A across 7 of 9 dimensions. Honest scoring; didn't bury the storage cost.
- **STT triggers narrow + specific** — 11 stop-triggers (STT-1 through STT-11), each tied to a measurable signal. Bounded Autonomy stayed practical, not paralyzing.
- **Destructive Operations declaration** — 12 numbered items covering the 6 CREATE TABLE + 6+2 CREATE TRIGGER + 6 CREATE FUNCTION + 18 CREATE POLICY + 6 GRANT + 8 CREATE OR REPLACE VIEW + 6 REVOKE + 1 REVOKE + backfill INSERTs + git tags. Iron Rule 32 declared up front.

### Defects (3 — all caught + corrected in-flight by the Executor)

| # | Defect | Severity | Discovery point | How resolved |
|---|---|---|---|---|
| 1 | **Duplicate `## 3.` headings + Iron-Rule-32 hook regex collision.** SPEC has both `## 3. Success Criteria` (line 199) and `## 3. Destructive Operations (...)` (line 379). Worse, the latter's trailing parenthetical violated the hook regex `/^##\s+(?:\d+\.\s+)?Destructive Operations\s*$/m`. | MEDIUM (blocked Commit 1 twice) | Executor's first commit-message attempt | Renamed to bare `## Destructive Operations` + parenthetical to sibling paragraph; logged as FINDING F-1 for full SPEC monotonic renumbering. |
| 2 | **Brief §3.1 column allow-list incomplete for `inventory_public`.** The Brief table listed inventory-side columns only ("...computed display fields, only those v_storefront_products currently projects"). The actual view ALSO depends on `ai_content` (3 subqueries), `inventory_images` (EXISTS + JSON aggregate), and brand-side filters (active + exclude_website + brand_page_visibility). The SPEC §1.5 caught the table list expansion (5 → 8 base tables) but didn't update §3.1's filter detail to match. | LOW (caught by Executor's live `pg_get_viewdef` recheck during Commit 3 pre-flight) | Commit 3 inventory_public design phase | Executor used the **full 8-condition filter** for backfill + trigger visibility check; logged as FINDING F-3. Mirror count = view count = 1133 exactly. |
| 3 | **Original v_storefront_brands EXISTS check semantics not preserved by naive rewrite.** SPEC §6 said the rewrite should source from public-data-layer mirrors. The naive translation of `EXISTS (SELECT 1 FROM inventory ... WHERE is_deleted=false AND website_sync<>'none')` to `EXISTS (SELECT 1 FROM inventory_public ...)` was MORE RESTRICTIVE because inventory_public is the strict 8-condition anon-visible set, not the loose website-sync set. Result: 47 brands instead of 155. STT-2 row-count drift fired. | MEDIUM (would have broken the storefront's brand-list UI) | Commit 4 verification | Executor added `brands_public.has_sellable_inventory boolean` cache column + a 3rd satellite trigger `tr_sync_inventory_to_brands_has_sellable` to refresh it. Same family as the AI cache on inventory_public — additive scope expansion within the SPEC's spirit. Brand count restored to 155 Prizma. Logged as FINDING F-4 (which queues a 4th satellite for brand state cascade as a follow-up SPEC). |

### What the SPEC should have done (lessons for next time)

1. **Heading-numbering audit at author time.** Quick grep `^## ` on the SPEC.md before sealing would have caught the duplicate `## 3.` immediately.
2. **Brief column allow-list as machine-checked verification.** When the Brief table says "the columns from v_storefront_products", the SPEC should paste the live `pg_get_viewdef` output verbatim, not interpret it.
3. **View-rewrite semantics rehearsal** — extend Step 1.5.3 to include "for each view's WHERE/EXISTS predicate, identify whether the rewrite preserves the source-set's size; if any predicate changes scope, flag as a SPEC §5 STT trigger."

---

## 2. Execution quality audit

### Following the SPEC

The Executor adhered closely to the SPEC's Pattern A architecture, migration order (tenant_branches → storefront_config → media_library → brands → inventory_images → inventory), and per-table flow (pre-tag → snapshot → migrate → backfill → verify count → E2E). 26 trigger E2E cases authored (versus 18 minimum specified). All 32 Success Criteria are PASS or PARTIAL (with PARTIAL explained as pre-existing storefront-app behavior, not regression).

### Real-time decisions (Bounded Autonomy)

The Executor made 5 explicit real-time decisions logged in EXECUTION_REPORT §5. All 5 are defensible:

| # | Decision | Foreman assessment |
|---|---|---|
| 1 | Backfill GLOBALLY (not demo-only) in Commits 2-3 | **CORRECT.** Views and REVOKE are global PG ops. SPEC §6 step (d) backfill SQL had no tenant filter. Demo-first verification cycle preserved via E2E on demo only. |
| 2 | Use full 8-condition filter for inventory_public (vs Brief §3.1 partial) | **CORRECT.** Mirror == view is the right invariant. Brief §3.1 was incomplete. |
| 3 | NOT cache brand_name/brand_type on inventory_public | **CORRECT.** SPEC §6 didn't ask for it; JOINing brands_public is cheaper than denormalization churn. |
| 4 | Markers on demo only, never Prizma | **CORRECT.** Activation prompt explicit; STT-5 forbids Prizma writes. |
| 5 | Pre-existing untracked files left intact (Full-Auto mode) | **CORRECT.** Followed the established Full-Auto Pipeline protocol per opticup-executor SKILL "Pre-existing untracked / modified files in Full-Auto Pipeline mode" exception. Asked Daniel once at session start, used selective `git add` throughout. |

### Stop-on-deviation discipline

The Executor stopped 2 times in the right way:

- **Commit 4 (D-1) view-rewrite first attempt failed** because `latitude numeric(9,6) → numeric` is a forbidden type change in CREATE OR REPLACE VIEW. Stopped, queried column types, applied 1 ALTER TABLE migration, retried. Right pattern.
- **Commit 4 (D-2) row-count drift on v_storefront_brands**. Could have been silently absorbed (the view returns valid data, just 47 rows instead of 155). Executor DID NOT silently absorb — they fixed the root cause (added `has_sellable_inventory` cache) and logged in VIEW_REWRITE_SUMMARY.md. Right pattern.

### Did NOT stop when they should have? (audit)

I checked. No.

### Spot-check verification (Foreman's verification of executor's claims)

I cross-checked 3 claims:

1. **F-CRIT-2 = 0 advisor delta.** Verified by independent grep of the saved advisor file at `tool-results/mcp-claude_ai_Supabase-get_advisors-1778847229284.txt`: `python3 -c "import json; d=json.load(open('...')); print(len([l for l in d['result']['lints'] if l['name']=='security_definer_view']))"` → 0. ✅
2. **v_storefront_products latency 480→44ms.** Verified by reading the EXPLAIN ANALYZE output captured in Commit 6 — `Execution Time: 44.693 ms` against `BASE_LATENCY_PRODUCTS_MS=480.91`. ✅
3. **Prizma brand count = 155.** Verified by the post-fix SQL in Commit 4: `prizma_brands = 155` matches `BASE_PRIZMA_BRANDS = 155`. ✅

Executor's claims hold up under spot-check.

### Commit hygiene

7 commits, each with a multi-paragraph body citing the Iron-Rule-32 declared destructive ops + the SPEC §3 success criteria advanced + the backup folder path + the pre-tag name. Forensic-grade. One imperfection: Commit 6 (verification) could arguably have been folded into Commit 5 (REVOKE) — but separating them aids forensics, and the Executor flagged this themselves in self-assessment.

---

## 3. Findings processing

8 findings logged in FINDINGS.md. Foreman dispositions:

| # | Severity | Disposition |
|---|---|---|
| F-1 | MEDIUM (SPEC renumbering) | **Action:** apply as part of the next opticup-strategic touch to this SPEC (or its archive). Cosmetic but improves discipline. **Owner:** Foreman, next SPEC author who copies this template. **No follow-up SPEC.** |
| F-2 | LOW (Brief column allow-list incomplete) | **Action:** add to FINDINGS as lesson for next Brief author. **No follow-up SPEC.** Codified in opticup-strategic improvement P-AUTHOR-2 below. |
| F-3 | LOW (BASE_INVENTORY_BACKFILL wrong filter) | **Action:** same as F-2 — codified in P-AUTHOR-2. |
| F-4 | LOW (brand state doesn't cascade to inventory_public visibility) | **Follow-up SPEC:** `STOREFRONT_PUBLIC_DATA_LAYER_BRAND_VISIBILITY_CASCADE` — adds 4th satellite trigger on brands → re-evaluates inventory_public visibility for affected brand_id. ~1 hour. Owner: Module 1.5 Foreman, queue in OPEN_TASKS. |
| F-5 | LOW (10 new SECDEF function advisor findings) | **Follow-up SPEC:** `STOREFRONT_PUBLIC_DATA_LAYER_FUNCTION_REVOKES` — REVOKE EXECUTE FROM anon, authenticated on the 9 trigger functions. Same-day-able. ~30 min. Owner: Module 1.5 Foreman, queue in OPEN_TASKS. |
| F-6 | INFO (/brands/<slug>/ 404 on Prizma) | **Storefront-side concern.** Not Module 1.5 scope. Logged in storefront repo's backlog. **No follow-up SPEC in this module.** |
| F-7 | INFO (/about/ 404 on both tenants) | **Storefront-side concern.** Same as F-6. |
| F-8 | INFO (URL pattern unclear) | **Storefront-side concern.** Same as F-6. |

**3 follow-up SPECs queued from this run** (2 in Module 1.5, 0-1 in Module 3 depending on Daniel's call on F-6/F-7/F-8).

---

## 4. Master-doc update checklist

| Doc | Updated this commit range? | Notes |
|---|---|---|
| `MASTER_ROADMAP.md` | ✅ (Commit 10) | Top reconciliation note + foundation milestone recorded. |
| `docs/GLOBAL_MAP.md` | ✅ (Commit 10) | §4.1 Views table extended; new §4.6 Public Data Layer subsection. |
| `docs/GLOBAL_SCHEMA.sql` | ✅ (Commit 10) | Public Data Layer section appended (record-of-change, references Supabase schema_migrations for live DDL). |
| `docs/PUBLIC_DATA_LAYER.md` | ✅ NEW (Commit 10) | 112 lines, 5 sections per SPEC §3 #24. |
| `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` | ✅ (Commit 10) | Top Current Status replaced. |
| `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` | ✅ (Commit 10) | New 2026-05-15 evening section: 6 commits, 9 migrations, verification deltas, 4 open follow-ups. |
| `OPEN_TASKS.md` | ✅ (Commit 10) | Top header updated + Task #0 (HOTFIX_4) marked SUPERSEDED. |
| `docs/FILE_STRUCTURE.md` | NOT touched | One new file (`docs/PUBLIC_DATA_LAYER.md`) + one new SPEC folder. Should be reflected at next Architect session's structure audit (or M1.5 module Integration Ceremony). Minor — deferring. |
| `docs/DB_TABLES_REFERENCE.md` | NOT touched | 6 new mirror tables not yet registered as T-constants (no application code consumes them yet — views do). Deferring until first ERP application code reads from them. |
| `docs/CONVENTIONS.md` | NOT touched | The "public-data-layer / mirror table" pattern is now a project-level pattern. Could be documented here for future modules. **Action:** queue a 5-minute edit at next Architect touch to add a brief reference pointing to `docs/PUBLIC_DATA_LAYER.md`. |

---

## 5. Skill self-improvement proposals (2 author + 2 executor)

### Author-skill improvements (opticup-strategic)

#### P-AUTHOR-1 — Heading-numbering audit at SPEC seal

**File:** `.claude/skills/opticup-strategic/SKILL.md`
**Section:** SPEC Authoring Protocol Step 3 (Populate the Folder with SPEC.md), after the bullet list of required sections
**Proposed change:**

> **Heading-numbering audit (added 2026-05-15 from STOREFRONT_PUBLIC_DATA_LAYER F-1).** Before sealing the SPEC, run `grep -n '^## ' SPEC.md` and verify the sequence is monotonic and unique. The Iron-Rule-32 hook regex `/^##\s+(?:\d+\.\s+)?Destructive Operations\s*$/m` REQUIRES the destructive-operations heading to terminate exactly at the phrase (no trailing parenthetical). Also: heading `## N.` numbering MUST be unique within the SPEC (no two `## 3.` headings). Quick check: `grep -n '^## ' SPEC.md | awk '{print $2}' | sort | uniq -d` should return empty.

**Why:** STOREFRONT_PUBLIC_DATA_LAYER's SPEC had `## 3. Success Criteria` AND `## 3. Destructive Operations (...)` — both blocked Commit 1 (hook regex failure + duplicate numbering hidden by visual scan). 10 minutes of executor iteration; preventable.

#### P-AUTHOR-2 — Filter completeness via `pg_get_viewdef` paste

**File:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`
**Section:** §1.5 Pre-flight Findings (when a SPEC mirrors an existing view's behavior)
**Proposed change:**

> **For SPECs that mirror an existing view's row set** (e.g., public-data-layer mirrors, materialized-view caches, denormalization): paste the **full `pg_get_viewdef('<view>'::regclass, true)` output verbatim** into §1.5, including JOINs and WHERE/EXISTS predicates. The §3.1-style "columns listed" table is for the projection; the verbatim def is for the visibility-set semantics. Failure mode: an EXISTS check that references a different filter set silently changes the row count after rewrite — STT-2 fires post-migration.

**Why:** STOREFRONT_PUBLIC_DATA_LAYER's Brief §3.1 listed columns for `inventory_public` but described the filter as "...computed display fields, only those v_storefront_products currently projects". The Brief omitted that `inventory_public`'s visibility depends on JOINing brands + EXISTS inventory_images — both of which expand the filter from 4 conditions to 8. Caught by the Executor at live `pg_get_viewdef` time during Commit 3, but should have been in the SPEC.

### Executor-skill improvements (opticup-executor)

#### P-EXEC-1 — Source-type fidelity check before CREATE OR REPLACE VIEW

**File:** `.claude/skills/opticup-executor/SKILL.md`
**Section:** Database patterns (after "Canonical RLS pattern", before "SQL migration files - Iron Rule 32 hook comment-awareness")
**Proposed change:** (carried forward from the Executor's own EXECUTION_REPORT §9 proposal #1)

> **Source-type fidelity (added 2026-05-15 from STOREFRONT_PUBLIC_DATA_LAYER D-1).** When building a mirror table whose columns will be projected by an existing view that uses `CREATE OR REPLACE VIEW`, you MUST replicate **`format_type(atttypid, atttypmod)`** for every column copied from the source — not just the `data_type` from `information_schema.columns` (which strips precision/scale on `numeric`). Pre-flight: `SELECT a.attname, format_type(a.atttypid, a.atttypmod) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid WHERE c.relname='<source>' AND a.attnum>0`. PostgreSQL's CREATE OR REPLACE VIEW forbids column-type changes (precision change counts); failure rolls back the migration with cryptic error.

**Why:** STOREFRONT_PUBLIC_DATA_LAYER's view-rewrite migration failed twice on `latitude numeric(9,6) → numeric` and `google_rating numeric(2,1) → numeric` because `information_schema.columns` strips the (9,6) / (2,1) precision. Burned 15 minutes diagnosing + applying ALTER TABLE fix.

#### P-EXEC-2 — Per-commit artifact convention for global-infrastructure SPECs

**File:** `.claude/skills/opticup-executor/SKILL.md`
**Section:** SPEC Execution Protocol Step 3 (Log findings as you go), as a sub-paragraph
**Proposed change:** (carried forward from the Executor's own EXECUTION_REPORT §9 proposal #2)

> **Per-commit artifact (added 2026-05-15 from STOREFRONT_PUBLIC_DATA_LAYER).** When a SPEC's commit is **mostly DB operations** via `mcp__supabase__apply_migration` (live DDL recorded in `supabase_migrations.schema_migrations`, no source files added/changed), the commit still needs a git-trackable artifact per CLAUDE.md §9 ("no empty commits"). Canonical patterns:
> - Per-table-batch commits: incrementally extend a single `tests/smoke/<SPEC_SLUG>_<purpose>.sql` file with one block per commit.
> - Phase-transition commits (view rewrite, REVOKE, verification): a 1-page `.md` summary file inside the SPEC folder (`<PHASE>_SUMMARY.md`) documenting migrations applied + verification results + decisions made.
>
> This keeps git diffs meaningful, the SPEC folder forensic-grade, and avoids "empty commit" anti-patterns. Reference: STOREFRONT_PUBLIC_DATA_LAYER produced 4 such files (E2E test SQL + VIEW_REWRITE_SUMMARY + REVOKE_SUMMARY + VERIFICATION_REPORT) which proved their value when row-count drift surfaced and the post-mortem trail needed to reconstruct what was probed and when.

**Why:** STOREFRONT_PUBLIC_DATA_LAYER had 7 commits, of which 4 (Commit 4, 5, 6, 10) were mostly DB ops with minimal source-file changes. The Executor improvised summary files; codifying this pattern saves future executors from re-inventing it.

---

## 6. Verdict + Hand-off

🟢 **CLOSED.**

The SPEC accomplished its stated goal (mechanical separation via public-data layer) with 3 in-flight defect corrections, 8 logged findings, 3 queued follow-up SPECs, 4 skill improvement proposals (2 author + 2 executor), and end-to-end documentation updates. F-CRIT-2 advisor 8 → 0 (closed cleanly, no allowlist). Latency 10.8× faster on the primary view. All Prizma row counts match BASE_PRIZMA_* exactly. Cross-tenant isolation mechanically confirmed.

**The foundation now stands ready** for every future public consumer (Standard-tier shared site, M11 Supplier Portal, customer portal, mobile, API) without re-architecture — Daniel's "בלי פלסטרים" directive delivered.

### Status

- All 8 retrospective files committed and pushed at the close (this commit).
- `develop` is at HEAD + clean working tree (scope-clean per Full-Auto Pipeline mode).
- **Awaiting Daniel approval for develop → main merge** — the 7 implementation commits + 1 close commit are the merge candidate.

### Next strategic question for Daniel (one)

"השלמתי את STOREFRONT_PUBLIC_DATA_LAYER. F-CRIT-2 ירד מ-8 ל-0, מהירות catalog ירדה פי 10. מוכן לאישור merge ל-main?"

(English-only translation per Daniel's terminal preference: "STOREFRONT_PUBLIC_DATA_LAYER closed. F-CRIT-2 advisor 8 → 0; v_storefront_products latency 10× faster. Ready for develop → main merge approval?")
