# Module 3 Phase A SPEC — Documentation Reconciliation — 2026-04-11

> **This is a Claude Code execution SPEC.** Read it fully before acting. Follow the ordered actions literally. When in doubt, STOP.
>
> **Version:** v1.1 (v1 + Main review integration). Changes from v1:
> 1. **A0 rewritten** — two-output approach (`tier_c_results_client.json` + `tier_c_manual_queries.sql`). A0 no longer assumes an `exec_read_only_sql` RPC exists. Client portion runs via PostgREST (column lists via `information_schema.columns`, GRANT probe via anon client). Dashboard portion is concentrated into a single SQL file Daniel runs in §5.6.
> 2. **A1, A3, A4, A6 partial-state handling** — each item now writes complete content where it can and marks Dashboard-dependent sections with `<!-- TIER-C-PENDING -->` HTML comments. Cleanup is deferred to Phase B SPEC preamble.
> 3. **§5.6 Sanity Check** is now mandatory, not optional — Daniel runs `tier_c_manual_queries.sql` in Dashboard and commits `tier_c_results_manual.json`. The cleanup round itself runs later.
> 4. **§7.3 out-of-scope** adds explicit "No TIER-C-PENDING cleanup in Phase A" note. Phase A is considered successful with markers present.
>
> **Parent document:** `MODULE_3_RECOMMENDATIONS_2026-04-10_from_discovery_v3.md` — approved by Main Strategic Chat and Daniel. This SPEC implements Phase A (9 items) from §4 of that document.
>
> **Prerequisite:** `MODULE_3_HF_SPEC_2026-04-10.md` v3 has executed, all 10 Hotfix items have final status in the Hotfix execution log, and Daniel's Hotfix Phase-End Sanity Check (§5 of the Hotfix SPEC) has passed. **Do not start this SPEC if the Hotfix Sanity Check has not passed.** The first step of §2 below verifies this.
>
> **Execution mode:** Bounded Autonomy per `opticup-storefront/CLAUDE.md §9` and `opticup/CLAUDE.md §9`. Same model as Hotfix. This SPEC is your approved plan.
>
> **Review status:** v1.1 produced after Main review of v1 + Daniel directives. Ready for final Main sign-off (§5 of Hotfix is the last item Main wants to see). **Do not execute until Main approves and Daniel hands off.**

---

## 0. Read This Section Before Anything Else

Phase A is documentation reconciliation. Unlike Hotfix, it does not touch runtime code — only reference docs. This means the risk profile is different (lower) but the Cross-Module Safety Protocol still applies because some docs live in both repos and because docs reference code that cross-module safety still governs.

**What Phase A does:**
- Runs 8 Tier C investigation queries against the Supabase schema (read-only) and writes results to a discovery file.
- Rewrites or updates 8 reference doc files in `opticup-storefront/` based on those results.
- Closes the Rule 29 (View Modification Protocol) enforcement gap by producing a complete `VIEW_CONTRACTS.md`.
- Updates `FROZEN_FILES.md` to reflect the HF2 outcome.
- Adds a spec-vs-description classification section to `CLAUDE.md`.

**What Phase A does NOT do:**
- Runtime code changes (except dead import removal if a doc update reveals one — see A5 note).
- New SQL or DB schema changes.
- Any work on `opticup/modules/Module 1*`, `Module 2*`, or `Module 1.5*`.
- Any merge to main.

Your only sources of truth for this SPEC are:
- This SPEC document.
- `MODULE_3_HF_SPEC_2026-04-10.md` v3 (inherited patterns — §1, §2, §3, §6 structure).
- `opticup-storefront/CLAUDE.md`, `opticup/CLAUDE.md`.
- The Discovery report at `modules/Module 3 - Storefront/discovery/MODULE_3_DISCOVERY_REPORT_2026-04-10.md` — specifically §4.7 Q1–Q8 query texts.
- The Hotfix execution log at `modules/Module 3 - Storefront/discovery/hotfix_execution_log_2026-04-10.md`.
- The actual code and schema you read during execution.

---

## 1. Cross-Module Safety Protocol (ABSOLUTE — same as Hotfix)

This section mirrors the Hotfix SPEC §1. All subsections apply verbatim. Rather than restate them in full, this SPEC restates the absolute rules and inlines only what is Phase-A-specific.

### 1.A — Pre-flight grep before any file change

Same protocol as Hotfix §1.A. Before modifying any doc file that references code paths, run the grep sequence and include output in the commit message.

Phase A reality: most doc edits do not touch code paths in a way that could break another module. But VIEW_CONTRACTS.md and ARCHITECTURE.md describe views and dependency chains that Module 1 or 2 might read. Whenever doc content names a file path, function, table, or view, run this check before the edit:

```bash
grep -rn "<the referenced name>" "opticup/modules/Module 1"*/ "opticup/modules/Module 2"*/ "opticup/modules/Module 1.5"*/ 2>/dev/null
```

If the reference is used in another module → the doc edit is fine (it only describes reality). But if the edit would **change** how that module reads or writes that thing → STOP.

### 1.B — Files forbidden to touch in this SPEC

Identical to Hotfix §1.B. Repeated here for quick reference:

| Path | Read? | Write? |
|---|---|---|
| `opticup/shared/*.js` | YES | **NO (STOP)** |
| `opticup/shared.js` | YES | **NO (STOP)** |
| `opticup/modules/Module 1*/*` (any file) | NO | NO |
| `opticup/modules/Module 2*/*` (any file) | NO | NO |
| `opticup/modules/Module 1.5*/*` (any file) | NO | NO |
| `opticup/index.html` (repo root) | YES | **NO (STOP)** |

Phase A adds no new entries to this list. No Phase A item edits any file in the forbidden list.

### 1.C — Not in Phase A

- **No B6 sessionStorage rename.** Phase B.
- **No file splits.** Phase C.
- **No new runtime code.** A5 may remove a dead import if a doc correction reveals one; no other runtime code is modified.

### 1.D — Post-item verification (runs after every A item)

After each A item's commit, verify:

**Static checks (Claude Code automatic):**
1. `cd opticup-storefront && git status --porcelain` — only intended files modified.
2. `cd opticup-storefront && npm run build` — must pass (doc changes should not break build; if they do, something bigger is wrong).
3. `cd opticup-storefront && node scripts/full-test.mjs --no-build` — must pass.
4. Markdown lint (if the file is an `.md`): `markdownlint <file>` if the tool is installed; otherwise visually verify the file renders cleanly with no broken anchors.

**Runtime checks (Daniel, on localhost, after the full SPEC completes):**
Same 10-step Sanity Check as Hotfix §5 applies to Phase A too, though most checks will trivially pass (Phase A does not touch runtime code). See §5 of this SPEC for the Phase-A-specific Sanity Check.

### 1.E — Branch discipline — ABSOLUTE RULE

> **ABSOLUTE: All work on `develop` in both repos. No `git checkout main`, no `git merge`, no `git push origin main`, no `git push --force`. Daniel performs a single manual merge to main at the end of the full chain (end of Phase D), not at the end of this SPEC. If you attempt any main-branch operation, STOP the SPEC immediately — the entire chain aborts.**

`develop` in this SPEC is already ahead of `origin/main` by the Hotfix commits. Phase A commits accumulate on top. Do not attempt to rebase or squash Hotfix commits. Do not touch Hotfix commits in any way.

---

## 2. Session Start Protocol

1. **Identify machine** (🖥️ Windows / 🍎 Mac).
2. **Verify both repos exist at expected paths:**
   - Windows: `C:\Users\User\opticup-storefront` + `C:\Users\User\opticup`
   - Mac: `/Users/danielsmac/opticup-storefront` + `/Users/danielsmac/opticup`
3. **For each repo:** `git remote -v`, `git branch` (must be `develop`), `git pull origin develop`, `git status --porcelain`.
4. **If either repo is dirty** beyond expected untracked files → STOP.
5. **Verify Hotfix completion:**
   ```bash
   cd opticup-storefront
   git log --oneline -20 | grep -E "^[a-f0-9]+ HF[0-9]"
   ```
   Expected: at least HF1, HF3 or HF4, and HF10 appear in the log. If zero HF commits found → STOP. The Hotfix has not been executed on this machine's current `develop`. Daniel must either execute the Hotfix first or identify why the commits are missing.

6. **Verify Hotfix Sanity Check declaration:**
   ```bash
   grep "Hotfix Sanity Check: PASS" "modules/Module 3 - Storefront/discovery/hotfix_execution_log_2026-04-10.md"
   ```
   (Path is machine-relative — use Windows or Mac path depending on machine.)

   Expected: exactly one match. If zero matches → STOP. The Hotfix Sanity Check has not been declared passed by Daniel. Do not start Phase A.

7. **Read the Hotfix execution log's `## Pending Daniel actions` section.** Every item there must either be marked complete in the log or noted as "not blocking Phase A" (HF9 Case C is the only one that can be deferred past Phase A start). If any blocking action is not complete → STOP.

8. **Read `opticup-storefront/CLAUDE.md` §1, §4, §5, §6, §7, §8, §9.** Skip §11.

9. **Read `opticup/CLAUDE.md` §1–§23 — quickly.** Phase A barely touches the ERP repo, but A5 references rules and needs them in context.

