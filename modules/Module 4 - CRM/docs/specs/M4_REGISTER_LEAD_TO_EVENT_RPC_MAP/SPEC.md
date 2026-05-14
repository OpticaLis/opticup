# SPEC — M4_REGISTER_LEAD_TO_EVENT_RPC_MAP

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM
> **Phase:** Funnel Maturity Phase 1, P1.4 (first SPEC of Phase 1 per Architect decision 2026-05-14)
> **Author signature:** Claude Code (Opus 4.7, 1M context) — Windows desktop session

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-14: `modules/Module 4 - CRM/architecture-brief/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP_BRIEF.md` (131 lines).
- **RPC existence probed BEFORE sealing this SPEC** (Brief §6 requirement). Live `pg_proc` reports:
  - `proname='register_lead_to_event'` exists in `public` schema.
  - `pronargs=4` (4 input arguments).
  - `prorettype=jsonb` (returns jsonb).
  - `length(pg_get_functiondef(p.oid)) = 4603` chars (this is the baseline `BASE_RPC_BODY_LEN`).
- Target folder created: `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/` (empty at SPEC commit time).
- Pre-existing untracked files surveyed (`git status --porcelain | grep '^??'`) — count ≈ 80 paths, all from prior overnight pipeline / role artifacts unrelated to this SPEC. **The Executor will leave them alone — selective `git add` of new SPEC-folder artifacts only.**
- Lessons applied from the 3 most recent M4 `FOREMAN_REVIEW.md` files:
  - **M4_STATUS_MODEL_FINETUNES (2026-05-14) — Executor proposal #1:** "Multi-statement MCP `execute_sql` returns only the LAST result." → SPEC §6 mandates Executor combine all verification queries into a single SELECT with sub-queries.
  - **M4_STATUS_MODEL_DOC_UPDATE (2026-05-14) — Executor proposal #2:** "Post-edit grep Mermaid block sentinels." → SPEC §3 success criterion #4 mandates a post-write `grep -c 'stateDiagram-v2' STATE_TRANSITIONS.md` check and a render-validation step.
  - **M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION (2026-05-14) — Author proposal #1:** "Pre-categorize smoke as db/api/code-review/visual-browser." → SPEC §6 categorizes the control smoke as `db/api` + `script` — no `visual-browser` step (no UI changed).
- **Baselines (live measurement, never from author memory)** — every value below is from a query/command runnable now:

  | Metric | Value | How measured |
  |---|---|---|
  | `BASE_RPC_BODY_LEN` | 4603 | `SELECT length(pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='register_lead_to_event'` |
  | `BASE_RPC_ARGS` | 4 | same query, `pronargs` column |
  | `BASE_RPC_RETTYPE` | `jsonb` | same query, `prorettype::regtype` column |
  | `BASE_INTEGRITY` | exit 0 | `npm run verify:integrity` at SPEC commit (verified this session — "All clear — 108 files scanned in 4ms (Iron Rule 31 gate)") |
  | `BASE_SMOKE` | 7/7 PASS expected | `npm run smoke` against demo tenant (Executor runs as control) |

- **No color-form check needed** — this is not a visual re-skin SPEC.
- **No DB writes anywhere in this SPEC.** Pure read.

---

## 1. Goal

Produce a definitive read-only behavioral map of the `register_lead_to_event` Supabase RPC so that Funnel Phase 1 P1.1 / P1.2 / P1.3 can be authored against verified RPC behavior — not against inference. Output is three SPEC-folder artifacts (`RPC_BODY.sql`, `STATE_TRANSITIONS.md`, `FINDINGS.md`) + the standard pipeline retrospective files.

---

## 2. Background & Motivation

On 2026-05-14, three wrong diagnoses in one day (broadcasts-not-sent / 7.8% conversion / UTM event-24 attribution) all traced back to inferring RPC behavior rather than reading it. `register_lead_to_event` sits at the heart of the funnel — every public-form registration, every quick-register flow, every staff-driven attendee insert ultimately routes through it. Funnel Phase 1 has three SPECs queued (UTM persistence, broadcast_id propagation, short.gy migration) that all depend on knowing exactly what state this RPC creates / flips / leaves alone. The Architect decision (FUNNEL_ROADMAP.md §"Phase 1 — Execution order", 2026-05-14) is to land P1.4 first as the foundation.

