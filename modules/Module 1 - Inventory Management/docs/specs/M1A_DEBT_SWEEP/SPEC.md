# SPEC — M1A_DEBT_SWEEP

> **Template version:** v3 (2026-05-14).
> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-15
> **Module:** 1 — Inventory Management
> **Phase:** maintenance Pipeline between Phase 1A and Phase 1B
> **Author signature:** Full Auto Pipeline, single chat, 2026-05-15

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-15 (`modules/Module 1 - Inventory Management/architecture-brief/M1A_DEBT_SWEEP_BRIEF.md`, commit `d5689c4`).
- The Brief's §2 estimated baselines were VERIFIED live and several differed from the Brief. Live measurement governs; the Brief's intent is preserved against actual repo state. **Live-baselines rule honored** per `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1.

### Baselines (LIVE, measured at SPEC authoring)

| Symbol | Metric | Value | How measured (runnable) |
|---|---|---|---|
| `BASE_M1_SCHEMA_RULE18` | rule-18-unique-tenant violations against `modules/Module 1 - Inventory Management/docs/db-schema.sql` | **5** (4 real + 1 hook regex false positive) | `node -e "import('./scripts/checks/rule-18-unique-tenant.mjs').then(m=>m.default(['modules/Module 1 - Inventory Management/docs/db-schema.sql']).then(r=>console.log(r.violations.length)))"` |
| `BASE_M1_SCHEMA_LINES` | M1 db-schema.sql line count | 1672 (approx; capture exact at executor pre-flight) | `wc -l "modules/Module 1 - Inventory Management/docs/db-schema.sql"` |
| `BASE_SHARED_T_COUNT` | T-constant entries in `js/shared.js` `T = { ... }` block | ≥ 30 (closing brace at line 68) | `grep -cE "^\s+[A-Z_]+:\s*'" js/shared.js` (count lines between `const T = {` and the matching `};`) |
| `BASE_SHARED_FIELD_MAP_LINES` | `js/shared-field-map.js` line count | 286 | `wc -l js/shared-field-map.js` |
| `BASE_RULE15_SIZE` | `scripts/checks/rule-15-rls.mjs` line count | 47 | `wc -l scripts/checks/rule-15-rls.mjs` |
| `BASE_RULE21_SIZE` | `scripts/checks/rule-21-orphans.mjs` line count | 60 | `wc -l scripts/checks/rule-21-orphans.mjs` |
| `BASE_INTEGRITY` | Pre-execution Iron Rule 31 integrity gate | exit 0 (clean) | `npm run verify:integrity; echo $?` |

### Reality-check deltas vs Brief

| Brief claim | Live reality | Action in SPEC |
|---|---|---|
| "48 pre-existing UNIQUE-without-tenant-id violations" in M1 db-schema.sql | **5 violations** reported by rule-18 (4 real + 1 false-positive on a `-- partial unique (022)` comment at line 767) | Scope tightens — DEBT-02 fixes the 4 real violations only; the 1 false-positive on line 767 is logged as a finding for a potential hook tightening (NOT bundled into this SPEC per Brief §8 anti-pattern). |
| "rule-15-rls.mjs regex doesn't accept schema prefix" | Regex ALREADY accepts `(?:public\.)?` in both ENABLE-RLS and CREATE-POLICY regexes (lines 6, 12). Confirmed by reading the file. The ACTUAL rule-15 false-positive surface (per `RECEIPT_FORM_FIXES_FROM_MANAGER` SESSION_CONTEXT note "42 rule-15-rls on quoted policy names") is **quoted policy names** — `CREATE POLICY "name with spaces" ON ...` is not matched by `\w+`. | VERIFY_HOOKS_REGEX_FIXES patches the policy-name regex to accept BOTH unquoted (`\w+`) AND double-quoted (`"[^"]+"`) policy names. Schema-prefix concern is dropped (already handled). |
| "rule-21-no-orphans.mjs performs full file-scan" | Hook scans each `files[]` entry's FULL content for function-definitions (3 PATTERNS). The actual false-positive surface (per same SESSION_CONTEXT note "2 rule-21-orphans on local `const X = (...)`") is that it matches indented `const X = (` patterns inside function bodies — local arrow functions that legitimately reuse a common name across files. | VERIFY_HOOKS_REGEX_FIXES tightens PATTERNS[1] + [2] to require the match begin at column 0 (top-level only), skipping indented local declarations. |

### Lessons applied from prior FOREMAN_REVIEWs