10. **Do NOT read** `SESSION_CONTEXT.md`, `TECH_DEBT.md`, or any BUILD-phase doc. They will be updated as part of Phase A itself and reading them now risks confusion.

11. **Backup both repos** per `opticup-storefront/CLAUDE.md §16`:
    ```
    Windows:
    robocopy "C:\Users\User\opticup-storefront" "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\2026-04-11_pre-phase-a\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
    robocopy "C:\Users\User\opticup" "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\2026-04-11_pre-phase-a\opticup" /E /XD node_modules .git /XF .env
    ```

12. **Initialize the Phase A execution log** per §3.1 below.

13. **Emit readiness block:**
    ```
    Repo: opticalis/opticup-storefront. Branch: develop. Machine: [🖥️/🍎]. Repo status: clean.
    Repo: opticalis/opticup. Branch: develop. Repo status: clean.
    Hotfix prerequisite: Sanity Check PASS verified in execution log.
    Phase: Module 3 Phase A. SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md (v1).
    Backup: created at backups/2026-04-11_pre-phase-a/
    Execution log: initialized at [path from §3.1]
    Cross-Module Safety Protocol §1: loaded.
    Ready to execute A0 → A8.
    ```

---

## 3. Execution Overview

9 items. Per Recommendations §10 internal ordering:

```
A0  →  A1  →  (A3, A4)  →  (A2, A5, A6)  →  A7  →  A8
```

Where `→` means "must complete before" and `(X, Y)` means X and Y can run in either order because they have no mutual dependency.

**Claude Code runs items sequentially for clarity**, following this order exactly:

1. **A0** — Run Tier C queries (Q1–Q8). Produces `tier_c_results_2026-04-11.md`.
2. **A1** — Rewrite `VIEW_CONTRACTS.md` using A0 Q1 results + HF4 column addition.
3. **A3** — Rewrite `ARCHITECTURE.md` using A1 output.
4. **A4** — Update `SCHEMAS.md` using A0 + A1 outputs.
5. **A2** — Rebuild `FILE_STRUCTURE.md` (independent, runs after A4 by convention).
6. **A5** — `CLAUDE.md` accuracy fixes (independent).
7. **A6** — `TROUBLESHOOTING.md` reference fixes (independent, uses A0 Q1 for Golden Reference byte check).
8. **A7** — Update `FROZEN_FILES.md` post-HF2.
9. **A8** — Add spec-vs-description classification section to `CLAUDE.md`.

**One commit per item.** No batched commits. Cross-module pre-flight in every commit message body per Hotfix §1.A format.

### Deviation triggers (full Stop-on-Deviation list)

- Hotfix prerequisite verification in §2 fails.
- Any file in §1.B forbidden list targeted by an item action.
- Cross-module pre-flight returns hits that would require code changes in other modules.
- `npm run build` or `full-test.mjs` fails.
- A Tier C query returns an error other than "permission denied" or "relation does not exist" (those two are recorded and continued).
- A doc file being edited has been modified since the session started (potential concurrent edit).
- A0 Q1 results contradict the HF4 migration's assumption about which views depend on `v_storefront_pages`.
- Context usage crosses 70% mid-item → handoff protocol.
- Any Iron Rule violation.

### 3.1 — Context Handoff Protocol

Mirror of Hotfix §3.1 with a Phase-A-specific log file.

**Execution log file path:**
- Windows: `C:\Users\User\opticup\modules\Module 3 - Storefront\discovery\phase_a_execution_log_2026-04-11.md`
- Mac: `/Users/danielsmac/opticup/modules/Module 3 - Storefront/discovery/phase_a_execution_log_2026-04-11.md`

Separate file from the Hotfix execution log. Both logs persist as historical record.

**Log initialization header:**

```markdown
# Phase A Execution Log — 2026-04-11

**SPEC:** MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md (v1)
**Session start:** [ISO 8601 timestamp]
**Machine:** [Windows / Mac]
**Repos at session start:**
- opticup-storefront HEAD: [sha]
- opticup HEAD: [sha]
**Hotfix prerequisite:** PASS (verified against hotfix_execution_log_2026-04-10.md)

## Items
- A0: PENDING
- A1: PENDING
- A2: PENDING
- A3: PENDING
- A4: PENDING
- A5: PENDING
- A6: PENDING
- A7: PENDING
- A8: PENDING

## Deviations / stops
- (none yet)

## Pending Daniel actions (from completed items)
- (none yet)

## Tier C query results reference
- tier_c_results_2026-04-11.md will be generated by A0

## Current session state
- Current item: A0
- Current step: (not started)
- Last successful action: session initialized
- Next action: A0 step 1 — read Discovery §4.7 for Q1–Q8 text
```

All other Context Handoff Protocol rules from Hotfix §3.1 apply identically (update triggers, resume protocol, what the log must never contain). Not repeated.

### 3.2 — Handoff to Daniel

When the SPEC finishes all 9 items (or stops at a deviation), execution ends. The SPEC does **not** auto-start Phase B. Daniel takes over for morning QA and Phase-End Sanity Check execution. See §6 Handback Protocol.

---

## 4. Execution Plan

### A0 — Run Tier C investigation queries (split: client + Dashboard queue)

**Sources:** Discovery §4.7 Q1–Q8 + Main review direction (two-output approach)

**Context:** 8 investigation queries must be resolved before Phase A docs can be accurate. Some queries run against public schema tables/views (client-runnable via PostgREST). Others read `pg_catalog` objects (view bodies, CHECK constraints, dependency graphs) — these are **not exposed through PostgREST** and require manual Dashboard execution.

**A0 does NOT block on the Dashboard portion.** Instead it produces two outputs and moves on:
1. **`tier_c_results_client.json`** — everything the client could run.
2. **`tier_c_manual_queries.sql`** — a single concatenated SQL file Daniel runs in Dashboard SQL Editor during §5 Sanity Check, producing `tier_c_results_manual.json` in the morning.

Phase A items A1, A3, A4, A6 that depend on Dashboard-only results write partial content using `<!-- TIER-C-PENDING: see tier_c_results_manual.json -->` HTML comments at the pending sections. A later cleanup round (Phase B preamble or a dedicated FU item) reads `tier_c_results_manual.json` once Daniel has produced it and fills in every marker. **Phase A does not block on the cleanup.** Phase B may proceed with the markers still present.

**Files produced:**
- `opticup-storefront/scripts/discovery/run-tier-c-client.mjs` (new, one-time, deleted at end of A0)
- `opticup/modules/Module 3 - Storefront/discovery/tier_c_results_client.json` (new, committed)
- `opticup/modules/Module 3 - Storefront/discovery/tier_c_manual_queries.sql` (new, committed)
- `opticup/modules/Module 3 - Storefront/discovery/tier_c_results_2026-04-11.md` (new, committed — human-readable summary)

**Files Daniel produces later (NOT in scope of A0):**
- `opticup/modules/Module 3 - Storefront/discovery/tier_c_results_manual.json` — created by Daniel during §5.6 Sanity Check step.

**§1.B check:** all paths permitted. Clear.

#### Step 1 — Read Discovery §4.7 for Q1–Q8 query text

```bash
view "modules/Module 3 - Storefront/discovery/MODULE_3_DISCOVERY_REPORT_2026-04-10.md"
# Navigate to §4.7 — extract Q1 through Q8 SQL verbatim
```

Capture all 8 queries in the execution log under A0 step 1. Format:
```
=== A0 Tier C queries (from Discovery §4.7) ===
Q1: [full SQL verbatim]
Q2: [full SQL verbatim]
...
Q8: [full SQL verbatim]
```

If Discovery §4.7 is missing or unreadable → STOP and report.

#### Step 2 — Check HF3/HF4 reuse

Read the Hotfix execution log HF3 and HF4 entries.

- **HF4 step 1** attempted to capture `v_storefront_pages` view definition. Possible outcomes:
  - HF4 captured the definition successfully → reusable for Q1b partial.
  - HF4 STOPPED at the "cannot read view def autonomously" fallback and Daniel pasted the definition manually into the log → also reusable.
  - HF4 never reached step 1 (item exited / stopped earlier) → no reuse, Q1b for `v_storefront_pages` is in the Dashboard queue like every other view.
- **HF3 step 2** queried `information_schema.tables` for `storefront_media` and variants. This pattern IS client-runnable (PostgREST exposes `information_schema`), so HF3's result is reusable for Q8 directly.

Record reuse status in the execution log under A0 step 2:
```
HF4 reuse for Q1b (v_storefront_pages body): [AVAILABLE sha <commit> | NOT AVAILABLE — in manual queue]
HF3 reuse for Q8: [AVAILABLE sha <commit>]
```

#### Step 3 — Classify each query as CLIENT-RUNNABLE or DASHBOARD-ONLY

Apply these rules to each of Q1 through Q7 (Q8 already resolved via HF3 reuse):

| Query targets | Category |
|---|---|
| Public tables/views data rows | CLIENT |
| Column metadata (`information_schema.columns` filtered by `table_schema='public'`) | CLIENT |
| Table/view existence (`information_schema.tables`) | CLIENT |
| Role grants (`information_schema.role_table_grants`) | CLIENT |
| View body SQL (`pg_views.definition`, `pg_get_viewdef()`) | **DASHBOARD** — pg_catalog not exposed |
| CHECK constraints (`pg_constraint`) | **DASHBOARD** |
| Dependency graph (`pg_depend`) | **DASHBOARD** |
| Index definitions (`pg_indexes.indexdef`) | **DASHBOARD** |
| Anything else under `pg_catalog.*` | **DASHBOARD** |