Forward-compat is also at stake: Phase 4's elite-tier capabilities (E1 MTA, E6 cross-channel orchestration, E7 customer journey analytics) all impose constraints on the RPC's output shape (touchpoint logs, `chain_id`, structured event-log writes). If the current RPC structurally precludes any of E1-E7, we want to know now — not in 18 months.

This SPEC pays a 1–2 hour read cost to prevent weeks of debugging Phase 1+2 SPECs built on assumptions.

**Already-done discovery contingency:** none. This is a fresh diagnostic — no prior work overlaps.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC close | On `develop`, clean | `git status --short` → empty |
| 2 | New SPEC folder | Contains 6 files: `SPEC.md`, `RPC_BODY.sql`, `STATE_TRANSITIONS.md`, `FINDINGS.md`, `EXECUTION_REPORT.md`, `FOREMAN_REVIEW.md` | `ls "modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/" \| wc -l` → 6 |
| 3 | `RPC_BODY.sql` size matches live `pg_proc` body byte-for-byte | `length(file) = BASE_RPC_BODY_LEN ± Postgres-formatter whitespace` (re-query `pg_proc` at end, diff via `md5sum` on both content streams) | `psql -c "SELECT md5(pg_get_functiondef('public.register_lead_to_event'::regproc))"` vs `md5sum RPC_BODY.sql` after stripping trailing newline added by editor |
| 4 | `STATE_TRANSITIONS.md` contains exactly 1 well-formed Mermaid `stateDiagram-v2` block | 1 | `grep -c '^stateDiagram-v2' STATE_TRANSITIONS.md` (run AFTER fence stripped, OR `grep -c 'stateDiagram-v2'` returns the literal sentinel count — Executor confirms inside fence + reports value) |
| 5 | `STATE_TRANSITIONS.md` annotation table covers every IF/CASE/EXCEPTION branch in the RPC body | branch_count_in_body == row_count_in_table (Executor computes both, reports both, asserts equality) | `grep -cE 'IF\\\|CASE\\\|ELSIF\\\|WHEN\\\|EXCEPTION' RPC_BODY.sql` vs `grep -c '^\| L[0-9]' STATE_TRANSITIONS.md` (or equivalent — Executor states the exact regexes used and the resulting counts) |
| 6 | Caller inventory ≥ 1 row for every surface that grep reveals (ERP JS / Edge Function / storefront / Make / SQL migrations / docs only as informational) | ≥ 1 per surface that actually has hits; "0 hits — none found" rows are explicit, not omitted | `grep -rn "register_lead_to_event" --include="*.js" --include="*.ts" --include="*.html" --include="*.sql" --include="*.md" .` in BOTH repos + Make MCP `scenarios_list` filter |
| 7 | Return-value semantics table covers every distinct shape the RPC can return (success branches + named error codes + raised exceptions) | Each unique return shape has a row: trigger condition + downstream consumer + consumer's handling | manual review against `RPC_BODY.sql` |
| 8 | Forward-compat cross-check table covers all 7 of E1-E7 with verdict `block` / `support` / `N/A` + 1-sentence rationale | 7 rows | grep `STATE_TRANSITIONS.md` for the table |
| 9 | `FINDINGS.md` contains at least one Finding row OR the explicit string `"Zero gaps found."` plus a 1-sentence rationale | non-empty | `grep -c '^## FIND-' FINDINGS.md` → `≥ 1` OR explicit zero-statement |
| 10 | Zero DB writes occurred during the SPEC's run | Executor verifies via demo-tenant tail-window audit before close: `SELECT count(*) FROM crm_event_attendees WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at > '<exec_start_ts>'` and similar for crm_leads, crm_message_log, crm_message_queue. Pre-write counts captured at exec start. **All deltas MUST equal 0.** | single SELECT with 4 sub-queries comparing pre/post |
| 11 | Smoke result on demo tenant (control) | 7/7 PASS | `npm run smoke` (Executor + Localhost-Tester both run; both must pass) |
| 12 | Integrity Gate (Iron Rule 31) at SPEC close | exit 0 (no warnings expected — no new code) | `npm run verify:integrity; echo $?` → `0` |
| 13 | Iron-Rule-32 pre-commit hook passes for every commit | hook exit 0 | pre-commit hook output captured per commit; SPEC's `## Destructive Operations` section parsed and validated |

