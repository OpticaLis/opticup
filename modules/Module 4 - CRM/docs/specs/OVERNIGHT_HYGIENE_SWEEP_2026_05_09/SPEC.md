# SPEC — OVERNIGHT_HYGIENE_SWEEP_2026_05_09

> **Location:** `modules/Module 4 - CRM/docs/specs/OVERNIGHT_HYGIENE_SWEEP_2026_05_09/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Cowork session, Daniel-directed
> **Authored on:** 2026-05-09
> **Module:** Cross-cutting (M3, M4, shared, scripts, docs) — filed under M4 by convention (M4 is the most active SPEC home)
> **Phase:** Post-cutover hygiene sweep
> **Author signature:** Cowork strategic chat 2026-05-09

---

## 1. Goal

Execute a single 8–12 hour overnight autonomous run that closes 16 independent low-risk hygiene items across the project: cleanup leftovers, Sentinel MEDIUM/LOW findings, doc backfills, code-symbol renames, and FOREMAN_REVIEW backlog catch-up. Each item is independently verifiable, independently revertable, and **non-overlapping** so failures cannot cascade.

The deliverable is **a measurably cleaner project** — Sentinel MEDIUM/LOW count down by ~9 items, OPEN_TASKS items #2 + #3 closed, FOREMAN_REVIEW backlog reduced by ~9 reviews, and zero new tech debt introduced.

---

## 2. Background & Motivation

Daniel directed an 8-12h overnight run on 2026-05-09 to consolidate OPEN_TASKS #2 (GITIGNORE_CLEANUP) and #3 (Skills audit) plus additional Sentinel/TECH_DEBT items that meet the no-risk threshold. Scope was negotiated up to 16 items (from initial 10) on the explicit instructions:

- **Quality over speed** — take the time, paralleliz with sub-agents where useful
- **Never get stuck** — if any single item cannot be solved cleanly, skip it and continue. Orphans go to §13 for the morning report.
- **Sub-agents are allowed and encouraged** — for searches, audits, and any read-heavy investigation.

Scope was selected to satisfy three criteria:
1. Each item has measurable success/failure
2. Zero changes to live business logic on customer-data paths
3. Items are independent — the failure of any one does not block any other

Items NOT included (and why):
- M13 Architecture Brief (requires Daniel-in-the-loop, not autonomous)
- TD-2 migrations git drift (requires architectural decision before execution)
- M-1/M-2/M-10 RLS perf review (requires iterative security audit)
- H-3 24 oversized files (requires per-file decomposition judgment)

Source documents:
- `OPEN_TASKS.md` (2026-05-09 EOD)
- `docs/guardian/GUARDIAN_ALERTS.md` (2026-05-09 17:30 UTC)
- `TECH_DEBT.md` (active items #2, #10)
- `MASTER_ROADMAP.md` §3 (post-cutover state)

---

## 3. Success Criteria (Measurable)

The 16 items are listed in §8 with their individual success criteria. The SPEC-level criteria are:

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at start | On `develop`, clean | `git status` → "nothing to commit, working tree clean" |
| 2 | Branch state at end | On `develop`, clean, all commits pushed | `git status` → "nothing to commit"; `git log origin/develop..HEAD` → empty |
| 3 | Items attempted | 16 items addressed (closed OR skipped with reason) | Item-by-item verdict table in EXECUTION_REPORT.md §4 |
| 4 | Items closed (target) | ≥12 of 16 closed cleanly | Verdict table — "CLOSED" count |
| 5 | Items skipped (allowed) | ≤4 of 16 skipped to FINDINGS.md | Verdict table — "SKIPPED" count |
| 6 | Skipped items documented | Each skipped item has its own FINDING with root cause | FINDINGS.md item count = skipped count |
| 7 | Integrity gate at end | exit 0 | `npm run verify:integrity` → exit 0 |
| 8 | verify.mjs at end | exit 0 (clean) or exit 2 (warnings only, NEVER exit 1) | `node scripts/verify.mjs --full` |
| 9 | No production behavior change | Production CRM, storefront, ERP all functional | Spot-check: 3 storefront pages, 3 ERP pages — 200 OK, no console errors |
| 10 | EXECUTION_REPORT.md present | File exists with full retrospective | `ls` shows file |
| 11 | FINDINGS.md present (if any skipped) | File exists with one FINDING per skipped item | `ls` shows file when count > 0 |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in either repo (ERP + sibling storefront if mounted)
- Run read-only SQL (Level 1 autonomy) for verification queries
- Edit/create/move/delete files listed in §8 per-item Expected Final State
- Commit and push to `develop` after each item closes
- Run all standard verify scripts (`verify.mjs`, `verify:integrity`, `schema-diff.mjs`)
- **Spawn sub-agents** for read-heavy work: file-pattern searches, FOREMAN_REVIEW reads, code audits, doc surveys. Use `Agent` tool with `subagent_type: "Explore"` or `"general-purpose"`. Recommend ≥3 parallel sub-agents for items 8 + 9 + 16 (all read-heavy).
- **Skip an item and continue** if any of these happen:
  - Item's source file no longer exists or has been refactored away
  - Item's claimed problem cannot be reproduced (e.g. grep returns 0 hits where Sentinel claimed N)
  - Item depends on sibling-repo mount that is unavailable
  - Item's fix would touch code outside §7 Out-of-Scope
  - Verify command for that item fails after one retry
  - Item conflicts with another item already closed in this run

### What REQUIRES stopping (HARD STOP — do NOT continue)
- Any merge to `main` (Daniel-only authorization)
- Any DDL / schema change (Level 3 autonomy never autonomous — items in this SPEC are all DDL-free by design)
- Repo becomes broken: `verify.mjs --full` returns exit 1, OR app fails to load on localhost
- `npm run verify:integrity` returns exit 1 (null-byte corruption — Iron Rule 31)
- Any iron rule (1–31) would be violated by the next step
- 5 items in a row skip with the same root cause (signals a systemic issue, not item-level)

### Skip vs Stop — the rule
**Skip:** the item itself can't be done. Move on. Document in FINDINGS.md.
**Stop:** the project is broken. Push the green button. Wake up Daniel.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `crm_leads` row count drops below 1100 → STOP (production data integrity)
- If `tenants` table is touched in any way (DDL or data) → STOP (out of scope)
- If any SMS / WhatsApp / Email actually sends to a real customer → STOP (this SPEC is doc/code hygiene, not messaging)
- If any Edge Function is redeployed → STOP (out of scope)
- If `npm run verify:integrity` fails between commits → STOP and investigate before next commit (null-byte corruption is the worst class of bug)
- If commit count exceeds 30 → STOP and report (likely scope creep; SPEC expected ~16-20 commits max)

---

## 6. Rollback Plan

Each item is its own commit (or small commit group). To roll back individual items:
- `git revert <commit_hash>` for the offending commit(s)
- Push the revert to `develop`

Full SPEC rollback (all 16 items reverted):
- `git reset --hard <START_COMMIT>` where START_COMMIT = the commit at which the executor started this run (capture in EXECUTION_REPORT.md §1)
- `git push --force-with-lease origin develop` (Daniel must approve force-push explicitly — STOP and ask)

DB rollback: not applicable — this SPEC has zero DDL and zero customer-data writes.

---

## 7. Out of Scope (explicit — DO NOT TOUCH)

Things that look related but MUST NOT be touched in this SPEC:

- **Any DDL / schema migration** — even if a hygiene item "would be cleaner with a column rename"
- **Any RLS policy edit** — even if a Sentinel finding suggests it
- **Any Edge Function** — `lead-intake`, `send-message`, `pin-auth`, etc. all stay frozen
- **Any logic change in:** `js/auth-service.js`, `js/shared.js` core helpers (FIELD_MAP, T-constants, `formatMoney`), `modules/crm/crm-helpers.js` PIN flow, any `*-actions.js` file's data-write functions
- **`tenants` table** in any way (data or DDL)
- **`crm_leads` table** in any way (data or DDL) — read-only verification queries only
- **`shared/`** core files (only the table-builder.js currency hardcode, item #4 below, is in scope)
- **`main` branch** — never checkout, never merge, never push
- **M13 Architecture Brief** (separate Daniel-driven session)
- **TD-2 migrations git drift** (separate SPEC, requires architectural decision)
- **H-3 oversized file decomposition** (separate SPECs, per-file judgment required)
- **M-1 / M-2 / M-10 / M-11 RLS performance audits** (separate SPECs)

---

## 8. Expected Final State — Per-Item Breakdown

The executor walks items in order. Each item is independent. Skip on failure; continue.

### Item 1 — GITIGNORE_CLEANUP (OPEN_TASKS #2)

**Source:** `OPEN_TASKS.md` task #2

**What:** 3 cleanup leftovers from POST_MERGE_QA: stray `-p/` directory at repo root, duplicate `.claude/` line in `.gitignore` line 34, recursive Module 3 backups bloat.

**Action:**
- `rm -rf -p/` if it exists at repo root
- Open `.gitignore`, dedupe `.claude/` (keep first occurrence, delete subsequent duplicates)
- Survey `modules/Module 3 - Storefront/backups/` size and contents — if any backup folder is >50MB or older than 30 days AND already in git history, move to `_archive/module-3-old-backups/` (or delete if already archived elsewhere). Document the decision per backup folder in EXECUTION_REPORT.md.

**Verify:**
- `ls -la /sessions/*/mnt/opticup/-p` → "No such file"
- `grep -c "^\.claude/" .gitignore` → 1
- `du -sh modules/Module\ 3\ -\ Storefront/backups/` → smaller than before, OR documented as already-clean

**Commit message:** `chore(cleanup): remove POST_MERGE_QA leftovers (-p/ dir, .gitignore dedupe, M3 backups bloat)`

**Skip if:** any of the 3 leftovers don't exist (Sentinel was wrong) — note in FINDINGS, continue.

---

### Item 2 — Skills audit report (OPEN_TASKS #1)

**Source:** `OPEN_TASKS.md` task #1

**What:** Read all 7 skill files under the active skills directory and produce a structured audit report.

**Action:**
- Spawn ONE sub-agent (`subagent_type: "general-purpose"`) with this brief: "Read all skill files in the project's skills directories. For each skill, report: (a) name + purpose, (b) length in lines, (c) overlap with other skills (which other skills cover similar territory), (d) gaps (what should the skill do but doesn't), (e) duplication with project docs (e.g., does the skill restate Iron Rules from CLAUDE.md). Return a markdown report under 1500 words."
- Skill list to find: `opticup-strategic`, `opticup-executor`, `opticup-reviewer`, `opticup-sentinel`, `opticup-guardian`, `opticup-architect` (if present), `opticup-campaign-overseer` (if present), `opticup-site-overseer` (if present). Sub-agent should locate them.
- Save the agent's report to `modules/Module 4 - CRM/docs/specs/OVERNIGHT_HYGIENE_SWEEP_2026_05_09/SKILLS_AUDIT_REPORT.md`

**Verify:**
- `ls modules/Module\ 4\ -\ CRM/docs/specs/OVERNIGHT_HYGIENE_SWEEP_2026_05_09/SKILLS_AUDIT_REPORT.md` → exit 0
- Word count between 800-1500 words: `wc -w` returns value in [800, 1500]

**Commit message:** `docs(skills): add skills audit report from overnight sweep`

**Skip if:** sub-agent fails to locate skill files (unlikely but possible) — document in FINDINGS.

---

### Item 3 — DB_TABLES_REFERENCE backfill (Sentinel M-12)

**Source:** Sentinel MEDIUM finding M-12

**What:** `docs/DB_TABLES_REFERENCE.md` (151 lines) has 0 occurrences of `crm_` and 0 of `short_links`. Iron Rule 21 explicitly requires this file be updated when tables are added. Add 28 CRM rows + `short_links`.

**Action:**
- Read current `docs/DB_TABLES_REFERENCE.md` to understand the row format (`T.CONSTANT_NAME → table_name → key columns`)
- Read `docs/GLOBAL_SCHEMA.sql` to extract all 28 CRM tables + `short_links` definitions
- Read `js/shared.js` `FIELD_MAP` and `T` constants for canonical T-constant names
- Append 29 new rows to `DB_TABLES_REFERENCE.md` in the existing format, alphabetically grouped under a new "Module 4 — CRM" section
- Verify each T-constant cited actually exists in `js/shared.js`

**Verify:**
- `grep -c "crm_" docs/DB_TABLES_REFERENCE.md` → ≥28
- `grep -c "short_links" docs/DB_TABLES_REFERENCE.md` → ≥1
- All cited T-constants resolve via `grep "T\.<NAME>" js/shared.js`

**Commit message:** `docs(db-ref): backfill 28 CRM tables + short_links to DB_TABLES_REFERENCE (M-12)`

**Skip if:** GLOBAL_SCHEMA.sql doesn't have the table definitions (unexpected) → escalate to FINDINGS as a doc-drift finding.

---

### Item 4 — Currency hardcodes → formatMoney (Sentinel M-6 + L-21)

**Source:** Sentinel M-6 + sub-LOW L-21

**What:** Replace `toLocaleString('he-IL', { style: 'currency', currency: 'ILS' })` with `formatMoney()` from `js/shared.js`. Affects:
- `shared/js/table-builder.js` lines 23, 27 (M-6)
- `modules/goods-receipts/receipt-form-items.js` lines 254, 260 (L-21)

**Action:**
- Verify `formatMoney()` exists in `js/shared.js` and accepts the same input shape
- Replace both call sites in `table-builder.js`
- Replace both call sites in `receipt-form-items.js`
- Surface-test on localhost:3000 if available (skip browser test if Cowork can't reach localhost — note in EXECUTION_REPORT)

**Verify:**
- `grep -c "toLocaleString.*he-IL.*currency.*ILS" shared/js/table-builder.js modules/goods-receipts/receipt-form-items.js` → 0
- `grep -c "formatMoney" shared/js/table-builder.js modules/goods-receipts/receipt-form-items.js` → ≥4

**Commit message:** `refactor(saas): replace ILS hardcodes with formatMoney() in table-builder + receipt-form-items (M-6, L-21)`

**Skip if:** `formatMoney()` signature isn't compatible (e.g., expects string vs number) → document in FINDINGS.

---

### Item 5 — Production console.log cleanup (Sentinel M-9)

**Source:** Sentinel MEDIUM finding M-9

**What:** Remove or guard 3 production `console.log` calls:
- `modules/crm/crm-incoming-tab.js:288` (realtime subscribe — fires every event)
- `modules/crm/crm-incoming-tab.js:329` (polling refresh — fires every 30s)
- `modules/debt/debt-doc-edit.js:276` (AI-correction save — fires every save)

**Action:**
- For each: either DELETE the log line, OR wrap in `if (window.DEBUG) { ... }` if the log is ever needed for debugging. Default: DELETE (cleaner).
- Verify file is still syntactically valid: load the file in node `node -c <path>` for any `.js` file (won't work for files using browser globals — fall back to `verify.mjs`)

**Verify:**
- `grep -n "console\.log" modules/crm/crm-incoming-tab.js modules/debt/debt-doc-edit.js` → no matches at the cited lines
- `verify.mjs --staged` → exit 0 or exit 2

**Commit message:** `chore(production): remove production console.log in CRM realtime + debt OCR (M-9)`

**Skip if:** the lines have already been removed (Sentinel was stale) → mark CLEAN in EXECUTION_REPORT.

---

### Item 6 — SMS template_not_found fix (Sentinel L-24)

**Source:** Sentinel LOW finding L-24

**What:** 2 failed SMS sends in last 7 days, both `template_not_found`:
1. Caller bug — template name has double `_sms_he` suffix
2. Template name `event_registration_form_sms_he` doesn't exist in `crm_messaging_templates`

**Action:**
- For (1): grep the codebase for template lookups that compose the name with `_sms_he` and verify none of them double-suffix. Likely culprits: `modules/crm/crm-messaging-templates.js`, send-message Edge Function caller.
- For (2): query `crm_messaging_templates` to confirm the missing template name. If it's truly missing, document the gap in FINDINGS — **do NOT create the template** (out of scope: data writes). The bug is "code calls a template that doesn't exist"; either the code should call a different name, or the template should be created in a separate SPEC.
- Fix the caller bug in (1). Document (2) in FINDINGS for a follow-up SPEC.

**Verify:**
- `grep -rn "_sms_he_sms_he" --include="*.js" --include="*.ts" .` → 0 hits
- `grep -rn "_sms_he_sms_he" --include="*.html" .` → 0 hits

**Commit message:** `fix(crm): remove double _sms_he suffix in template caller (L-24)`

**Skip if:** double-suffix bug isn't actually in the code (Sentinel attribution wrong) — document in FINDINGS, mark item CLEAN.

---

### Item 7 — SESSION_CONTEXT refresh M1.5 + M3 (Sentinel M-7)

**Source:** Sentinel MEDIUM finding M-7

**What:**
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` is 7 weeks stale
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` is 13 days stale; 8 SPECs closed since (PHONE_TEMPLATING, CMS_BLOCKS_RESTORE, COOKIE_CONSENT, TENANT_NAME_FALLBACK_SAAS, PHONE_434_LEGACY_CLEANUP, WP_BLOG_POST_MAPPING, WP_SUBDOMAINS_REDIRECT, plus M3_SITEMAP_BRAND_404_CLEANUP per recent TECH_DEBT entries)

**Action:**
- For each module: read current SESSION_CONTEXT.md, then read the SPEC folders closed since the file's last update timestamp, then rewrite SESSION_CONTEXT.md with: (a) current phase status, (b) recent SPECs closed, (c) what's open, (d) next probable session direction.
- Use `git log` to identify "last meaningful commit" per module since the file's `Last updated` line.
- Spawn ONE sub-agent per module (`subagent_type: "Explore"`) to investigate state and return a 200-word draft. Foreman (executor) integrates drafts into final SESSION_CONTEXT.

**Verify:**
- Both SESSION_CONTEXT.md files have a `Last updated: 2026-05-09` line at top
- File content references at least 3 of the 8 recently-closed M3 SPECs
- File length stays under 200 lines (per state-management rule)

**Commit message:** `docs(modules): refresh M1.5 + M3 SESSION_CONTEXT after 13d/7w drift (M-7)`

**Skip M3 if:** sibling-repo storefront is needed and unavailable (M3 SESSION_CONTEXT can be refreshed from ERP-side context alone — should not skip).

---

### Item 8 — M3 FOREMAN_REVIEW backlog catch-up — first batch of 5 (Sentinel L-22)

**Source:** Sentinel LOW finding L-22 — 26 of 36 M3 SPEC folders missing FOREMAN_REVIEW.md

**What:** Catch up the first 5 missing FOREMAN_REVIEWs in M3, oldest first.

**Action:**
- List `modules/Module 3 - Storefront/docs/specs/` and find folders with SPEC.md + EXECUTION_REPORT.md but no FOREMAN_REVIEW.md
- Order by SPEC.md authored date (oldest first)
- For each of the first 5: spawn ONE sub-agent (`subagent_type: "general-purpose"`) with this brief: "Read SPEC.md + EXECUTION_REPORT.md + FINDINGS.md (if present) for SPEC `<slug>`. Write a FOREMAN_REVIEW.md per the template at `.claude/skills/opticup-strategic/references/FOREMAN_REVIEW_TEMPLATE.md`. Stay under 400 words. The verdict is binary: 🟢 CLOSED if the EXECUTION_REPORT shows clean execution, 🟡 CLOSED WITH FOLLOW-UPS if there are open FINDINGS not yet filed elsewhere. Always include 2 author-skill + 2 executor-skill improvement proposals harvested from this specific SPEC."
- Run all 5 sub-agents IN PARALLEL (single message with 5 Agent calls). Save each output to its respective folder.
- Foreman (executor) does NOT integrate or rewrite — sub-agent output is the deliverable. Spot-check 1 of the 5 for quality.

**Verify:**
- 5 new FOREMAN_REVIEW.md files exist in M3 SPEC folders
- Each is 200-400 words: `wc -w <file>` → in [200, 400]
- Each has the 4 required improvement proposals (grep for "Author improvement" + "Executor improvement")

**Commit message:** `docs(m3): catch up 5 oldest FOREMAN_REVIEWs in M3 backlog (L-22)`

**Skip individual reviews if:** the SPEC folder is missing EXECUTION_REPORT (executor never finished) — those are L-17 cases, document in FINDINGS as historical SPECs needing different handling.

---

### Item 9 — M4 pending FOREMAN_REVIEWs (memory line)

**Source:** Memory `project_campaign_overseer.md` — 4 pending FOREMAN_REVIEWs from M4 marathon: ACTIVITY_LOG_DEDUP, RESTORE_DELETED_EVENT_UI, POST_4 (pagination), PHONE_SEARCH

**What:** Same protocol as Item 8 but for M4. Write 4 FOREMAN_REVIEWs.

**Action:**
- Same as Item 8 — 4 sub-agents in parallel, each writes one FOREMAN_REVIEW.
- Locations:
  - `modules/Module 4 - CRM/docs/specs/ACTIVITY_LOG_DEDUPLICATION_DELETE_EVENT/`
  - `modules/Module 4 - CRM/docs/specs/RESTORE_DELETED_EVENT_UI/`
  - `modules/Module 4 - CRM/docs/specs/POST_4_LEADS_PAGINATION_BUMP/` (or whatever the actual slug is — list and find)
  - `modules/Module 4 - CRM/docs/specs/PHONE_SEARCH_PARTIAL_FIX/`

**Verify:**
- Each of the 4 folders has a new FOREMAN_REVIEW.md
- Each is 200-400 words
- Each contains the 4 improvement proposals

**Commit message:** `docs(m4): write 4 pending FOREMAN_REVIEWs from cutover marathon`

**Skip individual reviews if:** any folder is missing EXECUTION_REPORT — document and continue.

---

### Item 10 — GLOBAL_SCHEMA header fix (Sentinel L-18)

**Source:** Sentinel LOW finding L-18

**What:** `docs/GLOBAL_SCHEMA.sql` preamble line 5 says "84 base tables", body lists ≥112, live count is 113 (`branches` added by M3_BRANCHES_INFRA_AND_ASHKELON). TABLES section header at line 68 also wrong.

**Action:**
- Edit line 5: change "84 base tables" → "113 base tables"
- Edit line 68 TABLES section header similarly
- Verify by counting: `grep -c "^CREATE TABLE" docs/GLOBAL_SCHEMA.sql`

**Verify:**
- `grep -n "84 base tables" docs/GLOBAL_SCHEMA.sql` → 0 hits
- Line 5 contains the correct count

**Commit message:** `docs(schema): fix GLOBAL_SCHEMA header — 84→113 base tables (L-18)`

**Skip if:** the count differs from 113 (live state changed) — use the actual count from grep.

---

### Item 11 — Rename PRIZMA_PHONE_RE → IL_PHONE_RE (Sentinel L-4)

**Source:** Sentinel LOW finding L-4

**What:** `modules/crm/crm-helpers.js:14` declares `PRIZMA_PHONE_RE`. The regex itself is generic Israeli phone (`+972`); the name is misleading (multi-tenant SaaS). Rename to `IL_PHONE_RE`.

**Action:**
- `grep -rn "PRIZMA_PHONE_RE" --include="*.js" --include="*.ts" --include="*.html" .` → enumerate all consumers
- Rename in declaration + all consumers in one commit
- Run `verify.mjs --staged` after change

**Verify:**
- `grep -rn "PRIZMA_PHONE_RE" --include="*.js" --include="*.ts" --include="*.html" .` → 0 hits
- `grep -rn "IL_PHONE_RE" --include="*.js" --include="*.ts" --include="*.html" .` → ≥1 hit (the declaration)
- Number of `IL_PHONE_RE` references ≥ original number of `PRIZMA_PHONE_RE` references

**Commit message:** `refactor(saas): rename PRIZMA_PHONE_RE → IL_PHONE_RE for multi-tenant clarity (L-4)`

**Skip if:** the regex itself is actually Prizma-specific (verify by reading) — leave name and document in FINDINGS.

---

### Item 12 — Replace raw 'inventory' string with T.INV constant (Sentinel L-23)

**Source:** Sentinel sub-LOW finding L-23

**What:** Receipts files use raw `'inventory'` table-name string in 3 spots instead of `T.INV` constant.

**Action:**
- `grep -rn "'inventory'" modules/goods-receipts/ --include="*.js"` → enumerate exact 3 spots
- Verify `T.INV` is the correct constant: `grep "INV:" js/shared.js`
- Replace each spot. If the spot is inside a `.from()` call, use `T.INV`.

**Verify:**
- `grep -rn "'inventory'" modules/goods-receipts/ --include="*.js"` → 0 hits (excluding comments)
- `grep -rn "T\.INV" modules/goods-receipts/ --include="*.js"` → ≥3 hits

**Commit message:** `refactor(saas): replace 'inventory' string with T.INV constant in goods-receipts (L-23)`

**Skip if:** `T.INV` doesn't exist or has a different name — document in FINDINGS, no commit.

---

### Item 13 — Split scripts/README.md (TECH_DEBT #2)

**Source:** `TECH_DEBT.md` #2 (🟢 LOW)

**What:** `scripts/README.md` (142 lines) mixes InventorySync watcher docs (~77 lines) with verify-system docs (~65 lines).

**Action:**
- Read current `scripts/README.md`
- Create `scripts/README-sync-watcher.md` with the watcher content (~77 lines)
- Create `scripts/README-verify.md` with the verify content (~65 lines)
- Delete `scripts/README.md`
- Search project for any reference to `scripts/README.md` (`grep -rn "scripts/README.md"`) and update each to point to the appropriate split file

**Verify:**
- `ls scripts/README.md` → "No such file"
- `ls scripts/README-sync-watcher.md scripts/README-verify.md` → both exist
- `grep -rn "scripts/README.md" .` → 0 hits

**Commit message:** `docs(scripts): split scripts/README.md into sync-watcher + verify (TECH_DEBT #2)`

**Skip if:** content split is ambiguous (sections don't cleanly divide) — document and skip.

---

### Item 14 — tenant-fallback-map.json regenerate (TECH_DEBT #10)

**Source:** `TECH_DEBT.md` #10 (🟢 LOW)

**What:** `opticup-storefront/src/data/tenant-fallback-map.json` drifts on every storefront build (generator emits a `www.prizma-optic.co.il` key missing from committed copy).

**Action — DEPENDS ON SIBLING REPO MOUNT:**
- Check if `opticup-storefront/` is mounted: `ls /sessions/*/mnt/opticup-storefront/` (or wherever Cowork mounts it)
- If NOT mounted: SKIP this item. Document in FINDINGS as "requires sibling-repo mount; defer to Claude Code session on Daniel's machine".
- If mounted:
  - `cd` into storefront repo
  - Run `node scripts/generate-tenant-fallback-map.mjs`
  - `git diff src/data/tenant-fallback-map.json` to confirm only the www key change
  - Commit with: `chore(saas): regenerate tenant-fallback-map (TECH_DEBT #10)`
  - Push to storefront `develop`

**Verify:**
- `git status` in storefront repo → clean after commit
- File has both apex + www keys for prizma

**Skip if:** sibling repo not mounted (likely — Sentinel last reported "sibling not mounted in this VM") → document and continue.

---

### Item 15 — HTTP 406 fix on /meta.json query (Sentinel L-7)

**Source:** Sentinel LOW finding L-7

**What:** Storefront queries `/rest/v1/v_storefront_pages?slug=eq./meta.json` for a non-existent page slug. Returns HTTP 406 because the request uses `.single()` which requires exactly 1 row.

**Action — DEPENDS ON SIBLING REPO MOUNT:**
- If storefront repo not mounted: SKIP. Document in FINDINGS as deferred to Claude Code on Daniel's machine.
- If mounted:
  - `grep -rn "meta.json" opticup-storefront/src/` to find the call site
  - Either: (a) skip the query for `meta.json` entirely (route guard), OR (b) replace `.single()` with `.maybeSingle()` for defensive null handling
  - Recommendation: (a) — `meta.json` is a static asset, never a CMS slug, so the query is wrong by design. (b) is a fallback if (a) is structurally hard.

**Verify:**
- After fix: `grep "meta.json" opticup-storefront/src/` → either 0 hits (route excluded) or shows `.maybeSingle()`
- Run storefront build: `npm run build` → exit 0

**Commit message:** `fix(storefront): skip CMS query for static meta.json (L-7)`

**Skip if:** sibling repo not mounted → document and defer.

---

### Item 16 — Hardcoded short-link domain in messaging-templates (Sentinel L-10)

**Source:** Sentinel LOW finding L-10

**What:** `modules/crm/crm-messaging-templates.js:339-340` hardcodes `prizma-optic.co.il/r/...` as preview placeholder. Iron Rules 9 + 20 require tenant-config-driven values.

**Action:**
- Read the file to understand context (preview-only string for the template editor UI)
- Find the canonical short-link domain accessor — likely `tenant_config.short_link_domain` or similar. Spawn ONE sub-agent (`subagent_type: "Explore"`) with: "Find how the short-link domain is currently resolved at runtime in the project. Look in `js/shared.js`, `tenant_config` table reads, `resolve-link` Edge Function. Return the canonical helper function or property path used to get the short-link domain at runtime."
- Replace the hardcode with the canonical helper. If it's preview-only and the helper is async, fall back to a placeholder like `[short-link domain]` for the preview UI — document the choice.

**Verify:**
- `grep -n "prizma-optic.co.il/r/" modules/crm/crm-messaging-templates.js` → 0 hits
- File still loads on localhost ERP (skip if Cowork can't reach localhost)

**Commit message:** `refactor(saas): replace hardcoded short-link domain in template preview (L-10)`

**Skip if:** the canonical helper doesn't exist (preview UI has no good substitute) → document in FINDINGS as "needs design decision".

---

## 9. Commit Plan

Each item is its own commit. Item ordering matches §8. Some items may produce 0 commits if SKIPPED. Expected commit count: **12-18 commits**.

After all items done, write 3 closing artifacts (each is its own commit):
- `docs(spec): write EXECUTION_REPORT for OVERNIGHT_HYGIENE_SWEEP_2026_05_09`
- `docs(spec): write FINDINGS for OVERNIGHT_HYGIENE_SWEEP_2026_05_09` (if any skipped items)
- `docs(open-tasks): close OPEN_TASKS #1 + #2 after overnight sweep`

Total commit count expected: **15-21 commits**.

Push frequency: after every 3 successful commits, OR every 30 minutes (whichever comes first). Avoids losing work if the session terminates mid-run.

---

## 10. Dependencies / Preconditions

**Required at start:**
- ERP repo on `develop`, clean
- `npm run verify:integrity` passes (exit 0)
- Sub-agent capability available (Explore + general-purpose subagent_types)

**Optional (some items depend on these):**
- Sibling `opticup-storefront` repo mounted in Cowork VM (items 14, 15 — skip if absent)
- localhost:3000 ERP + localhost:4321 storefront accessible (items 4, 5, 16 — skip browser checks if absent; verify by `verify.mjs` instead)

---

## 11. Lessons Already Incorporated

This SPEC applies the following lessons from prior FOREMAN_REVIEWs and skill memory:

- **Stop on deviation, not on success** (CLAUDE.md §9) → §3 success criteria are mechanical; executor proceeds without asking when criteria pass.
- **Skip-not-stop for non-fatal item failures** (Daniel directive 2026-05-09) → §4 "Skip vs Stop — the rule" is the explicit policy; orphans go to §13 of EXECUTION_REPORT not to "STOP and report".
- **Sub-agents for read-heavy work** (Daniel directive 2026-05-09) → items 2, 7, 8, 9, 16 explicitly authorize parallel sub-agents.
- **Quality over speed** (Daniel directive 2026-05-09) → no time pressure in this SPEC; verify after every commit; push every 3 commits to avoid loss.
- **Pre-flight Step 0 (Reproduce-The-Bug-First, opticup-strategic SKILL §0)** → each Sentinel finding cited has been spot-confirmed in this SPEC author session by reading GUARDIAN_ALERTS.md fresh on 2026-05-09 17:30 UTC. Live-state probes happen at executor's Step 1.5, not pre-author.
- **Cross-Reference Check (opticup-strategic SKILL §1.5)** → the only new file paths this SPEC creates are `SKILLS_AUDIT_REPORT.md` (item 2), `EXECUTION_REPORT.md`, `FINDINGS.md`, `FOREMAN_REVIEW.md` (items 8 + 9), `scripts/README-sync-watcher.md` + `scripts/README-verify.md` (item 13). All are inside SPEC folders or `scripts/`. No global namespace collisions possible.
- **NEVER mock the database / NEVER skip verify** → item 4 + 11 + 12 each verify with `grep` returning expected counts before committing.
- **Iron Rule 31 — integrity gate** → §3 #7 mandates `verify:integrity` exit 0 at end. Executor MUST run after each commit per Iron Rule 31.

---

## 12. QA — End-of-SPEC Closure Steps

After all 16 items walked:

1. Run `node scripts/verify.mjs --full` — must exit 0 or 2
2. Run `npm run verify:integrity` — must exit 0
3. Smoke-test 3 ERP pages on localhost (if available): `index.html`, `crm.html`, `inventory.html` — load with no console errors
4. Smoke-test 3 storefront pages on localhost (if available): `/`, `/brand/luxottica`, `/contact` — load with no console errors
5. Run a Supabase MCP query: `SELECT COUNT(*) FROM crm_leads WHERE tenant_id = '6ad0781b-...'` (prizma) — confirm count ≥1100 (sanity check, not a write)
6. Update `OPEN_TASKS.md`:
   - Remove item #1 (Skills audit) and #2 (GITIGNORE_CLEANUP) from Active section if both completed
   - Move Sentinel findings closed (M-12, M-6, M-9, L-24, M-7, L-18, L-4, L-23, L-21, L-10, L-7) from "Sentinel HIGH/MEDIUM alerts" backlog to a "✅ Completed today" section — annotate with this SPEC slug
7. Write EXECUTION_REPORT.md (executor protocol)
8. Write FINDINGS.md (if any skipped items)
9. Final push to `origin/develop`. Repo MUST be clean.

---

## 13. Notes for the Executor

- **You are running 8-12 hours autonomously.** Take your time. Quality > speed.
- **If you finish early** — don't pad the work. Write a thorough EXECUTION_REPORT and FINDINGS, then stop. Daniel valued quality of fixes, not duration.
- **If you finish late** (>12h) — check in at the natural commit boundary, write what's done so far to EXECUTION_REPORT, push, and stop. Don't sprint.
- **Batch your sub-agent calls** when items are independent. Items 8 and 9 should each spawn 4-5 sub-agents in a single message (parallel execution).
- **Read EVERY item's "Skip if" condition before starting that item.** If the precondition for "Skip" is met, skip immediately — don't try to make it work.
- **Memory is persistent** — if you discover something worth remembering across sessions (a new pattern, a Daniel preference confirmed, a recurring failure mode), save it to auto-memory at the very end of the run, not mid-run.
- **Commit messages in English.** Lowercase verb. Scope in parens. Exactly as `CLAUDE.md §9 Commits` describes.
- **Push every 3 commits** OR every 30 minutes. Whichever comes first.
- **No `git add -A`. Ever.** Always explicit filenames.

---

*End of SPEC. The activation prompt to give Claude Code is in `ACTIVATION_PROMPT.md` in this same folder.*