**Specific guidance:**
- **Q1 splits into Q1a (CLIENT) and Q1b (DASHBOARD).** Q1a = column lists + types + GRANT probe for every storefront view. Q1b = view body SQL for every storefront view (includes Golden Reference subqueries).
- **Q2 (content_translations.entity_type CHECK)** → DASHBOARD.
- **Q3–Q7** — classify each individually per the rules above. A single query may be fully CLIENT, fully DASHBOARD, or split into sub-parts like Q1. Record the classification for each in the execution log before proceeding.

Record in execution log:
```
=== A0 classification ===
Q1a (view columns + grants): CLIENT
Q1b (view bodies): DASHBOARD
Q2 (content_translations CHECK): DASHBOARD
Q3: [CLIENT | DASHBOARD | SPLIT — describe]
Q4: [...]
Q5: [...]
Q6: [...]
Q7: [...]
Q8: RESOLVED via HF3 reuse
```

#### Step 4 — Write + run the client script

Create `opticup-storefront/scripts/discovery/run-tier-c-client.mjs`:

```javascript
// A0 client-runnable Tier C queries.
// Uses Supabase JS via PostgREST. No raw SQL. No pg_catalog access.
// One-time script — deleted after A0 completes.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
dotenv.config();

const sb = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const results = {
  generated_at: new Date().toISOString(),
  spec: 'MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A0',
};

// --- Q1a: column lists for each storefront view ---
// Full view list derived from Recommendations §4 A1 + any additional views
// discovered in execution log step 3.
const viewNames = [
  'v_storefront_products',
  'v_storefront_brands',
  'v_storefront_brand_page',
  'v_storefront_categories',
  'v_storefront_blog_posts',
  'v_storefront_config',
  'v_storefront_pages',
  'v_public_tenant',
  'v_translation_dashboard',
  // Add any additional view names Claude Code identified in step 3.
];

results.Q1a_view_columns = {};
for (const viewName of viewNames) {
  const { data, error } = await sb
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, ordinal_position')
    .eq('table_schema', 'public')
    .eq('table_name', viewName)
    .order('ordinal_position');
  results.Q1a_view_columns[viewName] = error
    ? { error: error.message, hint: error.hint || null }
    : data;
}

// --- Q1a: GRANT probe — can anon SELECT from each view? ---
// A successful head-only select from the anon-keyed client proves GRANT exists.
const sbAnon = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);
results.Q1a_anon_grants = {};
for (const viewName of viewNames) {
  const { error } = await sbAnon.from(viewName).select('*', { head: true, count: 'exact' }).limit(0);
  results.Q1a_anon_grants[viewName] = error
    ? { granted: false, error: error.message }
    : { granted: true };
}

// --- Q3-Q7 client-runnable parts ---
// Claude Code fills in per-query code here based on classification from step 3.
// Each classified-as-CLIENT query becomes a block like:
//   results.Q3_something = await sb.from('...').select('...');
// Each classified-as-DASHBOARD query is OMITTED — it goes into tier_c_manual_queries.sql instead.
// Each classified-as-SPLIT query has its CLIENT parts here and DASHBOARD parts in the SQL file.

// --- Q8 reuse from HF3 ---
results.Q8_reuse = {
  source: 'HF3 step 2',
  hotfix_log: 'hotfix_execution_log_2026-04-10.md',
  note: 'information_schema.tables lookup for storefront_media and variants — see HF3 entry',
};

writeFileSync(
  process.argv[2] || 'tier_c_results_client.json',
  JSON.stringify(results, null, 2)
);
console.log('Tier C client queries complete. Wrote to:', process.argv[2]);
```

**Note on `information_schema` access:** PostgREST exposes `information_schema` views in most Supabase projects, but the exposure may be disabled in some configurations. If the Q1a column-list queries return `{ error: "relation 'information_schema.columns' does not exist" }` or similar → Q1a itself becomes a DASHBOARD query. In that case, move Q1a into `tier_c_manual_queries.sql` under a "Q1a fallback" section and note the outage in the summary doc. This is a fallback path, not expected.

Run the script:
```bash
cd opticup-storefront
node scripts/discovery/run-tier-c-client.mjs "../opticup/modules/Module 3 - Storefront/discovery/tier_c_results_client.json"
```

Verify the output file exists and contains `Q1a_view_columns` with data for each view. If the file is empty or missing a major section → STOP and report.

#### Step 5 — Write `tier_c_manual_queries.sql`

Create `opticup/modules/Module 3 - Storefront/discovery/tier_c_manual_queries.sql`. This is a single runnable SQL file Daniel pastes into Dashboard SQL Editor.

```sql
-- =============================================================
-- Tier C Manual Queries — Module 3 Phase A0
-- Generated: 2026-04-11
-- SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A0
--
-- HOW TO USE (Daniel, during §5.6 Sanity Check):
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file
--   3. Click Run (runs all queries in one batch)
--   4. For each query result set, click "Download as JSON"
--   5. Combine into a single file named tier_c_results_manual.json
--      at modules/Module 3 - Storefront/discovery/
--      Structure: { "Q1b_view_bodies": [...], "Q2_check_constraint": [...], ... }
--   6. Commit tier_c_results_manual.json to the opticup repo.
-- =============================================================

-- --- Q1b: view body SQL for each storefront view ---
-- (If HF4 already captured v_storefront_pages, you can skip it in the output —
--  but it's harmless to include it again.)
SELECT
  viewname,
  pg_get_viewdef(('public.'||viewname)::regclass, true) AS definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'v_storefront_products',
    'v_storefront_brands',
    'v_storefront_brand_page',
    'v_storefront_categories',
    'v_storefront_blog_posts',
    'v_storefront_config',
    'v_storefront_pages',
    'v_public_tenant',
    'v_translation_dashboard'
    -- Claude Code: add any additional view names from Step 3 classification here.
  )
ORDER BY viewname;

-- --- Q2: content_translations.entity_type CHECK constraint ---
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.content_translations'::regclass
  AND contype = 'c';

-- --- Q3 through Q7 DASHBOARD-classified queries ---
-- Claude Code fills these in verbatim from Discovery §4.7, one SQL block per
-- query that was classified as DASHBOARD or whose DASHBOARD sub-part is needed.
-- For split queries (e.g. part CLIENT part DASHBOARD), only the DASHBOARD
-- portion appears here.

-- [Q3 DASHBOARD portion, if any]

-- [Q4 DASHBOARD portion, if any]

-- [Q5 DASHBOARD portion, if any]

-- [Q6 DASHBOARD portion, if any]

-- [Q7 DASHBOARD portion, if any]

-- --- Dependency graph for storefront views (used by A1/A3 dependency chains) ---
-- This is an extra query A0 adds beyond Q1-Q7 because A1/A3 explicitly need it.
SELECT
  dependent_view.relname AS dependent_view,
  source_view.relname AS source_object,
  source_view.relkind AS source_kind
FROM pg_depend d
JOIN pg_rewrite r ON d.objid = r.oid
JOIN pg_class dependent_view ON r.ev_class = dependent_view.oid
JOIN pg_class source_view ON d.refobjid = source_view.oid
JOIN pg_namespace dep_ns ON dependent_view.relnamespace = dep_ns.oid
JOIN pg_namespace src_ns ON source_view.relnamespace = src_ns.oid
WHERE dep_ns.nspname = 'public'
  AND src_ns.nspname = 'public'
  AND dependent_view.relname LIKE 'v_storefront%'
  AND dependent_view.oid != source_view.oid
ORDER BY dependent_view, source_object;

-- =============================================================
-- END OF TIER C MANUAL QUERIES
-- =============================================================
```

**Claude Code must inspect `tier_c_results_client.json` after step 4 runs.** If Q1a or any CLIENT-classified query failed at runtime, move those failed queries into `tier_c_manual_queries.sql` under a "Fallback — client queries that failed" section before committing. Record which queries fell back in the execution log.

#### Step 6 — Write the summary doc `tier_c_results_2026-04-11.md`

Create `opticup/modules/Module 3 - Storefront/discovery/tier_c_results_2026-04-11.md`:

```markdown
# Tier C Investigation Query Results — 2026-04-11

**Source:** A0 of MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md
**Status:** PARTIAL — client portion complete, Dashboard portion pending Daniel (Sanity Check §5.6)

## Artifacts

| File | Status | Produced by |
|---|---|---|
| `tier_c_results_client.json` | ✅ COMMITTED | A0 step 4 (this SPEC) |
| `tier_c_manual_queries.sql` | ✅ COMMITTED | A0 step 5 (this SPEC) |
| `tier_c_results_manual.json` | ⏳ PENDING | Daniel — Sanity Check §5.6 |

## Query status

| ID | Description | Category | Status |
|---|---|---|---|
| Q1a | View column lists + GRANTs | CLIENT | ✅ in tier_c_results_client.json |
| Q1b | View body SQL (incl. Golden Reference subqueries) | DASHBOARD | ⏳ in tier_c_manual_queries.sql |
| Q2 | content_translations.entity_type CHECK | DASHBOARD | ⏳ in tier_c_manual_queries.sql |
| Q3 | [from Discovery §4.7] | [classified] | [status] |
| Q4 | [...] | [...] | [...] |
| Q5 | [...] | [...] | [...] |
| Q6 | [...] | [...] | [...] |
| Q7 | [...] | [...] | [...] |
| Q8 | storefront_media existence | CLIENT (reused from HF3) | ✅ see HF3 entry in Hotfix log |
| Dep graph | View dependency chain | DASHBOARD | ⏳ in tier_c_manual_queries.sql (extra) |

## Reuses from Hotfix

- **Q1b partial:** `v_storefront_pages` definition — [AVAILABLE from HF4 sha <commit> | NOT AVAILABLE, included in manual queue with other views]
- **Q8:** storefront_media result — from HF3 sha <commit>

## Impact on Phase A items

Phase A items that depend on Dashboard results write partial content now and get the gaps filled in a later cleanup round. Each gap is marked with an HTML comment `<!-- TIER-C-PENDING: <what's missing> --> ` at the exact location it's needed.

| Phase A item | Gap | Marker location |
|---|---|---|
| **A1 VIEW_CONTRACTS** | Golden Reference subqueries for each view (require Q1b view body) | Inside each view's contract entry, in the Golden Reference subsection |
| **A1 VIEW_CONTRACTS** | Rule 29 dependency chain (requires Dep graph query) | Inside each view's "Dependencies" and "Rule 29 DROP order" subsections |
| **A3 ARCHITECTURE** | Full DROP/CREATE order across all views (requires Dep graph query) | Inside the "View dependency chain" section |
| **A4 SCHEMAS** | `content_translations.entity_type` CHECK verification (requires Q2) | Inside the CHECK constraint subsection |
| **A6 TROUBLESHOOTING** | Byte-match of Golden Reference blocks vs live view bodies (requires Q1b) | Inside §1 (or wherever Golden Reference blocks live) |

## Cleanup path

After Daniel runs `tier_c_manual_queries.sql` in Dashboard during §5.6 Sanity Check and commits `tier_c_results_manual.json`, a later cleanup round reads the manual results and fills in every `<!-- TIER-C-PENDING -->` marker. Options for when this cleanup runs:

1. Preamble to `MODULE_3_B_SPEC_saas_core_2026-04-12.md` — first step of Phase B is "fill TIER-C-PENDING markers from tier_c_results_manual.json".
2. Dedicated mini-SPEC `MODULE_3_A_CLEANUP_SPEC_tier_c_fill_2026-04-12.md` — runs between Phase A Sanity Check and Phase B start.
3. **Daniel's choice** — the Phase B SPEC will specify which path is taken.

**The cleanup is NOT blocking for Phase B's main work.** Phase B can begin with the markers still present as long as the SaaS hardening work it performs does not touch the marked sections.
```

Fill in `Q3` through `Q7` rows based on step 3 classification. Fill in the reuse details based on step 2 findings.

#### Step 7 — Delete runner script + commit

```bash
cd opticup-storefront
rm scripts/discovery/run-tier-c-client.mjs

cd ../opticup
git add "modules/Module 3 - Storefront/discovery/tier_c_results_client.json"
git add "modules/Module 3 - Storefront/discovery/tier_c_manual_queries.sql"
git add "modules/Module 3 - Storefront/discovery/tier_c_results_2026-04-11.md"
git status  # verify only these 3 files staged

git commit -m "A0: Tier C investigation — client results + Dashboard queue

Two-output approach per Main review direction. Client-runnable queries
executed via PostgREST; Dashboard-only queries concentrated into a single
SQL file for Daniel to run in morning Sanity Check.

Client results:
- Q1a (view column lists + GRANTs): [N] views
- Q8 (storefront_media): reused from HF3
- [other CLIENT-classified queries per step 3]

Dashboard queue (in tier_c_manual_queries.sql):
- Q1b (view body SQL with Golden Reference subqueries)
- Q2 (content_translations.entity_type CHECK)
- View dependency graph (for A1/A3 dependency chains)
- [other DASHBOARD-classified queries per step 3]

Phase A downstream impact (see summary doc):
- A1, A3 write partial content, mark gaps with <!-- TIER-C-PENDING -->
- A4 writes partial CHECK constraint section, marks with <!-- TIER-C-PENDING -->
- A6 defers Golden Reference byte-match, marks with <!-- TIER-C-PENDING -->

NOT BLOCKING for A1-A8 execution. Later cleanup round fills markers
once Daniel produces tier_c_results_manual.json during §5.6 Sanity Check.

Cross-module pre-flight: CLEAR
Refs: Recommendations §4 A0, Main review direction 2026-04-11
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A0"
```

Append to execution log `## Pending Daniel actions`:
```
- A0: Run tier_c_manual_queries.sql in Supabase Dashboard SQL Editor
  (SCHEDULED for §5.6 Sanity Check — Daniel does this in the morning).
  Save combined output to tier_c_results_manual.json in the same
  discovery dir. Commit to opticup repo develop.
  NOT BLOCKING for Phase A or Phase B execution — this unblocks the
  later cleanup round that fills TIER-C-PENDING markers.
```

Log A0 as COMMITTED. Proceed to A1.

---

### A1 — Complete `VIEW_CONTRACTS.md` for all 12+ views (partial — TIER-C-PENDING markers)

**Sources:** F026, F035, F139 | Depends on A0 (Q1a client results) and HF4 (new column)

**Context:** `VIEW_CONTRACTS.md` must list every storefront-accessed view with: name, GRANT, columns with types, dependencies, notes, Rule 29 DROP order. This is the authoritative document for Rule 29 enforcement.

**Partial state warning:** A0 split Tier C into CLIENT (`tier_c_results_client.json`) and DASHBOARD (`tier_c_manual_queries.sql`) portions. A1 can complete column lists + GRANT status fully from the client output. A1 **cannot** complete Golden Reference subqueries or Rule 29 dependency chains — those require view body SQL and the dependency graph, both Dashboard-only. A1 writes partial content with `<!-- TIER-C-PENDING -->` markers at every missing piece. A later cleanup round fills the markers once Daniel produces `tier_c_results_manual.json`.

**Files in scope:**
- `opticup-storefront/VIEW_CONTRACTS.md` (rewrite)
- `opticup/modules/Module 3 - Storefront/discovery/tier_c_results_client.json` (read)
- `opticup/modules/Module 3 - Storefront/discovery/tier_c_results_2026-04-11.md` (read — summary + status)

#### Step 1 — §1.A pre-flight

```bash
grep -rn "VIEW_CONTRACTS" "opticup/modules/Module 1"*/ "opticup/modules/Module 2"*/ "opticup/modules/Module 1.5"*/ 2>/dev/null || echo "CLEAR"
```
Expected: CLEAR.

#### Step 2 — Read inputs

1. Read `tier_c_results_client.json` — extract `Q1a_view_columns` (authoritative column lists) and `Q1a_anon_grants` (authoritative GRANT status).
2. Read `tier_c_results_2026-04-11.md` — note which queries are in the Dashboard queue. Q1b (view bodies) and the dep graph query are expected to be pending.
3. Read current `VIEW_CONTRACTS.md` — preserve any existing correct sections that don't contradict the authoritative client data.
4. Verify HF4 added `translation_group_id` to `v_storefront_pages`: check `Q1a_view_columns['v_storefront_pages']` includes a `translation_group_id` entry.

If HF4's column is not present in the Q1a results → STOP. Report: "A0 Q1a column list for v_storefront_pages does not include translation_group_id. Either the HF4 SQL was not run (Hotfix §5.3 should have caught this) or the column lookup failed. Verify HF4 state and rerun A0 if needed."

#### Step 3 — Rewrite `VIEW_CONTRACTS.md` with partial content

Structure per view:

```markdown
## v_storefront_products

**Purpose:** <!-- TIER-C-PENDING: derive from view body SQL in tier_c_results_manual.json -->
**GRANT:** [from Q1a_anon_grants — "SELECT TO anon" or "NOT GRANTED"]
**Depends on:** <!-- TIER-C-PENDING: derive from dependency graph query in tier_c_results_manual.json -->
**Dependents:** <!-- TIER-C-PENDING: derive from dependency graph query in tier_c_results_manual.json -->

**Columns:**
| Column | Type | Nullable | Notes |
|---|---|---|---|
| [from Q1a_view_columns verbatim] | | | |
| ... | | | |

**Golden Reference subqueries:**
<!-- TIER-C-PENDING: copy view body from tier_c_results_manual.json Q1b, extract Golden Reference subqueries (e.g. the images subquery for v_storefront_products), wrap in [SPEC — DO NOT REWRITE] markers per A8. -->

**Rule 29 dependency chain (DROP order for modifications):**
<!-- TIER-C-PENDING: derive from dependency graph query. DROP dependents first (reverse order), then this view. Format: 1. view_X 2. view_Y 3. this view. -->
```