| FROM | Lesson | Applied here |
|---|---|---|
| `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Author Proposal #1 (live-state probes) | Mandate live SQL/grep probes; never trust Brief assumptions about column shapes or count baselines | **Applied at maximum depth.** Every Brief claim above was independently verified. The "48 violations" estimate was contradicted by live measurement; the SPEC scope reflects the 5-violation reality, not the 48-estimate. |
| `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Author Proposal #2 (verify-script compatibility scan) | Before sealing a SPEC that touches verify hooks, read the hook regexes and confirm the SPEC's premise matches reality | **Applied.** Both rule-15 and rule-21 were read end-to-end before authoring §3 success criteria; the Brief's described issues did not match the regexes — SPEC corrects the scope. |
| `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` Author Proposal #1 (RLS_PATTERN_GLOBAL_REFERENCE) | Codify the global-reference RLS pattern in a reusable doc | **Applied** as skill improvement #1 (Commit Group A, commit `4aa7ecd`) — DONE before authoring this SPEC, per Brief Locked Decision #2. |
| `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` Author Proposal #2 (Step 1.5.7 DDL boundary scan) | Pre-decide Rule 32 boundary handling for SPECs with destructive patterns | **Applied** as skill improvement #2 (commit `eed7ad4`). For THIS SPEC, the DDL boundary scan is trivial — §7 Destructive Operations = **None**. No DROP, no TRUNCATE, no ALTER DROP, no unscoped DELETE. |
| `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #2 (untracked-file survey) | Survey untracked files at SPEC author; Executor leaves them alone | **Applied.** Pre-existing dirty state surveyed at session start (CLAUDE.md §1.4); user authorized "Stash tracked only, rebase, pop" for the Brief-seal commit; remaining ~30 untracked files (architecture-brief drafts, launch-plan-draft, role files, M9 reskin docs, tests/optic*.accdb files) are NOT in this SPEC's scope. Executor uses selective `git add` by filename for every commit. |

### Pre-existing untracked files survey

`git status --porcelain | grep '^??' | wc -l` returns approximately 30 untracked paths at SPEC authoring (architecture-brief drafts for upcoming Pipelines, role artifacts, M9 reskin docs, tests/optic*.accdb binaries, __LAUNCH_PLAN_DRAFT__/, __tmp_fr_list.txt). All are out of this SPEC's scope per CLAUDE.md §1.4 (selective `git add` by filename throughout). Foreman will not touch any untracked file outside the SPEC's own outputs.

---

## 1. Goal

Close 3 tracked debts (M1A-DEBT-02, M1A-DEBT-03, M1_5_VERIFY_HOOKS_REGEX_FIXES) from Phase 1A + currencies-hotfix FOREMAN_REVIEWs, plus apply the 4 accumulated skill self-improvement proposals — all in one consolidated maintenance Pipeline, before Phase 1B starts.

This is **maintenance**, not feature work. Zero new functionality. Zero migration to live DB. Zero customer-facing change. Doc + JS-constant + verify-hook hygiene only.

---

## 2. Background & Motivation

Phase 1A shipped 17 new lens-domain tables + 9 RPCs (commit `285b5d6`) but deferred a follow-up doc update because the file (`modules/Module 1 - Inventory Management/docs/db-schema.sql`) carried pre-existing UNIQUE-without-tenant-id violations that blocked the verify hook. Currencies-hotfix (commit `442295d`) shipped the global `currencies` table but deferred adding `T.CURRENCIES` + FIELD_MAP entries since no consumer reads them yet. Both Foreman reviews also surfaced two verify-script false-positive surfaces (rule-15 quoted policy names + rule-21 indented local declarations) that have produced ≥ 50 false-positive blockers in the SPEC corpus to date.

Phase 1B (customer-facing screens, 6 screens, large scope) is scheduled next. Running Phase 1B over un-applied skill improvements + 3 unresolved debts amplifies risk — false-positive hook blockers waste executor time; missing T-constants force last-minute fixups; legacy UNIQUE violations could trip again. Sweeping them all now (single chat, single Pipeline) is cheaper than dealing with each at Phase 1B execution time.

### Dependencies

- **Phase 1A schema live** ✅ verified — commit `285b5d6` (Phase 1A close).
- **Currencies-hotfix closed** ✅ verified — commit `442295d` (currencies global).
- **4 skill improvements applied** ✅ committed before this SPEC: `4aa7ecd` (improvement #1, RLS_PATTERN_GLOBAL_REFERENCE), `eed7ad4` (#2, Step 5.3 DDL boundary scan), `27cddac` (#3, executor proactive verify.mjs --staged), `b3b58f9` (#4, executor Level-3a destructive-pattern playbook). All on `develop`, pushed.

---

## 3. Success Criteria (Measurable)

Each criterion has an EXACT expected value and a runnable verify command.

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | Branch state at SPEC start | On `develop`, repo state has 4 skill commits + Brief seal already pushed (HEAD = `b3b58f9` or later) | `git branch --show-current` → `develop`; `git log --oneline -6` shows the 4 chore(skills) commits + Brief seal |
| 2 | Total commits produced by Group B (3 debt commits) | 3 | `git log b3b58f9..HEAD --oneline | grep -E "^\w+ (feat|fix|chore|docs)\(" | wc -l` → 3 after Group B |
| 3 | Commit Group C (close) | 1 final `chore(spec)` commit | `git log --oneline -1` shows the close commit after Group C |
| 4 | M1 db-schema.sql rule-18 violations after DEBT-02 | **1** (the line-767 false positive remains; 4 real violations fixed) | `node -e "import('./scripts/checks/rule-18-unique-tenant.mjs').then(m=>m.default(['modules/Module 1 - Inventory Management/docs/db-schema.sql']).then(r=>console.log(r.violations.length)))"` → `1` |
| 5 | M1 db-schema.sql gains Phase 1A summary section | Section header `-- Phase 1A — Lens Inventory Schema (M1A) — appended 2026-05-15` exists with 17-table + 9-RPC + 1-trigger + 1-view list | `grep -c "Phase 1A — Lens Inventory Schema" "modules/Module 1 - Inventory Management/docs/db-schema.sql"` → 1 |
| 6 | DEBT-02 commit passes verify gate | Pre-commit + integrity gates both exit 0 | `node scripts/verify.mjs --staged` exit 0; `npm run verify:integrity` exit 0 |
| 7 | `js/shared.js` gains `T.CURRENCIES` | `T.CURRENCIES = 'currencies'` line exists inside the `const T = {` block | `grep -nE "CURRENCIES:\s*'currencies'" js/shared.js` → 1 match |
| 8 | `js/shared-field-map.js` gains 6 currencies columns | FIELD_MAP entries for `code`, `name`, `symbol`, `decimal_digits`, `is_active`, `created_at` under a `currencies:` key | `grep -A 12 "currencies:" js/shared-field-map.js | grep -cE "^\s+(code\|name\|symbol\|decimal_digits\|is_active\|created_at):"` → 6 |
| 9 | DEBT-03 commit passes verify gate | exit 0 | `node scripts/verify.mjs --staged` exit 0 |
| 10 | rule-15-rls.mjs regex accepts quoted policy names | Patched regex matches BOTH `CREATE POLICY foo ON ...` AND `CREATE POLICY "foo bar" ON ...` | `grep -cE 'CREATE\\\\s\\+POLICY\\\\s\\+\\(\\?:\\\\w\\+\\|\\\\"\\[\\^\\\\"\\]\\+\\\\"\\)' scripts/checks/rule-15-rls.mjs` → 1 (matches the new alternation) |
| 11 | rule-21-orphans.mjs PATTERNS tighten to top-level only | Patterns 2 + 3 anchor at start-of-line (`^(?:const\|let\|var)`) — no leading whitespace | `grep -cE "^const PATTERNS|/\\^\\(\\?:const\\|let\\|var\\)" scripts/checks/rule-21-orphans.mjs` → at least 2 (PATTERNS array + anchored regex) |
| 12 | Regression: patched hooks still pass against current HEAD commits | `node scripts/verify.mjs --full` exits 0 or 2 (no new violations introduced by the patches; warnings-only acceptable) | `node scripts/verify.mjs --full; echo $?` → `0` or `2` |
| 13 | VERIFY_HOOKS_REGEX_FIXES commit passes its own gate | The patched hooks running against their own commit must exit 0 (the Iron Rule 31 + verify hooks gate against themselves per Brief §9) | `node scripts/verify.mjs --staged` exit 0 |
| 14 | Integrity Gate (Iron Rule 31) at every commit boundary | exit 0 (clean) | `npm run verify:integrity; echo $?` → `0` |
| 15 | TECH_DEBT.md / MASTER_ROADMAP.md §5 closure | M1A-DEBT-02 + M1A-DEBT-03 + M1_5_VERIFY_HOOKS_REGEX_FIXES all marked ✅ RESOLVED in MASTER_ROADMAP.md §5 with this SPEC's closing commit hash | `grep -cE "M1A-DEBT-02.*RESOLVED\|M1A-DEBT-03.*RESOLVED\|VERIFY_HOOKS_REGEX_FIXES.*RESOLVED" MASTER_ROADMAP.md` → 3 |
| 16 | EXECUTION_REPORT.md + FINDINGS.md present | Both written in SPEC folder | `ls "modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/EXECUTION_REPORT.md" "modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/FINDINGS.md"` exit 0 |
| 17 | EXECUTION_REPORT.md §7 SPEC_TEMPLATE Version Footprint | Section present (literal "No new template improvements to footprint this run" acceptable) | `grep -c "SPEC_TEMPLATE Version Footprint" "modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/EXECUTION_REPORT.md"` → 1 |
| 18 | Localhost smoke baseline | 7/7 PASS on demo tenant | `tests/smoke/baseline.test.mjs` exit 0 (run by opticup-localhost-tester per AGENT_CHAIN_PROTOCOL) |
| 19 | Clean working tree at close | `git status --short` empty | `git status --short \| wc -l` → 0 |
| 20 | All commits pushed to origin | HEAD = origin/develop | `git rev-parse HEAD` = `git rev-parse origin/develop` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo.
- Run read-only SQL (Level 1 autonomy) — none expected for this SPEC.
- Edit ONLY the files listed in §9 Expected Final State.
- Commit + push to `develop` using selective `git add` by filename.
- Run `node scripts/verify.mjs --staged` before every commit (per skill improvement #3 applied in commit `27cddac`).
- Run `npm run verify:integrity` at every commit boundary.
- Apply executor-improvement proposal #3 (proactive verify.mjs --staged) and #4 (Level-3a destructive-pattern playbook — not exercised in this SPEC; reference only).
- Dispatch to opticup-reviewer + opticup-localhost-tester per AGENT_CHAIN_PROTOCOL after the 3 debt commits land.
- Write EXECUTION_REPORT.md + FINDINGS.md when done.

### What REQUIRES stopping and reporting

- Any file outside §9 being touched.
- Any DDL or DB write — there is NONE in this SPEC; if a step ever calls Supabase MCP, STOP.
- Any merge to `main`.
- Any verify-hook patch that BREAKS its own commit (regression). The patched hooks must not block their own commit (`§3 #13`).
- Actual rule-18 violation count after DEBT-02 ≠ 1 (must be exactly 1 — the line-767 false positive).
- Any test failure that cannot be diagnosed in a single retry.
- Any new untracked file appearing outside the SPEC's own outputs.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **rule-18 baseline drift:** If `node -e "..."` pre-execution probe returns ≠ 5 violations against M1 db-schema.sql at executor pre-flight, STOP — the file has changed since SPEC authoring; re-baseline before continuing.
- **rule-15 / rule-21 regression:** If `node scripts/verify.mjs --full` exits non-zero AFTER the hook patches, STOP — the patches broke a check that previously passed. Investigate before committing.
- **Self-test failure:** If the patched rule-15 hook flags a known-clean policy (e.g., the `pending_sales` canonical-pattern policies in `docs/GLOBAL_SCHEMA.sql`), STOP — the patch is wrong.
- **Self-block at commit:** If the VERIFY_HOOKS_REGEX_FIXES commit blocks its OWN commit (Brief §9 specifically calls this out), STOP — the patch self-defeats; revise.
- **More than 1 rule-18 violation remaining after DEBT-02:** STOP. SPEC expects exactly 1 (the line-767 false positive). 0 means an extra hidden change; 2+ means a real violation was missed.

---

## 6. Rollback Plan

- **DEBT-02 rollback:** `git revert <DEBT-02 commit hash>` — the commit only edits `db-schema.sql` (doc-only). No DB state to restore. Verify hook will report 5 violations again as it did before.
- **DEBT-03 rollback:** `git revert <DEBT-03 commit hash>` — the commit only edits `js/shared.js` + `js/shared-field-map.js`. No DB state change. Code consumers that started using `T.CURRENCIES` after the commit (none expected in this SPEC's scope) would break; check before reverting.
- **VERIFY_HOOKS_REGEX_FIXES rollback:** `git revert <hooks commit hash>` — restores the prior regex. Pre-revert false-positive surfaces reappear; recovery via `git reset --soft HEAD~1` is possible if revert immediately follows the commit.
- **Group C close rollback:** `git revert <close commit hash>` — TECH_DEBT.md + MASTER_ROADMAP.md §5 entries revert. No code revert needed.

There are no DB changes in this SPEC. There are no irreversible operations. Total rollback budget: 3 `git revert`s.

---

## 7. Destructive Operations

**None.**

This SPEC introduces zero destructive operations. The pre-commit `destructive-ops-declared.mjs` gate will block any of the following if they appear in a commit's staged diff:

- File deletions (`git rm`, `rm`, `Remove-Item`).
- Mass renames (≥ 5 files in one commit). The 4 skill commits already shipped; no further renames in any Group B or C commit.
- `git rebase`, `git reset --hard`, `git push --force`.
- SQL `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`, `ALTER TABLE ... DROP`.
- DML mass-delete (`DELETE FROM <table>` without a tenant_id-scoped `WHERE`).
- Modification of CLAUDE.md or any SKILL.md governance file that DELETES a section (append-only allowed — the 4 skill commits are append-only and already committed).
- Modification of `main` branch.

Per Iron Rule 32 "If the SPEC declares `None.` it implicitly forbids ALL the operations above for that SPEC's run." If the Executor encounters a need for any destructive op mid-run → STOP, write escalation file at `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_destructive_op_needed.md`, emit one Hebrew line to Daniel, halt the Pipeline. Do NOT silently amend this section mid-run.

The 4 skill commits already on develop (commits `4aa7ecd`, `eed7ad4`, `27cddac`, `b3b58f9`) are APPEND-only modifications to existing files (no section deletions); they passed the gate at their commit time.

---

## 8. Out of Scope (explicit)

The following are deliberately NOT touched by this SPEC. Resist scope creep.

- **Phase 1B SPEC** — `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/` is the next Pipeline; do NOT begin authoring or executing it here.
- **M9 SPEC** — separate Pipeline.
- **The other 4 skill improvements** from Phase 1A's FOREMAN_REVIEW (Strategic A/B about live-state probes + verify-script-compat-scan; Executor A/B about file-scan probes + staging-area integrity). Strategic A is partially already in `SKILL.md` Step 1.5 (Live-State DB Probe / Cross-Reference Check sub-steps); Strategic B was deferred for observation. Both Executor proposals were deferred too. They live for the next sweep, not this one.
- **Iron Rule 15 constitution edit** — `M1_5_RULE_15_GLOBAL_REFERENCE_TABLE_PATTERN` SPEC stub (CLAUDE.md §4 edit to document the new pattern alongside tenant-isolation) is a separate constitutional SPEC requiring Daniel review. Not in this maintenance Pipeline.
- **TD-2 (migrations git drift) cleanup** — separate sweep SPEC; this Pipeline does not touch `supabase/migrations/*.sql`.
- **Line-767 rule-18 false positive cleanup** — the `-- partial unique (022)` comment on M1 db-schema.sql line 767 trips rule-18 with `(022)` matched as `UNIQUE(022)`. Fixing this requires a 4th hook tightening (skip matches inside `--` line comments and `/* ... */` block comments). Per Brief §8 anti-pattern "Do not bundle while-we're-here features", this 4th tightening is deferred. The SPEC expects rule-18 to still report this 1 violation after DEBT-02; it is documented as a known limitation in FINDINGS.md.
- **module's `MODULE_MAP.md` update for shared.js/shared-field-map.js additions** — DEBT-03 adds constants to global shared files, which are typically NOT entered in a per-module MODULE_MAP. Confirm at executor time; if a MODULE_MAP entry is conventionally added, do it; otherwise skip.
- **Merge to main** — stays on `develop` throughout. Phase 1B will trigger the next main-merge consideration.

---

## 9. Expected Final State

After Group B (3 debt commits) + Group C (1 close commit) land, the repo contains:

### New files (created during this SPEC)

- `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/EXECUTION_REPORT.md` — written by executor at end.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/FINDINGS.md` — written by executor (must include the line-767 false-positive finding).
- `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/REVIEW.md` — written by opticup-reviewer.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/TEST_REPORT.md` — written by opticup-localhost-tester.
- `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/FOREMAN_REVIEW.md` — written by opticup-strategic at close.

### Modified files (DEBT-02 — Commit Group B #1)

- `modules/Module 1 - Inventory Management/docs/db-schema.sql`:
  - **4 UNIQUE constraint patches** — add `tenant_id` to each:
    - line ~782: `UNIQUE(parent_document_id, child_document_id)` → `UNIQUE(tenant_id, parent_document_id, child_document_id)` on `document_links`.
    - line ~826: `UNIQUE(payment_id, document_id)` → `UNIQUE(tenant_id, payment_id, document_id)` on `payment_allocations`.
    - line ~1555: `UNIQUE(conversation_id, participant_type, participant_id)` → `UNIQUE(tenant_id, conversation_id, participant_type, participant_id)` on `conversation_participants`.
    - line ~1662: `UNIQUE(message_id, employee_id, reaction)` → `UNIQUE(tenant_id, message_id, employee_id, reaction)` on `message_reactions`.
  - **Phase 1A summary section appended** at end of file: new heading `-- Phase 1A — Lens Inventory Schema (M1A) — appended 2026-05-15` followed by:
    - Table list: 17 new lens-domain tables (see Phase 1A SESSION_CONTEXT entry for the canonical list).
    - RPC list: 9 atomic generators (e.g., `next_lens_variant_display_id`, `record_lens_purchase_receipt`, `apply_lens_stock_movement`, plus the 6 others — copy from Phase 1A FOREMAN_REVIEW §3).
    - K3 trigger + K5 view names.
    - One-line note: "Authoritative DDL lives in `supabase/migrations/` per Phase 1A SPEC §9; this section is the per-module documentation merge per Phase 1A FOREMAN_REVIEW §4 disposition."
- **Note on line 767**: the `-- partial unique (022)` comment is NOT modified. It will continue to trip rule-18 as a false positive. Documented in FINDINGS.md.

### Modified files (DEBT-03 — Commit Group B #2)

- `js/shared.js`:
  - Add `CURRENCIES: 'currencies',` inside the `const T = { ... };` block (between the existing entries, alphabetical or grouped by domain — executor picks).
- `js/shared-field-map.js`:
  - Add a top-level `currencies:` entry to `FIELD_MAP` containing the 6 columns from the live schema:
    ```js
    currencies: {
      code:           { label: 'קוד מטבע',     type: 'text', readonly: true },
      name:           { label: 'שם',             type: 'text' },
      symbol:         { label: 'סמל',            type: 'text' },
      decimal_digits: { label: 'ספרות עשרוניות', type: 'int' },
      is_active:      { label: 'פעיל',           type: 'boolean' },
      created_at:     { label: 'נוצר',           type: 'timestamp', readonly: true }
    }
    ```
  - Field labels in Hebrew per project convention; executor verifies the label text against precedent entries (e.g., `vat_rates`).

### Modified files (VERIFY_HOOKS_REGEX_FIXES — Commit Group B #3)

- `scripts/checks/rule-15-rls.mjs`:
  - Line 10–12: change the `policyRE` to accept BOTH unquoted (`\w+`) and double-quoted (`"[^"]+"`) policy names. Proposed regex:
    ```js
    const policyRE = new RegExp(
      `CREATE\\s+POLICY\\s+(?:\\w+|"[^"]+")\\s+ON\\s+(?:public\\.)?${tableName}`,
      'i'
    );
    ```
  - No other change. The `enableRE` already accepts `(?:public\.)?` schema prefix; no patch needed there.

- `scripts/checks/rule-21-orphans.mjs`:
  - Lines 5–9: tighten PATTERNS 2 + 3 to top-level only (anchor at `^` so indented local declarations don't match):
    ```js
    const PATTERNS = [
      /^function\s+(\w+)\s*\(/gm,
      /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/gm,
      /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/gm,
    ];
    ```
  - Add `gm` flag (multiline) so `^` matches start-of-line within the file content, not just start-of-string.
  - The `funcMap.set(name, [...])` aggregation logic remains unchanged.

### Modified files (Group C — close commit)

- `MASTER_ROADMAP.md` §5 "Known Debt" → "Other debt" table:
  - Add row: `M1A-DEBT-02 — module's docs/db-schema.sql Phase 1A summary append + 4 legacy UNIQUE-without-tenant-id violations fixed (1 hook false-positive remains; not bundled per Brief anti-pattern). ✅ RESOLVED 2026-05-15 via M1A_DEBT_SWEEP SPEC.`
  - Add row: `M1A-DEBT-03 — T.CURRENCIES constant + 6 currencies FIELD_MAP entries. ✅ RESOLVED 2026-05-15 via M1A_DEBT_SWEEP SPEC.`
  - Add row: `M1_5_VERIFY_HOOKS_REGEX_FIXES — rule-15 quoted-policy-names regex + rule-21 top-level-only indent gate. ✅ RESOLVED 2026-05-15 via M1A_DEBT_SWEEP SPEC.`
- `TECH_DEBT.md`: if any of the 3 debts have entries in the "Active Debt" section (verify at executor pre-flight; current read shows none under those exact IDs), move them to "Resolved Debt" with the date + closing commit. If none have entries, no change is needed — MASTER_ROADMAP §5 is the authoritative tracker per CLAUDE.md §7.
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md`: prepend a new section block dated 2026-05-15 summarizing the sweep:
  ```
  ## 2026-05-15 — M1A Debt Sweep (✅ SHIPPED — Full Auto Pipeline single chat)
  ```
  Content: 3 debts closed, 4 skill improvements applied, 8 commits total, Phase 1B unblocked.

### DB state

**No change.** This SPEC writes zero rows to Supabase. No migrations applied. No `apply_migration` calls expected. If the Executor's pre-flight signals an unintended DB-write, STOP.

### Build-side-effect file expectations

- No build steps run. No `npm run build`, no codegen. The only commands the Executor runs are `node scripts/verify.mjs --staged`, `npm run verify:integrity`, `git add/commit/push`, and the read-only baseline probes.

### Docs updated (MUST include)

- `MASTER_ROADMAP.md` §5 (3 RESOLVED entries) — Group C commit.
- Module's `SESSION_CONTEXT.md` (sweep section) — Group C commit.
- (Optional) Module's `CHANGELOG.md` — Executor adds a one-line entry if convention dictates; check pre-existing entries for format.

---

## 10. Commit Plan

The Pipeline runs in 3 groups; Group A was completed BEFORE this SPEC authoring per Brief Locked Decision #2.

### Commit Group A — Skill improvements (DONE before this SPEC)

| Commit | Hash | Subject |
|---|---|---|
| A1 | `4aa7ecd` | `chore(skills): apply improvement #1 — RLS_PATTERN_GLOBAL_REFERENCE reference + principle #10` |
| A2 | `eed7ad4` | `chore(skills): apply improvement #2 — Step 5.3 DDL boundary scan (Rule 32 pre-decision)` |
| A3 | `27cddac` | `chore(skills): apply improvement #3 — proactive verify.mjs --staged before every commit` |
| A4 | `b3b58f9` | `chore(skills): apply improvement #4 — Level-3a DDL destructive-pattern execution playbook` |

All 4 already pushed to `origin/develop`.

### Commit Group B — 3 debt commits (Executor's work)

| Commit | Subject | Files | Verify |
|---|---|---|---|
| B1 | `fix(m1,schema): close M1A-DEBT-02 — patch 4 UNIQUE constraints + append Phase 1A summary` | `modules/Module 1 - Inventory Management/docs/db-schema.sql` (single file) | rule-18 reports 1 violation (the line-767 false positive) after this commit; all other gates exit 0. |
| B2 | `feat(shared): close M1A-DEBT-03 — add T.CURRENCIES + FIELD_MAP entries` | `js/shared.js` + `js/shared-field-map.js` | `T.CURRENCIES` grep returns 1 line; FIELD_MAP `currencies:` grep returns 6 columns; all gates exit 0. |
| B3 | `fix(verify): close M1_5_VERIFY_HOOKS_REGEX_FIXES — rule-15 quoted policy names + rule-21 top-level only` | `scripts/checks/rule-15-rls.mjs` + `scripts/checks/rule-21-orphans.mjs` | The patched hooks pass against their OWN commit (Brief §9). Regression: `npm run verify:full` exits 0 or 2 (no new violations against current HEAD). |

### Commit Group C — Pipeline close

| Commit | Subject | Files |
|---|---|---|
| C1 | `chore(spec): close M1A_DEBT_SWEEP — 3 debts resolved + 4 skill improvements applied` | `MASTER_ROADMAP.md` §5 (3 RESOLVED entries) + `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` (sweep section) + SPEC folder retrospective files (EXECUTION_REPORT.md, FINDINGS.md, REVIEW.md, TEST_REPORT.md, FOREMAN_REVIEW.md) |

Total commits in Pipeline: 8 (4 already done + 4 to do). The Brief §11 Architect recommendation matches this plan exactly.

### Path declaration (Step 5.3 DDL boundary scan compliance)

This SPEC declares **no path** (A or B) under Step 5.3 because §4 Destructive Operations = `None.` — no DDL, no migration body, no `MIGRATION.md` needed. The DDL boundary scan is trivially satisfied.

---

## 11. Dependencies / Preconditions

- Branch `develop` clean of the 4 skill commits' staging area (✅ confirmed: all 4 commits pushed at HEAD `b3b58f9` time of SPEC authoring).
- `node scripts/verify.mjs --staged` and `npm run verify:integrity` available (✅ infrastructure live since Phase 0A).
- Supabase MCP NOT required (no DB ops).
- opticup-reviewer, opticup-localhost-tester skills loadable (per `docs/AGENT_CHAIN_PROTOCOL.md`).

### Browser readiness pre-flight (executor instructs at start)

Pre-flight (executor): SPEC's QA is purely SQL/HTTP/script-based (no UI changes; the rule-21 + rule-15 hook patches do not affect any rendered page; the FIELD_MAP additions affect future code that consumes T.CURRENCIES but no current consumer exists). **No browser action required. Skip Chrome readiness check.**

Localhost-tester's baseline smoke (criterion #18) does invoke `tests/smoke/baseline.test.mjs` — that file runs through node's test runner, not a browser. Localhost-tester per its skill protocol will confirm ERP/Storefront servers are up (no UI clicks needed for the baseline 7 cases).

---

## 12. Lessons Already Incorporated

- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Author Proposal #1 (live-state Supabase probes) → **APPLIED in §0**. The Brief's "48 violations" claim was contradicted by live measurement showing 5; SPEC scope reflects the 5-violation reality.
- FROM `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` Author Proposal #2 (verify-script compatibility scan) → **APPLIED in §0**. Both rule-15 and rule-21 hook regexes were read end-to-end before authoring §3; the Brief's description of each hook's flaw was corrected against the actual code.
- FROM `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` Author Proposal #1 (RLS_PATTERN_GLOBAL_REFERENCE) → **APPLIED as skill improvement #1** (Commit Group A1, `4aa7ecd`), before this SPEC was authored.
- FROM `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` Author Proposal #2 (Step 5.3 DDL boundary scan) → **APPLIED as skill improvement #2** (`eed7ad4`). This SPEC triggered the new step trivially: §4 Destructive Operations = `None.`, so no Path A/B choice was needed.
- FROM `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` Executor Proposal #1 (proactive verify.mjs --staged) → **APPLIED as skill improvement #3** (`27cddac`). The Executor for THIS SPEC will run `node scripts/verify.mjs --staged` before every `git commit` per the new SKILL.md protocol.
- FROM `M1A_CURRENCIES_GLOBAL_HOTFIX/FOREMAN_REVIEW.md` Executor Proposal #2 (Level-3a destructive-pattern playbook) → **APPLIED as skill improvement #4** (`b3b58f9`). Not exercised by this SPEC (no destructive ops); reference for future SPECs.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #2 (untracked-files survey) → **APPLIED in §0**. Pre-existing untracked files surveyed and excluded from SPEC scope; Executor uses selective `git add`.
- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1 (live-baselines rule) → **APPLIED in §0**. Every numeric baseline cites a runnable command; the Brief's "48 violations" estimate was caught by live measurement (5).

Cross-Reference Check completed 2026-05-15 against current `develop` HEAD:
- No new tables, RPCs, views, EFs, or T-constants (T.CURRENCIES is a doc-only constant added in DEBT-03 referencing an EXISTING global currencies table from M1A_CURRENCIES_GLOBAL_HOTFIX, not a new DB object).
- 0 collisions detected. The names `CURRENCIES`, `tenant_id`, `currencies`, `rule-15-rls`, `rule-21-orphans` all resolve to existing entities; this SPEC EXTENDS them per Rule 21.

---

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 at every commit boundary. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] **Iron Rule 32:** §4 Destructive Operations declared `None.`; no destructive pattern fired in any commit.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + REVIEW.md + TEST_REPORT.md + FOREMAN_REVIEW.md all present in SPEC folder.
- [ ] **EXECUTION_REPORT.md §7 SPEC_TEMPLATE Version Footprint present** (literal string "No new template improvements to footprint this run" if empty).
- [ ] MASTER_ROADMAP.md §5 has 3 RESOLVED entries (M1A-DEBT-02, M1A-DEBT-03, M1_5_VERIFY_HOOKS_REGEX_FIXES) referencing this SPEC's closing commit.
- [ ] Module's `SESSION_CONTEXT.md` updated with sweep section.
- [ ] FINDINGS.md documents the line-767 rule-18 false-positive limitation explicitly.
- [ ] FOREMAN_REVIEW.md includes 2 author-skill improvement proposals + 2 executor-skill improvement proposals per the Self-Improvement Mandate.

---

## 14. Smoke Test Cases

Each smoke case carries a `Type:` field. None are `visual-browser`; this Pipeline is daytime-or-overnight neutral.

| Case | Type | Inputs | Expected | Pass/Fail rule |
|---|---|---|---|---|
| 1 | code-review | `grep -nE "CURRENCIES:\s*'currencies'" js/shared.js` | 1 line returned | exact count |
| 2 | code-review | `grep -A 12 "currencies:" js/shared-field-map.js | grep -cE "^\s+(code\|name\|symbol\|decimal_digits\|is_active\|created_at):"` | 6 | exact count |
| 3 | code-review | `node -e "import('./scripts/checks/rule-18-unique-tenant.mjs').then(m=>m.default(['modules/Module 1 - Inventory Management/docs/db-schema.sql']).then(r=>console.log(r.violations.length)))"` after DEBT-02 | 1 (the line-767 false positive) | exact count |
| 4 | code-review | Patched rule-15-rls.mjs against a synthetic SQL string `CREATE TABLE foo (...); ALTER TABLE foo ENABLE ROW LEVEL SECURITY; CREATE POLICY "policy with spaces" ON foo USING (true);` (executor writes a 1-shot test) | 0 violations (the patched regex matches the quoted policy name) | exact count |
| 5 | code-review | Patched rule-21-orphans.mjs against a synthetic JS string where 2 files both define `const handler = (e) => {}` INSIDE a function body (indented) | 0 violations (top-level anchor rejects indented matches); 1 violation if the same name is defined at top-level in 2 files | exact count per case |
| 6 | code-review | `node scripts/verify.mjs --full; echo $?` after VERIFY_HOOKS_REGEX_FIXES commit | exit 0 or 2 | exit code in {0,2} |
| 7 | db | None — this SPEC has zero DB writes; localhost-tester runs the standard 7-case baseline (`tests/smoke/baseline.test.mjs`) on demo tenant | 7/7 PASS | per baseline suite |

Cases 1–6 are code-review and run by the Executor. Case 7 is the baseline smoke run by opticup-localhost-tester after Group B lands.

---

## 15. Daniel-Decision Sub-Questions

**N/A.** No §5 stop-trigger requires Daniel's input. Every stop-trigger in §5 is a self-recoverable condition (re-baseline, revise patch, document limitation, halt-and-report-to-Foreman). Daniel is not in the loop for this maintenance Pipeline unless an unforeseen escalation arises (any Pipeline can escalate per CLAUDE.md §9 by writing to `modules/Module 1 - Inventory Management/escalations/`).

---

## Appendix A — Common Gotchas Watched For

- **A1 Body md5 invariants** — N/A (no RPC body changes).
- **A2 Aggregate hash for bulk row backups** — N/A (no bulk DML).
- **A3 `core.autocrlf` warnings on Windows** — Expect informational warnings when editing files; not violations. Integrity gate is CRLF-agnostic per Iron Rule 31.
- **A4 Pre-existing dirty repo at session start** — Honored in §0; Executor uses selective `git add` throughout.
- **A5 EF deploy 5xx pivot** — N/A (no EF deploys).
- **A6 Iron Rule 32 false-positive shapes** — Watch for the 3 shapes (staged deletes, `_down.sql` artifacts, doc-comment keyword literals). This SPEC has 0 of these (no deletes, no _down.sql, the SKILL.md edits in Group A used the doc-allowlist correctly via `chore(skills):` commits and passed).
- **A7 UNIQUE constraint must include tenant_id (Iron Rule 18)** — Central to DEBT-02. The 4 fixes follow `UNIQUE(tenant_id, ...other_cols)` pattern verbatim per Iron Rule 18 canonical form.

---

*End of SPEC. Author: opticup-strategic. Pipeline runs Foreman (this) → Executor → Reviewer → Localhost-Tester → Foreman review, all in this same chat per Full Auto Pipeline.*