**Sweep criteria — link vs comment distinction:** N/A — this SPEC adds no name to grep against; it only counts grep hits for `register_lead_to_event` which is already a globally unique RPC identifier (no narrative-comment ambiguity expected).

---

## 3a. Shared Edit Block

N/A — this SPEC produces unique-per-file content. No identical edits across multiple files.

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking
- Run read-only SQL via Supabase MCP `execute_sql` against the demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) and against the live RPC's `pg_proc` row.
- `grep` / `glob` / `read` any file in `opticup` repo + sibling `opticup-storefront` repo (read-only mount path: `../opticup-storefront/` if it exists locally — otherwise grep only via `gh` CLI on the public repo OR document the inability as a Finding).
- Use Make MCP `scenarios_list` (read-only) to enumerate scenarios that touch `crm_event_attendees`.
- Create the 4 new files inside the SPEC folder.
- Commit and push to `develop`.
- Apply executor-improvement proposals from recent FOREMAN_REVIEWs if directly applicable (e.g., single-SELECT idiom for multi-criteria verification — already mandated in §6 below).

### What REQUIRES stopping and reporting (in addition to global stop-triggers in CLAUDE.md §9)
- The RPC does not exist in `pg_proc` (renamed / dropped since SPEC author probe at 2026-05-14) → STOP, write escalation file `modules/Module 4 - CRM/escalations/{ISO_TS}_RPC_MISSING.md`.
- The RPC body length deviates from `BASE_RPC_BODY_LEN=4603` by more than ±10% (Executor probes again at exec start; significant drift implies live deploy mid-pipeline) → STOP, escalate, do NOT proceed.
- Any step would require a DB write (INSERT/UPDATE/DELETE) → STOP. This SPEC is read-only.
- Any caller's expectation diverges so significantly from RPC behavior that it constitutes a live production bug (not just a Finding) → STOP, write escalation, DO NOT silently document as a Finding.
- Smoke <7/7 PASS at any point → STOP. This implies something else regressed during the run (this SPEC changes zero code, so any smoke failure is exogenous).
- Mermaid block fails to render (Executor cannot validate locally) → STOP if any syntax error; Finding-only if it renders but is non-ideal.
- Attempted skill modification of `SITE_OVERSEER_SKILL.md` or `KNOWLEDGE_MAP.md` → STOP. Brief §6 defers those to a follow-up SPEC. **Out of scope for P1.4.**

---

## 5. Stop-on-Deviation Triggers (in addition to §4 + CLAUDE.md §9)

- Pre-existing untracked files survey at exec start shows a NEW path that did not appear in the SPEC author's survey AND looks like real work (not a side-effect of `npm run smoke`) → STOP, surface to user, do not absorb.
- `git diff origin/develop -- .` at exec start is non-empty → STOP. This SPEC's run must start from a clean working tree against `origin/develop`.
- Any commit to `main` attempted by any tool → STOP. Iron Rule 7 (Working Rule) + activation prompt explicit prohibition.

---

## 6. Method (read-only, single-statement-per-MCP-call discipline)

The Executor walks this procedure end-to-end. Branching only on the stop triggers above.

### 6.1 Extract canonical RPC body
Single MCP `execute_sql` call (single SELECT — multi-statement returns only LAST result per M4_STATUS_MODEL_FINETUNES lesson):
```sql
SELECT pg_get_functiondef(p.oid) AS body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'register_lead_to_event';
```
Save the verbatim returned `body` string to `RPC_BODY.sql` (verbatim — no editor-added indentation, no trailing whitespace beyond what `pg_get_functiondef` returns).