Apply to every view in `Q1a_view_columns`. The minimum list of views (from A0 step 4 script): `v_storefront_products`, `v_storefront_brands`, `v_storefront_brand_page`, `v_storefront_categories`, `v_storefront_blog_posts`, `v_storefront_config`, `v_storefront_pages`, `v_public_tenant`, `v_translation_dashboard`, plus any additional views Claude Code identified at A0 step 3.

**Content that is COMPLETE in A1 (not marked pending):**
- Columns table (from Q1a_view_columns — type, nullability, ordinal position)
- GRANT status (from Q1a_anon_grants probe)
- View presence/absence in the schema
- HF4's new column appearing on v_storefront_pages

**Content that is PENDING (marked with `<!-- TIER-C-PENDING: <what's missing> -->`):**
- Purpose (needs view body to see the actual SELECT)
- Depends on / Dependents (needs dep graph query)
- Golden Reference subqueries (needs view body)
- Rule 29 DROP order (needs dep graph)

**Exception:** if HF4 captured `v_storefront_pages` view body during its step 1 (check A0 step 2 reuse note), use it for the `v_storefront_pages` Purpose and Golden Reference sections directly — no TIER-C-PENDING marker for that specific view.

#### Step 4 — Local test + commit

```bash
cd opticup-storefront
npm run build
node scripts/full-test.mjs --no-build
```

Commit:
```
A1: Rewrite VIEW_CONTRACTS.md with client column lists + TIER-C-PENDING markers (F026, F035, F139)

Views documented: [N]
Complete sections: columns, GRANTs, HF4 column presence
Pending sections: Purpose, Depends on, Dependents, Golden Reference, Rule 29 DROP order
  (marked <!-- TIER-C-PENDING --> — cleanup round fills from tier_c_results_manual.json)

Rule 29 gap: PARTIALLY closed (column/GRANT side closed; DROP order pending Dashboard queries).

Inputs:
- tier_c_results_client.json (Q1a)
- HF4 view body reuse: [used for v_storefront_pages | not available]

Dependencies: HF4 (v_storefront_pages.translation_group_id confirmed present)

Cross-module pre-flight: CLEAR
Refs: F026, F035, F139
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A1
```

Log A1 as COMMITTED. Proceed to A3.

---

### A3 — Rewrite `ARCHITECTURE.md` (partial — dependency chain pending)

**Sources:** F028–F030 | Depends on A1

**Context:** `ARCHITECTURE.md` has an incorrect `v_storefront_brand_page` dependency chain, lacks a tenant resolution section, and does not cover all 12+ views in the DROP/CREATE order. Fix: rewrite using A1 as the authoritative source.

**Partial state warning:** The full DROP/CREATE order for all views requires the dependency graph query (Dashboard-only). A3 writes the rest of `ARCHITECTURE.md` completely and marks the "View dependency chain" section with `<!-- TIER-C-PENDING -->`. Tenant resolution, image infrastructure, RLS architecture, and layer model sections are all complete.

**Files in scope:** `opticup-storefront/ARCHITECTURE.md` (rewrite)

#### Step 1 — §1.A pre-flight + read inputs

```bash
grep -rn "ARCHITECTURE\.md" "opticup/modules/Module 1"*/ "opticup/modules/Module 2"*/ "opticup/modules/Module 1.5"*/ 2>/dev/null || echo "CLEAR"
```

Read:
- Current `ARCHITECTURE.md`
- Newly-committed `VIEW_CONTRACTS.md` from A1 (note: its dependency sections are also TIER-C-PENDING)
- `tier_c_results_client.json` for any client-resolved dependency info
- `tier_c_results_2026-04-11.md` for the status of Q1b and the dep graph query
- `v_public_tenant` — note: the view BODY is pending (Q1b), but the column list + GRANT status is in Q1a. For the tenant resolution section, the column list is sufficient because what matters is "what does the view expose" not "how is the view constructed internally". If the section needs internal SELECT logic → mark that sub-part TIER-C-PENDING.

#### Step 2 — Rewrite

Sections to include:

1. **Layer model** — repo boundaries, deploy targets, Supabase as shared backend. **COMPLETE in A3** (no Tier C dependency).
2. **Tenant resolution** (NEW section) — document the `v_public_tenant` secure view pattern, why the raw `tenants` table must not be queried directly, where tenant ID flows through the storefront request lifecycle. **COMPLETE in A3** using column lists from Q1a. If internal SELECT logic is needed → use `<!-- TIER-C-PENDING: v_public_tenant body from Q1b for internal implementation reference -->` inline.
3. **View dependency chain** — fix `v_storefront_brand_page` dependency error (F028) at the conceptual level (prose), but leave the full DROP/CREATE order marked:
   ```
   <!-- TIER-C-PENDING: full DROP/CREATE order across all views requires
        dependency graph query in tier_c_results_manual.json. Fill during
        cleanup round. Must cover every view listed in VIEW_CONTRACTS.md. -->
   ```
   Write whatever prose description is possible from A1's column-level information (e.g. "`v_storefront_brand_page` reads from `v_storefront_brands` plus the `storefront_brand_pages` table — the Discovery-reported reverse chain was wrong").
4. **Image infrastructure** — reference `/api/image/[...path].ts`, `frame-images` private bucket, `storage_path` vs signed URLs. **COMPLETE in A3** (no Tier C dependency).
5. **RLS architecture** — per-tenant policies, SECURITY DEFINER RPC pattern (referenced by HF2 resolution), defense-in-depth on writes. **COMPLETE in A3** (no Tier C dependency).

#### Step 3 — Commit

```
A3: Rewrite ARCHITECTURE.md (F028, F029, F030)

COMPLETE sections:
- Layer model
- Tenant resolution (new)
- Image infrastructure (new)
- RLS architecture (new)
- View dependency chain: prose-level fix of v_storefront_brand_page (F028)

PENDING sections (marked <!-- TIER-C-PENDING -->):
- Full DROP/CREATE order across all views (needs dep graph query)

Dependencies: A1 (VIEW_CONTRACTS column lists + GRANTs)

Cross-module pre-flight: CLEAR
Refs: F028, F029, F030
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A3
```

Log A3 as COMMITTED. Proceed to A4.

---

### A4 — Update `SCHEMAS.md` (partial — Q2 CHECK verification pending)

**Sources:** F031–F033 | Depends on A0 (Q1a columns), A1

**Context:** `SCHEMAS.md` needs: (a) a view column contracts subsection pulled from A1, (b) documentation of 5 admin-only hidden columns, (c) verification of the `content_translations.entity_type` CHECK constraint from A0 Q2.

**Partial state warning:** Q2 is DASHBOARD-only (pg_constraint not exposed via PostgREST). The CHECK verification subsection is written with a `<!-- TIER-C-PENDING -->` marker. The view column contracts subsection and admin-only hidden columns work are both unaffected by Tier C split — they complete fully in A4.

**Files in scope:** `opticup-storefront/SCHEMAS.md` (edit)

#### Step 1 — §1.A pre-flight + read inputs

```bash
grep -rn "SCHEMAS\.md" "opticup/modules/Module 1"*/ "opticup/modules/Module 2"*/ "opticup/modules/Module 1.5"*/ 2>/dev/null || echo "CLEAR"
```

Read:
- Current `SCHEMAS.md`
- `VIEW_CONTRACTS.md` (from A1 — note it contains TIER-C-PENDING markers that do not affect A4)
- `tier_c_results_client.json` for any table column metadata relevant to hidden columns identification
- `tier_c_results_2026-04-11.md` — confirm Q2 status is in the Dashboard queue

#### Step 2 — Identify the 5 admin-only hidden columns (COMPLETE in A4)

Per Discovery F032, there are 5 columns that exist in underlying tables but are deliberately not exposed via storefront views. Identify them via the client script by querying `information_schema.columns` for each underlying table and diffing against the view column lists in `tier_c_results_client.json`.

If A0 step 4 already captured underlying table column lists → use those. If not → it can be done here with a tiny in-SPEC ad-hoc query via the same Supabase client pattern used in A0. This is client-runnable (information_schema.columns is exposed).

Record the hidden columns in the execution log. If fewer or more than 5 are found → note the discrepancy in the commit message but proceed with the count that was found.

#### Step 3 — Edit `SCHEMAS.md`

Additions:
1. **Subsection "View column contracts"** — summary pointing to `VIEW_CONTRACTS.md` as source of truth for columns. **COMPLETE in A4** (no Tier C dependency beyond what A1 already handled).
2. **Subsection "Admin-only hidden columns"** — list the 5 (or N) columns, which table they're on, why they're hidden from views. **COMPLETE in A4** (client-side diff).
3. **CHECK constraint verification** — `content_translations.entity_type` allowed values subsection. Write the subsection header and intro prose, then mark the verification body:
   ```markdown
   ### content_translations.entity_type CHECK constraint

   The `content_translations.entity_type` column is constrained by a CHECK
   enforcing the allowed entity type values.

   **Allowed values:**

   <!-- TIER-C-PENDING: populate from tier_c_results_manual.json Q2 output.
        Expected format: a list of string literals the CHECK allows
        (e.g. 'brand', 'page', 'blog_post', 'product'). Until filled,
        consumers should treat this as informational only. -->
   ```

Edit in-place using `str_replace` — do not rewrite the whole file unless more than 50% of the content is wrong.

#### Step 4 — Commit