### 6.2 Compute byte-fidelity hash (criterion 3)
Re-query at end of execution:
```sql
SELECT md5(pg_get_functiondef('public.register_lead_to_event'::regproc)) AS body_md5;
```
Local: `md5sum RPC_BODY.sql` (or PowerShell `Get-FileHash -Algorithm MD5`). If they don't match because of a trailing newline added by the Write tool, document the delta and assert byte-equivalence-modulo-trailing-newline. Hash must match in EXECUTION_REPORT.md.

### 6.3 Line-annotate the body in STATE_TRANSITIONS.md
Walk the body top-to-bottom. For each meaningful statement (variable assignment, condition, write, return, raise), produce a row in a Markdown table with columns: `Line | Statement summary | Reads from | Writes to | Side effects`.

### 6.4 Draw the state diagram
Build a single Mermaid `stateDiagram-v2` block covering all entry conditions and all terminal states. Validate by rendering with `npx -y @mermaid-js/mermaid-cli@latest --input STATE_TRANSITIONS.md --output /tmp/check.svg` (or skip if mmdc unavailable — then validate manually by pasting block content into mermaid.live and capturing screenshot path in EXECUTION_REPORT.md). Either path is acceptable; the criterion is "renders cleanly, no syntax error."

### 6.5 Caller inventory
Multiple greps (single tool call per pattern is fine; these are file-search grep, not MCP SQL):
```
grep -rn "register_lead_to_event" --include="*.js" --include="*.ts" --include="*.html" --include="*.sql" --include="*.md" .
```
Plus if `../opticup-storefront/` exists as a sibling working tree on this machine: same grep there. Otherwise note "storefront repo grep deferred — no local checkout on this machine; document as Finding-INFO if substantive."

Plus Make MCP `scenarios_list` filtered for scenarios that touch `crm_event_attendees` (informational only — no need to read scenario bodies).

For each caller hit, populate the caller inventory table with: file:line, parameter values passed (literal or computed), return-value handling.

### 6.6 Discrepancy check (Findings)
For each caller, compare expected return shapes vs actual RPC return shapes. Any divergence → row in `FINDINGS.md` with severity (HIGH/MEDIUM/LOW/INFO). HIGH only if it constitutes a live production bug per §5 stop trigger — in which case STOP first, then document.

### 6.7 Forward-compat cross-check (E1-E7)
Build a 7-row table inside STATE_TRANSITIONS.md (final section). For each of E1-E7 from FUNNEL_ROADMAP §"Phase 4":
- Read the RPC body to determine whether it writes structured-event-log rows, supports `chain_id`/`parent_message_id`, logs touchpoints, etc.
- Verdict: `block` / `support` / `N/A` + 1-sentence rationale.

If any verdict is `block`, that becomes a HIGH-severity Finding (architectural debt blocking Phase 4) — but it is NOT a §5 stop trigger because Phase 4 is documented-but-deferred.

### 6.8 Post-run zero-write audit
Before committing, run single-SELECT pre/post audit (Executor captures `exec_start_ts` at the start of §6.1, then at end runs):
```sql
SELECT
  (SELECT count(*) FROM crm_event_attendees WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at > $1) AS new_attendees,
  (SELECT count(*) FROM crm_leads WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at > $1) AS new_leads,
  (SELECT count(*) FROM crm_message_queue WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at > $1) AS new_queue,
  (SELECT count(*) FROM crm_message_log WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb' AND created_at > $1) AS new_log;
```
All 4 deltas MUST equal 0. If any is non-zero, STOP and investigate — this SPEC writes nothing, so any new row implies an exogenous write during the window. Note in EXECUTION_REPORT.md.

### 6.9 Smoke control
- `npm run smoke` against demo tenant — expect 7/7 PASS.
- This is purely a control check (no UI/code changed in this SPEC). If <7/7, STOP.

### 6.10 Integrity gate
- `npm run verify:integrity` — expect exit 0.