```
A4: Update SCHEMAS.md (F031, F032, F033)

COMPLETE sections:
- "View column contracts" subsection (references VIEW_CONTRACTS.md)
- "Admin-only hidden columns" subsection: [N] columns documented

PENDING sections:
- content_translations.entity_type CHECK verification
  (marked <!-- TIER-C-PENDING --> — cleanup round fills from tier_c_results_manual.json Q2)

Dependencies: A0 (Q1a for column info), A1

Cross-module pre-flight: CLEAR
Refs: F031, F032, F033
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A4
```

Log A4 as COMMITTED. Proceed to A2.

---

### A2 — Rebuild `FILE_STRUCTURE.md`

**Sources:** F036–F039, F113, F140

**Context:** `FILE_STRUCTURE.md` is stale — files have been added, removed, or moved since it was last updated. Rebuild by regenerating the tree from the current working directory.

**Files in scope:** `opticup-storefront/FILE_STRUCTURE.md` (rewrite)

#### Step 1 — §1.A pre-flight

```bash
grep -rn "FILE_STRUCTURE\.md" "opticup/modules/Module 1"*/ "opticup/modules/Module 2"*/ "opticup/modules/Module 1.5"*/ 2>/dev/null || echo "CLEAR"
```

#### Step 2 — Generate tree

```bash
cd opticup-storefront
# Exclude node_modules, .git, dist, .vercel, and other non-source directories
tree -I 'node_modules|.git|dist|.vercel|.astro|.claude' --dirsfirst -L 4 > /tmp/file-structure-raw.txt
```

If `tree` is not installed:
```bash
find . -type f \
  -not -path './node_modules/*' \
  -not -path './.git/*' \
  -not -path './dist/*' \
  -not -path './.vercel/*' \
  -not -path './.astro/*' \
  | sort > /tmp/file-structure-raw.txt
```

#### Step 3 — Rewrite `FILE_STRUCTURE.md`

Format: one-line description per significant file, grouped by directory. Preserve the existing format from the old FILE_STRUCTURE.md — Claude Code should view the current file first to match its style exactly.

For files that have no descriptive purpose (config, lockfiles), omit or mark with `—`. For source files, add a brief one-line description based on what the file exports or renders.

**Do not spend time writing poetic descriptions.** The value is accuracy, not prose. If a file's purpose is unclear → mark as `(purpose unclear — verify)` and log for A6 to pick up.

#### Step 4 — Commit

```
A2: Rebuild FILE_STRUCTURE.md (F036–F039, F113, F140)

Files documented: [N]
Files marked "purpose unclear": [N]

Cross-module pre-flight: CLEAR
Refs: F036, F037, F038, F039, F113, F140
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A2
```

Log A2 as COMMITTED. Proceed to A5.

---

### A5 — `CLAUDE.md` accuracy fixes

**Sources:** F043–F046

**Context:** Four specific corrections to `opticup-storefront/CLAUDE.md`:
- Line count corrections (the file itself claims "under 400 lines" but the actual count may differ; similarly for referenced file size expectations).
- Rule 24 numbering fix (F045 — the Rule 24 Views-only rule has a numbering inconsistency).
- `COMPONENT_CHECKLIST.md §8` reference fix — the reference points to a section that doesn't exist or is numbered differently.
- Any other specific line-level fix from F043–F046.

**Files in scope:** `opticup-storefront/CLAUDE.md` (surgical edits)

#### Step 1 — §1.A pre-flight + read current

```bash
grep -rn "CLAUDE\.md" "opticup/modules/Module 1"*/ "opticup/modules/Module 2"*/ "opticup/modules/Module 1.5"*/ 2>/dev/null || echo "CLEAR"
```

Read `opticup-storefront/CLAUDE.md` fully.

Cross-reference F043–F046 details from the Discovery report to get the exact corrections required. If the findings are not specific enough to make a surgical edit → STOP and ask.

#### Step 2 — Apply surgical edits

One `str_replace` per finding. Each edit must be minimal — just the line or phrase in question. Do not rewrite sections.

Specifically:
- **Line counts:** recalculate actual line counts at edit time (`wc -l <file>` for any referenced file) and update the claim to match reality with a slightly generous ceiling.
- **Rule 24 numbering:** align with `opticup/CLAUDE.md` which is the source of truth for the 23-rule base (per the storefront CLAUDE.md §4 inheritance). The storefront-specific additions are rules 24–30; ensure all cross-references use the correct number.
- **COMPONENT_CHECKLIST.md §8 reference:** open the target file, verify which section exists at §8, update the reference. If COMPONENT_CHECKLIST.md has no §8 → find the intended target section and fix the reference.

#### Step 3 — Commit

```
A5: CLAUDE.md accuracy fixes (F043–F046)

Corrections:
- Line count: [old] → [new]
- Rule 24 numbering: [description of fix]
- COMPONENT_CHECKLIST.md §8 reference: [old target] → [new target]
- [any others]

Cross-module pre-flight: CLEAR
Refs: F043, F044, F045, F046
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A5
```

Log A5 as COMMITTED. Proceed to A6.

---

### A6 — Update `TROUBLESHOOTING.md` references (partial — Golden Reference byte-match pending)

**Sources:** F040, F041 | Depends on A0 (Q1b — Dashboard pending)

**Context:** Two issues in `TROUBLESHOOTING.md`:
- **F040:** a reference to `TECH_DEBT #3` that should be `TECH_DEBT #10` (or current correct number) — pure doc correction, no Tier C dependency.
- **F041:** the Golden Reference subquery in `TROUBLESHOOTING.md §1` needs byte-level verification against the live view definition of `v_storefront_products`.

**Partial state warning:** F041 byte-level verification requires the live view body SQL of `v_storefront_products`. That body is DASHBOARD-only (Q1b), pending Daniel's Sanity Check run. A6 applies the TECH_DEBT fix (F040) fully, and for F041 inserts a `<!-- TIER-C-PENDING -->` marker next to the Golden Reference block instructing the cleanup round to perform the byte-match once `tier_c_results_manual.json` exists. F040 and F041 are independent — F040 completes regardless of F041.

**Files in scope:** `opticup-storefront/TROUBLESHOOTING.md` (edit)

#### Step 1 — §1.A pre-flight + read inputs

```bash
grep -rn "TROUBLESHOOTING\.md" "opticup/modules/Module 1"*/ "opticup/modules/Module 2"*/ "opticup/modules/Module 1.5"*/ 2>/dev/null || echo "CLEAR"
```

Read:
- `TROUBLESHOOTING.md §1` — current Golden Reference block
- `tier_c_results_2026-04-11.md` — confirm Q1b status is in the Dashboard queue
- **If HF4 captured `v_storefront_products` view body** (unlikely — HF4 only touched `v_storefront_pages`) → use it for the byte-match. This is a narrow exception; the default path is partial.

#### Step 2 — Apply TECH_DEBT #3 → #N fix (COMPLETE in A6)

Before editing, verify the current correct TECH_DEBT entry number by reading `opticup-storefront/TECH_DEBT.md` and finding the entry F040 is supposed to reference. If the entry has moved since F040 was captured → use the current correct number, note the drift in the commit message.

Use a single `str_replace` on `TROUBLESHOOTING.md` to update `TECH_DEBT #3` → `TECH_DEBT #[correct]`. Do not touch anything else around the edit.

#### Step 3 — F041 partial handling (Golden Reference byte-match pending)

Locate the Golden Reference block inside `TROUBLESHOOTING.md §1`. Insert a `TIER-C-PENDING` marker immediately above the block (not inside it — do not modify the Golden Reference bytes themselves):

```markdown
<!-- TIER-C-PENDING: byte-level verification of this Golden Reference block
     against the live v_storefront_products view body is deferred to the
     cleanup round. Source will be tier_c_results_manual.json Q1b. Cleanup
     must: (1) extract the images subquery from the live view body,
     (2) diff against the bytes below, (3) if identical → remove this
     marker, (4) if different → update the block below to match the live
     version verbatim, preserve any [SPEC — DO NOT REWRITE] wrappers,
     and add a changelog note. Do not perform this fix before
     tier_c_results_manual.json exists. -->
```

**Critical:** do NOT modify the Golden Reference block itself. Do NOT attempt to byte-match against any source other than the live view body in `tier_c_results_manual.json`. If HF4 opportunistically captured `v_storefront_products` → note in the commit message and perform the byte-match anyway, but this is not the expected path.

#### Step 4 — Commit

```
A6: Update TROUBLESHOOTING.md references (F040, F041)

COMPLETE:
- F040: TECH_DEBT reference #3 → #[correct]

PENDING:
- F041: Golden Reference byte-match for v_storefront_products images subquery
  (marked <!-- TIER-C-PENDING --> above the Golden Reference block —
  cleanup round performs byte-match against tier_c_results_manual.json Q1b)

Dependencies: (F040 has none, F041 depends on A0 Q1b which is pending)

Cross-module pre-flight: CLEAR
Refs: F040, F041
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A6
```

Log A6 as COMMITTED. Proceed to A7.

---

### A7 — Update `FROZEN_FILES.md` post-HF2

**Sources:** F034 | Depends on HF2 outcome