### Smoke categorization (per M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION lesson)
- §6.1, §6.2, §6.6, §6.7, §6.8 → `db` (Supabase MCP `execute_sql` only)
- §6.5 → `code-review` (grep + manual inventory)
- §6.4 → `script` (optional Mermaid renderer) or `code-review` (manual mermaid.live paste — both acceptable)
- §6.9 → `script` (`npm run smoke`)
- §6.10 → `script` (`npm run verify:integrity`)
- **No `visual-browser` step in this SPEC.** No UI changed.

---

## 7. Out of Scope (explicit)

- Any code change to `register_lead_to_event` or any caller. Pure read-only.
- Any DB write (INSERT / UPDATE / DELETE / DDL). Zero schema impact.
- Refactoring the RPC. Phase 3 (status-column split, FUNNEL_ROADMAP P3.1) may eventually rewrite it; this SPEC is the prerequisite, not the action.
- Mapping any other RPC (e.g. `next_box_number`, `apply_stock_count_delta`). Future SPECs can copy this template for other RPCs.
- Mapping `register_lead_to_event`'s historical commit history — only the *current* live behavior matters.
- Modification of `roles/site-overseer/SITE_OVERSEER_SKILL.md` or `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md`. Brief §6 explicitly defers those edits to a separate follow-up SPEC. **Touching either is a stop-trigger.**
- Modification of any caller file (ERP JS, EF, storefront, Make scenarios).
- Any commit to `main`, any `git rebase`, any `git checkout main`, any `git merge`. Iron Rule 7 + activation prompt explicit prohibition.
- Authoring P1.1 / P1.2 / P1.3 SPECs in this chat. They are separate dispatches.

### Subset relationships
N/A — this SPEC is purely additive (new files in a new folder) and reads-only.

---

## 8. Expected Final State

### New files (6 in the SPEC folder)
- `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/SPEC.md` (this file — already committed by Foreman)
- `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/RPC_BODY.sql` — verbatim live RPC body from `pg_proc`
- `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/STATE_TRANSITIONS.md` — line-annotation table + 1 Mermaid `stateDiagram-v2` block + caller-inventory table + return-value-semantics table + 7-row E1-E7 forward-compat table
- `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` — each discrepancy row OR explicit "Zero gaps found." statement
- `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/EXECUTION_REPORT.md` (Executor)
- `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` (Foreman closure)

### Modified files
- **None.** This SPEC modifies zero existing files.

### Deleted files
- **None.**

### DB state
- **Identical to pre-SPEC.** Zero writes occurred. Demo + Prizma row counts on all 4 audited tables unchanged across the SPEC window (criterion 10).

### Build-side-effect file expectations
- **None.** This SPEC runs no build/codegen commands. The only commands are `npm run smoke` and `npm run verify:integrity`, both of which are observers and do not modify files in the working tree (any test-cleanup writes by smoke are inside its own tenant scope on demo and clean up after themselves).

### Docs updated
- `MASTER_ROADMAP.md` — **no change required for this SPEC**. Phase 1 P1.4 closure will be reflected in the next FUNNEL_ROADMAP refresh (separate SPEC — Brief §6 defers).
- `docs/GLOBAL_MAP.md` — **no change**. This SPEC adds no DB functions / contracts.
- `docs/GLOBAL_SCHEMA.sql` — **no change**. This SPEC adds no DB objects.
- Module 4 `SESSION_CONTEXT.md` — **no change required by this SPEC's execution**. The Foreman closure may add a one-line entry at the top of the file's leader paragraph. Treat as optional — the SPEC's authority is the SPEC folder.
- Module 4 `CHANGELOG.md` — **no change** (no commits modify production code).

---

## 9. Commit Plan

3 commits expected on `develop`:

1. `docs(m4): add SPEC.md for M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` — Foreman (this commit, current).
2. `docs(m4): RPC_BODY + STATE_TRANSITIONS + FINDINGS for M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` — Executor (one commit containing all 3 artifact files + EXECUTION_REPORT.md).
3. `chore(spec): close M4_REGISTER_LEAD_TO_EVENT_RPC_MAP with retrospective` — Foreman, adds FOREMAN_REVIEW.md.