**Context:** `FROZEN_FILES.md` lists files whose modification requires extra caution. `normalize-logo` is currently on this list. HF2 has either cleaned it up (code-only path) or exited to followup. Either way, `FROZEN_FILES.md` needs a status update.

**Files in scope:** `opticup-storefront/FROZEN_FILES.md` (edit)

#### Step 1 — §1.A pre-flight + read HF2 outcome from Hotfix log

```bash
grep -rn "FROZEN_FILES\.md" "opticup/modules/Module 1"*/ "opticup/modules/Module 2"*/ "opticup/modules/Module 1.5"*/ 2>/dev/null || echo "CLEAR"
```

Read the Hotfix execution log's HF2 entry. Possible outcomes:
- **HF2 PROCEEDED (code-only)** → `normalize-logo` is now cleaned up. Update frozen entry to note the cleanup date + SHA, possibly remove from frozen list if it no longer has cross-module risk.
- **HF2 EXITED_TO_FOLLOWUP** → `normalize-logo` still has bucket-C accesses. Keep on frozen list; update the note to reference the HF2-followup plan.

#### Step 2 — Edit `FROZEN_FILES.md`

Use `str_replace` on the `normalize-logo` entry. Minimal edit — just the status/note fields. Do not touch other entries.

#### Step 3 — Commit

```
A7: Update FROZEN_FILES.md post-HF2 (F034)

HF2 outcome: [PROCEEDED | EXITED_TO_FOLLOWUP]
Change: [updated status / retained on list with followup note / removed from list]

Dependencies: HF2 (Hotfix log)

Cross-module pre-flight: CLEAR
Refs: F034
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A7
```

Log A7 as COMMITTED. Proceed to A8.

---

### A8 — Add spec-vs-description classification to `CLAUDE.md`

**Sources:** Main directive + v1/v2 feedback consolidated into Recommendations §4

**Context:** Add a new section to `opticup-storefront/CLAUDE.md` that classifies every reference doc as either:
- **Spec** (code must conform) — changes propagate to code.
- **Description** (doc follows code) — changes come from code.
- **Description + reasoning** — explains why the code is the way it is.
- **Description + reasoning with embedded specs** — prose reference with marked `[SPEC — DO NOT REWRITE]` blocks.

This closes a recurring ambiguity about when to trust a doc vs when to trust the code.

**Files in scope:** `opticup-storefront/CLAUDE.md` (add new section)

#### Step 1 — §1.A pre-flight

```bash
grep -rn "spec-vs-description" "opticup/modules/Module 1"*/ "opticup/modules/Module 2"*/ "opticup/modules/Module 1.5"*/ 2>/dev/null || echo "CLEAR"
```

#### Step 2 — Draft the new section

Add a new numbered section to `opticup-storefront/CLAUDE.md` (choose the next available number — likely §18 or similar; verify). Section title: "Reference File Classification (Spec vs Description)".

Content per Recommendations §4 A8:

```markdown
## [N]. Reference File Classification (Spec vs Description)

Every reference file in this repo is classified into one of four categories.
The classification determines the direction of information flow: does code
conform to the doc, or does the doc describe existing code?

### Spec — code must conform to these docs
Changes to code that conflict with a spec doc are bugs. Update the doc
only as a deliberate architectural decision, then update code to match.

- `CLAUDE.md` (rules sections)
- `QUALITY_GATES.md`
- `VIEW_CONTRACTS.md`
- `FROZEN_FILES.md`
- `SECURITY_RULES.md`

### Description — doc follows code
These docs describe the current state of code. Code changes propagate here.
If the doc is wrong, the fix is to regenerate it from the code.

- `FILE_STRUCTURE.md`
- `SCHEMAS.md` (table section — view contracts section is in VIEW_CONTRACTS which is spec)
- `SESSION_CONTEXT.md`
- `TECH_DEBT.md`

### Description + reasoning — explains why code is this way
These docs describe code AND explain the reasoning. They are updated when
the reasoning changes, not when the code changes cosmetically.

- `ARCHITECTURE.md`
- `CMS_REFERENCE.md`
- `COMPONENT_CHECKLIST.md`
- `BRAND_CONTENT_GUIDE.md`

### Description + reasoning with embedded specs
These files are mostly prose but contain specific blocks that are authoritative.
The blocks are marked `**[SPEC — DO NOT REWRITE]**` and must be copied verbatim
when referenced from other docs.

- `TROUBLESHOOTING.md`
  - Every Golden Reference subquery inside is marked `**[SPEC — DO NOT REWRITE]**`.
  - Reviewing the file: prose can be improved; SPEC blocks can only be updated
    from the authoritative source (the live view definition).
```

Use `str_replace` to insert this section at the correct position in `CLAUDE.md` — probably just before the "Reference Files Index" table at §17, so the classification is close to the index that lists them.

#### Step 3 — Post-insertion: add `[SPEC — DO NOT REWRITE]` markers

Read `TROUBLESHOOTING.md`. Find every Golden Reference subquery block. For each, wrap it with the marker:

```markdown
**[SPEC — DO NOT REWRITE — copy verbatim, source: v_storefront_products live definition]**

```sql
[existing Golden Reference block]
```

**[END SPEC]**
```

This should be a small number of edits (likely 1–3 blocks). Preserve the existing text around each block.

#### Step 4 — Commit

Two commits (two files):

```
A8a: Add spec-vs-description classification to CLAUDE.md

New section [N]: Reference File Classification
- 4 categories: Spec, Description, Description+reasoning, Description+embedded specs
- Every reference file classified

Refs: Recommendations §4 A8
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A8
```

```
A8b: Mark Golden Reference blocks in TROUBLESHOOTING.md as embedded specs

[N] Golden Reference blocks wrapped with [SPEC — DO NOT REWRITE] markers.

Cross-module pre-flight: CLEAR
Refs: Recommendations §4 A8
SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md A8
```

Log A8 as COMMITTED.

**All 9 Phase A items complete.**

---

## 5. Phase-End Sanity Check

**Purpose:** verify `develop` is still healthy (after Hotfix + Phase A commits) and ready for Phase B to run on top.

**Who runs it:** Daniel, on localhost. Claude Code cannot execute these steps.

**Environment:** localhost only. Same setup as Hotfix Sanity Check.

### 5.1 — Git state

```bash
cd opticup-storefront && git status
cd ../opticup && git status
```

Expected: both clean, on `develop`, with Phase A commits present on top of Hotfix commits.

### 5.2 — Static build + tests

```bash
cd opticup-storefront
npm run build
node scripts/full-test.mjs --no-build
```

Both must pass.

### 5.3 — Doc file sanity

Open each edited doc in a Markdown viewer (or IDE preview):
- `VIEW_CONTRACTS.md` — renders cleanly, all sections present for every view.
- `ARCHITECTURE.md` — renders cleanly, tenant resolution section present.
- `SCHEMAS.md` — renders cleanly, view column contracts subsection present.
- `FILE_STRUCTURE.md` — tree accurate for a sample of directories.
- `CLAUDE.md` — new classification section present, no broken links.
- `TROUBLESHOOTING.md` — `[SPEC — DO NOT REWRITE]` markers present around Golden References.
- `FROZEN_FILES.md` — normalize-logo status updated.

No broken anchors (doc cross-references resolve). Visual spot-check.

### 5.4 — Localhost smoke tests (lighter than Hotfix — Phase A is docs-only)

1. Storefront home loads clean (localhost).
2. ERP loads clean (localhost).
3. Login + logout on demo tenant.
4. Module 1 and Module 2 pages load clean.

These mirror Hotfix §5.5 steps 1–6. If all 4 pass, Phase A did not break runtime — as expected, since it touched no runtime code.

### 5.5 — Tier C client results reality check

Open `tier_c_results_client.json`. Pick one view (e.g. `v_storefront_products`) and verify the columns list Claude Code captured matches the current live view columns:

```bash
# Quick verification via Supabase JS REPL or equivalent
# Or simply open the view in Supabase Dashboard → Table Editor → check column count
```

Column count and names in the client JSON should match what the Dashboard shows. If they differ → something updated the schema between A0 and Sanity Check, or A0 results are corrupted. STOP and report.

### 5.6 — Run `tier_c_manual_queries.sql` in Dashboard (MANDATORY)

This step produces `tier_c_results_manual.json`, which the later cleanup round uses to fill every `<!-- TIER-C-PENDING -->` marker left by A1/A3/A4/A6.

Steps:

1. Open Supabase Dashboard → SQL Editor → New query.
2. Paste the contents of `opticup/modules/Module 3 - Storefront/discovery/tier_c_manual_queries.sql` (committed by A0 step 7).
3. Click Run. All queries execute in one batch.
4. For each result set in the output panel, click "Download as JSON" (or copy the JSON).
5. Combine into a single file `tier_c_results_manual.json` with top-level keys matching the queries, e.g.:
   ```json
   {
     "generated_at": "2026-04-11T08:00:00Z",
     "Q1b_view_bodies": [ /* results from Q1b */ ],
     "Q2_check_constraint": [ /* results from Q2 */ ],
     "Q3_...": [ /* ... */ ],
     "dependency_graph": [ /* results from dep graph query */ ]
   }
   ```