**Selective `git add` discipline:** every commit names files explicitly by path. **Never** `git add -A`, **never** `git add .` — the working tree has ~80 unrelated untracked files from prior overnight pipeline runs (see §0 baseline) that must be left alone.

---

## 10. Dependencies / Preconditions

- Branch: `develop`, clean before SPEC start.
- Supabase MCP access (read-only) to project `tsxrrxzmdxaenlvocyit`.
- Make MCP access (read-only `scenarios_list`) — optional; if unavailable, document as Finding-INFO and proceed.
- Local Node + npm for `npm run smoke` + `npm run verify:integrity`.
- Optional: `@mermaid-js/mermaid-cli` (`npx mmdc ...`) for §6.4 render validation. If unavailable, manual validation via mermaid.live is acceptable.
- Optional: sibling `opticup-storefront/` checkout for §6.5 storefront grep. If unavailable, Executor states this in EXECUTION_REPORT.md and the caller-inventory table marks storefront rows as "deferred — no local checkout".

### Browser readiness pre-flight
**Pre-flight (Executor):** SPEC's QA is SQL + script + grep based — **no browser required**. Skip Chrome readiness check.

---

## 11. Lessons Already Incorporated

- FROM `M4_STATUS_MODEL_FINETUNES/FOREMAN_REVIEW.md` Executor proposal #1 (single-SELECT idiom for multi-criteria MCP verification) → **APPLIED** in §6 (every multi-criterion verify is a single SELECT with sub-queries) and §6.8 (zero-write audit is one SELECT with 4 sub-SELECTs).
- FROM `M4_STATUS_MODEL_DOC_UPDATE/FOREMAN_REVIEW.md` Executor proposal #2 (post-edit Mermaid sentinel grep) → **APPLIED** in §3 criterion #4 (`grep -c 'stateDiagram-v2'`) and §6.4 (render-validation step).
- FROM `M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION/FOREMAN_REVIEW.md` Author proposal #1 (pre-categorize smoke type) → **APPLIED** in §6 "Smoke categorization" subsection — every check is labeled `db`, `script`, or `code-review`; explicit statement of no `visual-browser` step.
- FROM `M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION/FOREMAN_REVIEW.md` Author proposal #2 (verify referenced columns exist at author time) → **APPLIED in §0** via the live `pg_proc` probe; the only DB object this SPEC references is the RPC itself, and the probe confirmed its existence + arity + return type before sealing.
- FROM `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` Author proposal #2 (codify untracked-files survey at author time) → **APPLIED** in §0 baseline ("80 paths surveyed; Executor uses selective `git add`").
- FROM `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author proposal #1 (live-baselines, never from memory) → **APPLIED** — every value in §0 Baselines table cites the runnable query that produced it.

---

## Destructive Operations

**None.**

This SPEC modifies zero existing files. Creates only new files inside a new SPEC folder. Performs zero DB writes (`SELECT`-only via Supabase MCP `execute_sql`). Performs zero deploys. Performs zero file deletions. Iron Rule 32 gate must accept `None.` for this SPEC's commits.

If the Executor encounters a need for any destructive operation mid-run, STOP, write an escalation file under `modules/Module 4 - CRM/escalations/`, emit ONE Hebrew line to Daniel, halt the pipeline. Do NOT silently amend this section mid-run.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0.
- [ ] `git status --short` returns empty (clean tree) at SPEC close.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + RPC_BODY.sql + STATE_TRANSITIONS.md present in the SPEC folder.
- [ ] FOREMAN_REVIEW.md written + committed.
- [ ] No commit to `main`, no `git rebase`, no `git checkout main`, no `git merge`.
- [ ] No edit to `SITE_OVERSEER_SKILL.md` or `KNOWLEDGE_MAP.md` (deferred per Brief §6).
- [ ] Iron Rule 32 pre-commit hook accepted every commit (Destructive Operations `None.`).

---

*End of SPEC.*