6. Save the file at `opticup/modules/Module 3 - Storefront/discovery/tier_c_results_manual.json`.
7. Commit to the opticup repo:
   ```bash
   cd opticup
   git add "modules/Module 3 - Storefront/discovery/tier_c_results_manual.json"
   git commit -m "A0-manual: Tier C Dashboard query results

   Ran tier_c_manual_queries.sql in Supabase Dashboard during Phase A
   Sanity Check. Results committed for cleanup round to consume.

   Queries resolved:
   - Q1b (view bodies incl. Golden Reference subqueries)
   - Q2 (content_translations entity_type CHECK)
   - Dependency graph for storefront views
   - [any Q3-Q7 dashboard parts]

   Unblocks: cleanup round for TIER-C-PENDING markers in
   VIEW_CONTRACTS.md, ARCHITECTURE.md, SCHEMAS.md, TROUBLESHOOTING.md.
   NOT blocking for Phase B main work — cleanup is scheduled as
   Phase B preamble or dedicated mini-SPEC per Phase B SPEC decision.

   SPEC: MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md §5.6"
   git push origin develop
   ```

**If any query in the SQL file errors** (syntax error, permission denied, relation not found) → record which query failed and its error, then decide:
- If a DASHBOARD query classification was wrong (e.g. a public-schema table accessed via `pg_catalog` that didn't need to be) → that's an A0 bug, file as an issue but don't block Sanity Check. The cleanup round handles the successful queries.
- If the schema changed between A0 and now → STOP, investigate.

**This step is mandatory** — Daniel cannot skip it and proceed to Phase B, because the cleanup round depends on `tier_c_results_manual.json` existing. However, the cleanup round itself does NOT run during Sanity Check — it runs as Phase B preamble or as a separate mini-SPEC, per Phase B SPEC decision.

### 5.7 — Declare Sanity Check pass

Only after 5.1–5.6 all pass:

```
Phase A Sanity Check: PASS
- Git clean, build + tests pass
- Doc files render cleanly, TIER-C-PENDING markers present where expected
- Localhost smoke tests pass
- Tier C client results verified against live schema
- tier_c_results_manual.json produced and committed
develop is healthy. Phase B may begin.
TIER-C-PENDING cleanup: deferred to Phase B SPEC preamble.
```

Log to the Phase A execution log. Then proceed to the Phase B core SPEC (`MODULE_3_B_SPEC_saas_core_2026-04-12.md`) — its first step will be the TIER-C-PENDING cleanup using `tier_c_results_manual.json`.

---

## 6. Handback Protocol

### 6.1 — Normal completion (all 9 items green)

When all 9 A items are COMMITTED, Claude Code emits this handback block verbatim and then terminates execution:

```
===================================================
MODULE 3 PHASE A SPEC — EXECUTION COMPLETE
===================================================

Items executed: 9
Status by item:
- A0: COMMITTED (Tier C queries: [N] executed, [N] skipped to manual)
- A1: COMMITTED ([N] views documented)
- A2: COMMITTED
- A3: COMMITTED
- A4: COMMITTED ([N] hidden columns documented)
- A5: COMMITTED
- A6: COMMITTED (Golden Reference: [identical | updated])
- A7: COMMITTED (HF2 outcome: [PROCEEDED | EXITED])
- A8: COMMITTED (2 commits — classification + SPEC markers)

Commits (on develop):
- opticup-storefront:
  - <sha> A1: ...
  - <sha> A2: ...
  - <sha> A3: ...
  - <sha> A4: ...
  - <sha> A5: ...
  - <sha> A6: ...
  - <sha> A7: ...
  - <sha> A8a: ...
  - <sha> A8b: ...
- opticup:
  - <sha> A0: ...

Branches:
- opticup-storefront: develop (ahead of origin/develop by N commits — pushed)
- opticup: develop (ahead of origin/develop by N commits — pushed)

Execution log: [path to phase_a_execution_log_2026-04-11.md]

Pending Daniel actions (non-blocking for Phase B):
[list from execution log, or "none"]

Next step:
1. Daniel runs §5 Phase-End Sanity Check on localhost.
2. If Sanity Check passes → start Phase B core SPEC
   (MODULE_3_B_SPEC_saas_core_2026-04-12.md).
3. If Sanity Check fails → report to Module 3 Strategic Chat, do not proceed.

This SPEC does NOT auto-start Phase B.

===================================================
```

### 6.2 — Abnormal termination

Same format as Hotfix §6.2 handback, with "Phase A" substituted for "Hotfix" and the relevant item/step details from the deviation. Chain is STOPPED; Daniel resolves.

---

## 7. SPEC Metadata + Final Success Criteria

**SPEC:** `MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md`
**Version:** v1
**Author chain:** Module 3 Strategic Chat (first draft)
**Parent document:** `MODULE_3_RECOMMENDATIONS_2026-04-10_from_discovery_v3.md` §4
**Prerequisite SPEC:** `MODULE_3_HF_SPEC_2026-04-10.md` v3 (fully executed + Sanity Check PASS)
**Source rules:**
- `opticup-storefront/CLAUDE.md` (Rules 1–30)
- `opticup/CLAUDE.md` (Iron Rules 1–23)

### 7.1 — Expected commits

- `opticup-storefront`: 9 commits (A1, A2, A3, A4, A5, A6, A7, A8a, A8b)
- `opticup`: 1 commit (A0 — three artifacts in one commit: `tier_c_results_client.json` + `tier_c_manual_queries.sql` + `tier_c_results_2026-04-11.md` summary, all in the Module 3 discovery dir)

Total from Claude Code: 10 commits.

**Plus 1 commit produced by Daniel during §5.6 Sanity Check:** `A0-manual` commit containing `tier_c_results_manual.json` in the opticup repo. This is not a Claude-Code-produced commit but it is expected to exist before Phase B starts.

### 7.2 — Success criteria (all must hold for a PASS)

1. All 9 items have status `COMMITTED` in the execution log.
2. No item is `IN_PROGRESS` or `PENDING` at session end.
3. For every `COMMITTED` item, both repos' git log contains the claimed commit hashes.
4. `npm run build` passes at final state.
5. `node scripts/full-test.mjs --no-build` passes at final state.
6. **Three A0 artifacts exist:** `tier_c_results_client.json` (populated with Q1a and client-runnable Q3-Q7 portions), `tier_c_manual_queries.sql` (contains Q1b, Q2, dep graph query, and DASHBOARD-classified Q3-Q7 portions), `tier_c_results_2026-04-11.md` (summary doc with query status table).
7. **`VIEW_CONTRACTS.md` contains a partial contract entry for every view in `Q1a_view_columns`** — columns + GRANTs are complete; Purpose, Depends on, Dependents, Golden Reference, Rule 29 DROP order are marked `<!-- TIER-C-PENDING -->`.
8. **`ARCHITECTURE.md`** has all sections complete EXCEPT the full DROP/CREATE order which is marked `<!-- TIER-C-PENDING -->`.
9. **`SCHEMAS.md`** has view column contracts subsection + hidden columns subsection complete; CHECK constraint verification subsection is marked `<!-- TIER-C-PENDING -->`.
10. **`TROUBLESHOOTING.md`** has TECH_DEBT reference corrected + `<!-- TIER-C-PENDING -->` marker above the Golden Reference block for the deferred byte-match.
11. `opticup-storefront/CLAUDE.md` contains the new Reference File Classification section (A8).
12. `FROZEN_FILES.md` normalize-logo entry reflects the HF2 outcome (A7).
13. Handback block (§6.1 or §6.2) is emitted.

### 7.3 — Out of scope (reminders)

- **No merge to main.** `develop` accumulates.
- **No runtime code changes** (except A5's potential dead-import removal, which must be justified by a specific F043–F046 finding).
- **No new SQL that mid-chain-blocks.** A0 is read-only: client queries run inline, Dashboard queries are written to a SQL file that Daniel runs in §5.6 Sanity Check (not during chain execution).
- **No touch of Module 1/2/1.5.**
- **No changes to HF1–HF10 work.** Hotfix commits stand as-is.
- **No Phase B work.** Phase B has its own SPEC.
- **No TIER-C-PENDING cleanup in Phase A.** The `<!-- TIER-C-PENDING -->` markers left by A1/A3/A4/A6 are deliberately NOT filled inside this SPEC. The cleanup is scheduled as the first step of the Phase B core SPEC (or as a dedicated mini-SPEC between Phase A and Phase B if Main decides at Phase B SPEC writing time). The cleanup reads `tier_c_results_manual.json` (produced by Daniel in §5.6) and performs byte-match/dependency-chain/CHECK-constraint population for each marker. **Phase A is considered successful even with all markers present** — partial completeness is the expected final state of Phase A.

### 7.4 — Chain position

After Phase A green + Sanity Check pass, the chain continues:
1. **Phase B core** — `MODULE_3_B_SPEC_saas_core_2026-04-12.md` (Night 2).
2. **Phase B B6** — `MODULE_3_B_SPEC_saas_session_keys_2026-04-12.md` (Night 2, separately).
3. Phase C — three sub-SPECs (Nights 3–4).
4. Phase D — one SPEC (Night 5).
5. End of chain: Daniel performs the single manual merge to main after full cross-phase QA.

---

*End of MODULE_3_A_SPEC_docs_reconciliation_2026-04-11.md v1. Awaiting Main Strategic Chat review before execution.*
