# SPEC — SKILL_IMPROVEMENT_HARVEST_2026_05_19

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/SKILL_IMPROVEMENT_HARVEST_2026_05_19/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M1.5)
> **Authored on:** 2026-05-19
> **Module:** 1.5 — Shared Components (skill-files live in `.claude/skills/`)
> **Pipeline:** **LIGHT** — 2 hats only (Foreman + Executor; NO Reviewer, NO Localhost-Tester). Pure doc edits.
> **Brief origin:** `modules/Module 1.5 - Shared Components/architecture-brief/SKILL_IMPROVEMENT_HARVEST_2026_05_19_BRIEF.md` (sealed 2026-05-19 night).
> **Risk class:** ZERO. 3 additive doc edits to skill-config files.

---

## 0. Pre-Authoring Reality Check

- ✅ Brief read in FULL including §4 Cross-Module Safety Audit.
- ✅ 3 target files inspected:
  - `.claude/skills/opticup-architect/SKILL.md` (96073 bytes; uses §-numbered sections + a Bootstrap step list 1/2/3/4/4.1/4.5/5; NO existing "Step 0.7/0.8/0.9" — Brief's naming is forward-introduced).
  - `.claude/skills/opticup-executor/SKILL.md` (102041 bytes; has `### Step 1.5 — DB Pre-Flight Check` at line 650 with sub-items 1/2/3/4/5/5b...; line 871 cross-references "Step 1.5j" → existing sub-letter pattern is a..j; Brief's "Step 1.5.6/1.5.7" is forward-introduced; the cleanest insertion is two new sub-items at end of Step 1.5).
  - `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` (73532 bytes; sequential cross-module table latest = #34; +named multi-paragraph blocks at bottom for harvest events; new entry must be #35 row + recommend an additional named block at the bottom matching the "SKILL_HARVEST_2026_05_18" precedent).
- ✅ Cross-Reference Check (Rule 21):
  - `grep -n "Step 0\.7\|Step 0\.8\|Step 0\.9"` against both SKILL files → 0 hits. Numbering is genuinely new.
  - `grep -n "Step 1\.5\.6\|Step 1\.5\.7"` against opticup-executor SKILL.md → 0 hits. Genuinely new.
  - DECISIONS_LOG entry #35 not in use.
  - 0 collisions / 0 hits across 3 target files.
- ✅ Brief §3 patterns A/B/C/D all aligned with content I have already proposed in the most recent SPEC's FOREMAN_REVIEW (M4_TEMPLATE_VALIDATION_UI_LINT closed 2026-05-19) + earlier P-AUTHOR/P-EXEC proposals. The harvest captures consensus, not invention.
- ✅ User memory `feedback_english_only_responses.md` strengthened earlier this session (3rd re-ask). Pattern D codifies this in the architect skill itself — no future Brief can ship the same defect.
- ✅ Light Pipeline rationale: doc-only, no runtime surface, no testable behavior beyond "edits landed correctly." Reviewer + Localhost-Tester phases would be redundant. Brief §5 explicitly authorizes Light Pipeline.

### 0.4 Insertion-Point Resolution (Foreman pre-decisions)

The Brief's section numbers ("Step 0.7", "Step 0.8", "Step 0.9", "Step 1.5.6", "Step 1.5.7") don't map to existing anchors in the target files. Foreman resolves the placement so Executor doesn't have to guess:

| Brief slug | Target file | Actual insertion anchor | Naming chosen |
|---|---|---|---|
| Step 0.7 Live-State Probe | `opticup-architect/SKILL.md` | Inside `## Brief + Activation Prompt hand-off format (mandatory)` section (currently ~line 164) — add a NEW sub-section **before** that section titled `## Brief Authoring Pre-flight (mandatory — added 2026-05-19 from SKILL_IMPROVEMENT_HARVEST_2026_05_19)` with 3 numbered sub-rules. Steps 0.7 / 0.8 / 0.9 ARE the sub-rule numbers inside that new section. | `### Step 0.7 — Live-State Probe`, `### Step 0.8 — Line-Budget Buffer Convention`, `### Step 0.9 — User Memory Compliance Check` |
| Step 0.8 Line-Budget Buffer | same | same | same |
| Step 0.9 User Memory Compliance Check | same | same | same |
| Step 1.5.6 DB Probe Pre-Flight | `opticup-executor/SKILL.md` | Append at end of `### Step 1.5 — DB Pre-Flight Check` (just before the next `### Step` heading; current Step 1.5 ends with a sub-item that runs through `5b` at ~line 871; my insertion goes after the last existing sub-item but before the next major Step heading). | `#### Step 1.5.6 — DB Probe Pre-Flight (added 2026-05-19 from SKILL_IMPROVEMENT_HARVEST_2026_05_19)` |
| Step 1.5.7 SECURITY DEFINER Rehearsal | same | same | `#### Step 1.5.7 — SECURITY DEFINER Function Rehearsal (added 2026-05-19 from SKILL_IMPROVEMENT_HARVEST_2026_05_19)` |
| DECISIONS_LOG entry | `opticup-architect/references/DECISIONS_LOG.md` | Add row #35 to the `## Cross-Module decisions` table. Add a multi-paragraph named block at the BOTTOM of the file matching the SKILL_HARVEST_2026_05_18 precedent format (Situation / Recommendation / Daniel's response / Patterns codified / Cross-references). | n/a — content-only edit |

This resolution is binding. Executor follows verbatim.

### 0.5 Baselines

| Symbol | Value (captured 2026-05-19) |
|---|---|
| `BASE_ARCHITECT_SKILL_BYTES` | 96073 |
| `BASE_EXECUTOR_SKILL_BYTES` | 102041 |
| `BASE_DECISIONS_LOG_BYTES` | 73532 |
| `BASE_LATEST_CROSS_ENTRY` | #34 (2026-05-19 SuperSale Funnel Investigation Brief) |
| `BASE_LIGHT_PIPELINE_PRECEDENT` | SKILL_HARVEST_2026_05_18 (same skill-harvest shape, ran successfully 2026-05-18) |

### 0.6 D-AUTH (Foreman pre-decisions)

- **D-AUTH-1 (insertion anchors).** Per §0.4 table above. Executor uses these verbatim.
- **D-AUTH-2 (3 commits per Brief D3).** C2 = architect SKILL.md changes (Steps 0.7+0.8+0.9 all in one commit since they're a co-located sub-section). C3 = executor SKILL.md changes (Steps 1.5.6+1.5.7 same commit). C4 = DECISIONS_LOG.md cross-module entry. Plus C5 = retrospective (EXECUTION_REPORT + FINDINGS). Total Executor commits = 4. C1 = this SPEC.md seal (already committed by Foreman in next step).
- **D-AUTH-3 (verbatim content).** §3.5 below specifies the exact text for each insertion. Executor doesn't re-author wording — just splices.
- **D-AUTH-4 (Iron Rule 32 declared 0).** No file deletes, no DROPs, no destructive ops. Pure additive doc edits. The architect SKILL.md insertion creates a NEW `## Brief Authoring Pre-flight` section without removing anything; the executor SKILL.md insertion appends 2 new sub-items to Step 1.5 without removing anything; the DECISIONS_LOG insertion adds 1 row + 1 named block without modifying existing content.
- **D-AUTH-5 (write-lock fallback).** Brief §8 specifies that if running on Cowork VM and `.claude/skills/` write fails → fall back to `_archive/architect-pending-entries/<file>.pending.md` (per the standing CLAUDE.md §11 Cowork-VM gate). This session is Windows desktop (per environment header), so no write lock risk. If Executor runs from a different machine and hits the lock → STOP, write the pending file, escalate.
- **D-AUTH-6 (no Reviewer self-review masquerade).** Foreman closure section §10 below does a spot-check (read the 3 files post-edit, grep for the inserted headings, confirm content length added ≈ targeted ≈ 50 lines total). This is NOT a Reviewer-skill audit; it's Foreman closure discipline.

### 0.7 Findings at SPEC Author Time

| # | Finding | Severity | Disposition |
|---|---|---|---|
| F-A1 | Brief's "Step 0.7/0.8/0.9" naming doesn't match existing architect SKILL.md numbering (uses Bootstrap 1/2/3/4/4.1/4.5/5). Resolved at author time per §0.4 — adopt the Brief's naming for cross-reference clarity, place inside a new `## Brief Authoring Pre-flight` section. | INFO | Resolved in SPEC. No follow-up. |
| F-A2 | Brief's "Step 1.5.6/1.5.7" naming differs from existing executor SKILL.md sub-letter pattern (a..j). Resolved at author time per §0.4 — adopt the Brief's dot-numeric naming for cross-reference clarity, place at end of Step 1.5 as `#### Step 1.5.6` / `#### Step 1.5.7`. | INFO | Resolved in SPEC. No follow-up. |
| F-A3 | The Brief says Pattern D (English-only) is "MOST FREQUENT pattern of today — every single Brief I wrote (~10) carried this defect." This SPEC's Step 0.9 is the structural fix. NOT retroactive (per Brief D2 no past-Brief amendments). | INFO | Resolved by Step 0.9 codification. No follow-up. |

---

## 1. Goal

Harvest 4 recurring proposals from today's 2026-05-19 FOREMAN_REVIEWs into the architect + executor skills + DECISIONS_LOG. Specifically:
1. Add Steps 0.7 (Live-State Probe) + 0.8 (Line-Budget Buffer) + 0.9 (User Memory Compliance Check, including the specific English-status-line prohibition) to `opticup-architect/SKILL.md`.
2. Add Steps 1.5.6 (DB Probe Pre-Flight) + 1.5.7 (SECURITY DEFINER Function Rehearsal) to `opticup-executor/SKILL.md`.
3. Add 1 cross-module DECISIONS_LOG entry documenting this harvest.

After this lands: future SPECs catch Pattern A (schema drift), Pattern B (line-budget overruns), Pattern C (SECURITY DEFINER untested), Pattern D (user-memory contradictions) at SPEC author time instead of execution time.

---

## 2. Background & Motivation

Per Brief §2, today (2026-05-19) closed 4 M4 SPECs and surfaced 4 recurring proposal patterns:
- Pattern A (DB state probe at SPEC author time) — 4 occurrences → 3-strike PASSED.
- Pattern B (line-count budget header buffer) — 2 occurrences.
- Pattern C (SECURITY DEFINER + extensions rehearsal) — 2 occurrences.
- Pattern D (Activation Prompts contradicting user memory) — 4 occurrences (the highest-frequency offender; codified earlier this session in the user memory itself).

Per `opticup-strategic/SKILL.md` §"Self-Improvement Mandate": *"If 3 consecutive reviews have called out the same issue, the next session MUST apply the change before starting any other work."* Pattern A passes strictly. Patterns B + C border 2-strike. Pattern D was directly raised by Daniel to the executing session 3 times across the session. All 4 are applied here as one bundle.

The previous skill-harvest precedent (`SKILL_HARVEST_2026_05_18`, 2026-05-18) ran successfully as a Light Pipeline + the same DECISIONS_LOG entry format — this SPEC follows that template.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify command |
|---|-----------|----------|----------------|
| 1 | Branch state | On `develop`, scope-clean at SPEC close | `git status --short` shows only pre-existing-from-prior-sessions paths |
| 2 | Commits produced (Executor scope) | 4 commits: C2 (architect SKILL) + C3 (executor SKILL) + C4 (DECISIONS_LOG) + C5 (retrospective). ±1 acceptable. | `git log {SPEC_SEAL}..HEAD --oneline \| wc -l` → 4–5 |
| 3a | `opticup-architect/SKILL.md` contains a `## Brief Authoring Pre-flight (mandatory — added 2026-05-19 from SKILL_IMPROVEMENT_HARVEST_2026_05_19)` section | exists | `grep -c "## Brief Authoring Pre-flight" .claude/skills/opticup-architect/SKILL.md` → 1 |
| 3b | Inside that section, `### Step 0.7 — Live-State Probe` exists | exists | `grep -c "### Step 0.7 — Live-State Probe" .claude/skills/opticup-architect/SKILL.md` → 1 |
| 3c | `### Step 0.8 — Line-Budget Buffer Convention` exists | exists | `grep -c "### Step 0.8 — Line-Budget Buffer Convention" .claude/skills/opticup-architect/SKILL.md` → 1 |
| 3d | `### Step 0.9 — User Memory Compliance Check` exists AND contains the English-status-line prohibition phrase | exists | `grep -c "### Step 0.9 — User Memory Compliance Check" .claude/skills/opticup-architect/SKILL.md` → 1; `grep -c "English status line" .claude/skills/opticup-architect/SKILL.md` → ≥ 1 |
| 4a | `opticup-executor/SKILL.md` contains `#### Step 1.5.6 — DB Probe Pre-Flight` | exists | `grep -c "#### Step 1.5.6 — DB Probe Pre-Flight" .claude/skills/opticup-executor/SKILL.md` → 1 |
| 4b | `opticup-executor/SKILL.md` contains `#### Step 1.5.7 — SECURITY DEFINER Function Rehearsal` | exists | `grep -c "#### Step 1.5.7 — SECURITY DEFINER Function Rehearsal" .claude/skills/opticup-executor/SKILL.md` → 1 |
| 4c | Step 1.5.6 mentions `pg_extension` + `pg_namespace` + `pg_proc` + `information_schema` probes | mentions all 4 | grep |
| 4d | Step 1.5.7 mentions `BEGIN; ... ROLLBACK;` rehearsal pattern | mentions | grep |
| 5a | `opticup-architect/references/DECISIONS_LOG.md` cross-module table has row #35 referencing this harvest | exists | `grep -E "^\| 35 " .claude/skills/opticup-architect/references/DECISIONS_LOG.md` → 1 |
| 5b | DECISIONS_LOG has a named multi-paragraph block at the bottom titled "2026-05-19 — Skill Improvement Harvest" or equivalent | exists | `grep -c "Skill Improvement Harvest" .claude/skills/opticup-architect/references/DECISIONS_LOG.md` → ≥ 1 |
| 6 | Iron Rule 31 integrity gate passes at every commit | exit 0 or 2 | pre-commit hook |
| 7 | Iron Rule 32 destructive-ops gate | declared 0 ops; hook accepts | pre-commit + §11 visual confirm |
| 8 | File-size delta per file | architect SKILL.md grows by 30–60 lines; executor SKILL.md grows by 25–50 lines; DECISIONS_LOG grows by 15–40 lines. Total ~70–150 added lines across 3 files. | `wc -l` comparisons |
| 9 | NO existing skill content removed or contradicted | byte-additive only | `git diff -- <file> \| grep "^-"` should show only diff-header lines, no `-` content lines |
| 10 | Cross-Module Safety: only the 3 declared files in diff | yes | `git diff --name-only {SPEC_SEAL}..HEAD` → exactly the 3 target files + SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md |
| 11 | Working tree scope-clean at SPEC close | yes | `git status --short` shows only pre-existing-unrelated paths |

### 3.5 Verbatim Insertion Content

The Executor inserts these blocks VERBATIM.

#### 3.5.A — Insert into `.claude/skills/opticup-architect/SKILL.md` BEFORE the section `## Brief + Activation Prompt hand-off format (mandatory)` (currently around line 164)

```markdown
## Brief Authoring Pre-flight (mandatory — added 2026-05-19 from SKILL_IMPROVEMENT_HARVEST_2026_05_19)

Before writing ANY Brief or Activation Prompt, run these three checks. They prevent the patterns that recurred most frequently across the 2026-05-19 SPEC cohort.

### Step 0.7 — Live-State Probe (REQUIRED for any Brief that cites DB-stored values)

If the Brief is about to cite:
- A **column name** (e.g., `crm_event_attendees.purchase_amount`) — `grep -n "<column>" modules/Module*/docs/db-schema.sql docs/GLOBAL_SCHEMA.sql` FIRST. If the column doesn't exist or has a different name, the Brief is built on a false assumption.
- A **status value** (e.g., `status='purchased'`) — `SELECT slug FROM crm_statuses WHERE entity_type='<entity>'` via Supabase MCP FIRST. The Brief author often invents status values that the live data doesn't have.
- An **extension function** (e.g., `uuid_generate_v5`, `gen_random_uuid`, `crypt`, `digest`) — `SELECT n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='<fn>'` FIRST. Supabase moves most extensions to the `extensions` schema; assuming `public.` ships a P0 regression.
- A **new column** the Brief plans to add — `SELECT column_name FROM information_schema.columns WHERE table_name='<target>' AND column_name='<proposed>'` FIRST. Rule 21: an existing column with semantically-overlapping purpose blocks the Brief's invented column.

Pin the probe results in §0 of the SPEC the Brief feeds, under a "Live-DB Baselines" sub-table referenced by symbolic `BASE_*` constants.

**Source:** Pattern A — 4 occurrences across 2026-05-19 cohort (M4_FB_CAPI_PURCHASE_EVENTS status vocabulary, event_type vs event_name column, M4_PIXEL_VALIDATION_GAP_DASHBOARD column name `l.name` vs `l.full_name`, M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX schema location `public` vs `extensions`).

### Step 0.8 — Line-Budget Buffer Convention

When a Brief (or the SPEC that derives from it) cites a file-size budget like "≤ 70 lines" for a migration / docs file / new module, write it as: `≤ N lines (±5 buffer for header comments)`.

The Executor accepts overruns up to +5 lines without retroactive amendment. Migration headers and doc-section preambles consistently land 3–5 lines over the strict budget; the buffer prevents post-hoc Foreman dance to re-amend the SPEC.

**Source:** Pattern B — 2 occurrences (M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX migration 73 vs 70; M4_PIXEL_VALIDATION_GAP_DASHBOARD docs 297 vs 295). Codifies the practice that emerged across both.

### Step 0.9 — User Memory Compliance Check (MANDATORY BEFORE EVERY BRIEF + ACTIVATION PROMPT)

Before sealing ANY Brief or Activation Prompt, read user auto-memory (`/mnt/.auto-memory/MEMORY.md` + the feedback memory files it links to). Check for:
- **Active language preferences** (response language for Daniel-facing communication).
- **Active format preferences** (response length, structure).
- **Explicit "do not" rules**.

The Brief or Activation Prompt **MUST NOT** contradict any such rule.

**SPECIFIC PROHIBITION (THE recurring offender):** NEVER instruct the executing session to "surface a Hebrew one-line status to Daniel" or any variant ("emit Hebrew status", "Hebrew summary at end", "סיכום קצר בעברית"). The closure instruction MUST be:

> "When done, surface a short English status line."

The user-memory rule `feedback_english_only_responses.md` (re-confirmed 3× — 2026-05-12, 2026-05-13, 2026-05-19) takes ABSOLUTE PRECEDENCE over any Pipeline-mechanics preference for Hebrew status lines. Daniel's terminal renders Hebrew reversed; Hebrew status lines arrive broken and force a manual re-ask cycle.

If the user has any other feedback memory about a behavioral preference (response length, language, format) — that memory takes PRECEDENCE over preferred Pipeline conventions.

**Source:** Pattern D — 4 occurrences in 2026-05-19 cohort + 3 Daniel re-asks across 7 days. Highest-frequency proposal of the cohort. Codified here so the offender cannot recur structurally.
```

#### 3.5.B — Insert into `.claude/skills/opticup-executor/SKILL.md` AT THE END of `### Step 1.5 — DB Pre-Flight Check`, BEFORE the next major `### Step 2` (or equivalent) heading

```markdown
#### Step 1.5.6 — DB Probe Pre-Flight (added 2026-05-19 from SKILL_IMPROVEMENT_HARVEST_2026_05_19)

For every SPEC that touches DB (DDL, schema change, RPC creation, trigger creation, function modification, even row-level INSERT/UPDATE that depends on a specific column shape), run these probes BEFORE applying the first migration:

1. **Extension presence + schema location.** `SELECT n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='<extension_fn>'` for any function the SPEC will call from an extension (e.g., `uuid_generate_v5`, `uuid_ns_oid`, `digest`, `crypt`). If schema returns `extensions` and the SPEC wrote `public.<fn>` → STOP and escalate. The schema-qualifier mismatch is the M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX class.
2. **Function existence + signature.** `SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='<target_fn>'` for any function the SPEC mentions. If the function doesn't exist or its argument list differs → STOP.
3. **Column existence + data type.** `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='<target>' AND column_name IN (<list>)` for every column the SPEC's SQL references. If any column is missing or has a different name (e.g., SPEC says `name`, schema says `full_name`) → STOP.
4. **Status / enum value existence.** `SELECT slug, COUNT(*) FROM crm_statuses GROUP BY slug` (or equivalent) before any SPEC that filters by a status value. If the value doesn't exist → STOP.

If any probe surfaces a divergence from SPEC assumption → STOP per Bounded Autonomy, write the deviation to EXECUTION_REPORT D-N, escalate. Do NOT silently substitute.

**Source:** Pattern A — 4 occurrences across 2026-05-19 cohort. The Executor-side dual of opticup-architect Step 0.7 (defense-in-depth).

#### Step 1.5.7 — SECURITY DEFINER Function Rehearsal (added 2026-05-19 from SKILL_IMPROVEMENT_HARVEST_2026_05_19)

For every SPEC that CREATES or MODIFIES a function declared `SECURITY DEFINER` (DB trigger functions, RPCs, etc.), rehearse the function inside a `BEGIN; ... ROLLBACK;` block on demo BEFORE the C-commit that ships it.

Procedure:
1. Apply the migration to demo via MCP `apply_migration` OR via a `DO $$ ... $$` block inside a transaction.
2. Execute the function (e.g., INSERT/UPDATE the row that fires the trigger).
3. Verify: no privilege errors, no schema-qualification errors, no missing-function errors, no SECURITY DEFINER `SET search_path` mismatches.
4. `ROLLBACK;` — the rehearsal leaves zero DB state changes.
5. Capture the rehearsal trace (SQL + result) in EXECUTION_REPORT §2 (DB-probe-and-rehearsal section).

If the rehearsal raises any error → STOP, escalate. The function is broken; shipping it would create the M4_FB_CAPI_PURCHASE_EVENTS class P0 regression.

**Source:** Pattern C — 2 occurrences across 2026-05-19 cohort + the upstream P0 regression that needed M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX. The check would have caught it 30 seconds before the migration shipped.
```

#### 3.5.C — Insert into `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`

**Part 1 — Append a new row to the Cross-Module decisions table (after row #34, just before the `## Module-specific decisions` / closing block):**

```markdown
| 35 | 2026-05-19 | **Skill-improvement harvest — 4 patterns codified into opticup-architect + opticup-executor SKILL.md** | After today's 4-SPEC M4 cohort (M4_PIXEL_VALIDATION_GAP_DASHBOARD + M4_FB_CAPI_PURCHASE_EVENTS + M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX + M4_TEMPLATE_VALIDATION_UI_LINT), 4 recurring proposal patterns crossed the 2- or 3-strike threshold and were promoted into the skills via Light Pipeline `SKILL_IMPROVEMENT_HARVEST_2026_05_19`. Pattern A (DB state probe at SPEC author time) → `opticup-architect/SKILL.md` Step 0.7 + `opticup-executor/SKILL.md` Step 1.5.6. Pattern B (line-budget header buffer) → architect Step 0.8. Pattern C (SECURITY DEFINER rehearsal) → executor Step 1.5.7. Pattern D (Activation Prompts contradicting user memory; Daniel re-asked 3× in 7 days for English-only status lines) → architect Step 0.9 with SPECIFIC PROHIBITION on Hebrew-status-line instructions. 4 Executor commits, 3 doc files modified, 0 destructive ops, 0 escalations. |
```

**Part 2 — Append a multi-paragraph named block at the BOTTOM of DECISIONS_LOG.md, AFTER the existing `## 2026-05-18 — Working Patterns Harvest` block, FOLLOWING that block's format:**

```markdown
## 2026-05-19 — Skill Improvement Harvest (4 patterns codified after 4-SPEC autonomous day)

**Situation:** 4 M4 SPECs closed on 2026-05-19 (PIXEL_VALIDATION_GAP_DASHBOARD + FB_CAPI_PURCHASE_EVENTS + FB_CAPI_PURCHASE_EVENTS_UUID_FIX + TEMPLATE_VALIDATION_UI_LINT). 4 recurring proposal patterns surfaced in their FOREMAN_REVIEWs — at 2-strike to 4-strike frequency. Per `opticup-strategic/SKILL.md` §"Self-Improvement Mandate", 3-strike+ patterns must be applied before the next session begins other work.

**My recommendation:** Run a Light Pipeline (no Reviewer, no Localhost-Tester — doc-only) to apply all 4 patterns as one atomic bundle, matching the SKILL_HARVEST_2026_05_18 precedent.

**Daniel's response:** Authorized.

**Patterns codified:**
- **Pattern A (DB state probe at SPEC author time)** — 4 occurrences. Added to `opticup-architect/SKILL.md` as Step 0.7 (Live-State Probe — column/status/extension/info-schema probes before sealing any Brief that cites DB-stored values). Defense-in-depth added to `opticup-executor/SKILL.md` as Step 1.5.6 (DB Probe Pre-Flight — 4 probe types repeated at execution time before the first migration commit).
- **Pattern B (line-count budget header buffer)** — 2 occurrences. Added to architect SKILL.md as Step 0.8 (write budgets as "≤ N lines (±5 buffer for header comments)" so Executor doesn't dance with retroactive amendments).
- **Pattern C (SECURITY DEFINER function rehearsal)** — 2 occurrences + the M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX P0 regression root cause. Added to executor SKILL.md as Step 1.5.7 (BEGIN/ROLLBACK rehearsal on demo for any SECURITY DEFINER function before C-commit).
- **Pattern D (Activation Prompts contradicting user memory)** — 4 occurrences in 2026-05-19 cohort + 3 Daniel re-asks across 7 days. Highest-frequency proposal. Added to architect SKILL.md as Step 0.9 (User Memory Compliance Check) WITH the SPECIFIC PROHIBITION: never instruct the executing session to surface Hebrew status lines. The closure instruction must be: "When done, surface a short English status line." User-memory rule `feedback_english_only_responses.md` takes ABSOLUTE PRECEDENCE over any Pipeline-mechanics preference.

**Reason for codification:** Without these 4 codifications, the next Brief authored by opticup-architect (or any Pipeline that derives from one) would repeat the same author-time blind spots. The Executor's own Step 1.5 would catch some of them (Pattern A defense-in-depth), but the recurring cost of Foreman→Executor escalations + P0 hotfix loops + Daniel re-asks justifies fixing the upstream cause.

**Lesson (for Architect):** Cross-skill defense-in-depth pays. Pattern A is codified BOTH in architect (catch at Brief author time) AND in executor (catch at execution pre-flight). The first layer prevents most occurrences; the second layer catches the residue. Pattern D is single-layer (architect only) because it has no execution-side symptom — it's purely an author-side defect.

**Cross-references:**
- Source SPECs: `modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/FOREMAN_REVIEW.md`, `M4_FB_CAPI_PURCHASE_EVENTS/FOREMAN_REVIEW.md` (via CLOSURE_NOTE.md), `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/FOREMAN_REVIEW.md`, `M4_TEMPLATE_VALIDATION_UI_LINT/FOREMAN_REVIEW.md`.
- Brief: `modules/Module 1.5 - Shared Components/architecture-brief/SKILL_IMPROVEMENT_HARVEST_2026_05_19_BRIEF.md`.
- SPEC: `modules/Module 1.5 - Shared Components/docs/specs/SKILL_IMPROVEMENT_HARVEST_2026_05_19/`.
- Precedent: `SKILL_HARVEST_2026_05_18` (same shape, ran 2026-05-18 — Light Pipeline successful).
- User memory affected: `feedback_english_only_responses.md` (Pattern D source).
```

---

## 4. Autonomy Envelope

### CAN do autonomously
- Read any file.
- Modify exactly these 3 files:
  - `.claude/skills/opticup-architect/SKILL.md` (insert per §3.5.A).
  - `.claude/skills/opticup-executor/SKILL.md` (insert per §3.5.B).
  - `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` (insert per §3.5.C).
- Use the verbatim block text in §3.5 — no re-authoring.
- Stage by explicit filename; `git diff --cached --name-only` before each commit.

### MUST STOP
- Need to modify ANY file outside the 3 declared.
- Existing skill content contradicts the proposed edit AND resolving requires architect input → STOP, escalate.
- Iron Rule 31 gate fails.
- Iron Rule 32 fires (unexpected — declared 0 ops).
- Cowork-VM write lock on `.claude/skills/` → STOP, write pending file at `_archive/architect-pending-entries/<slug>.pending.md`, escalate.

### Bounded handling of EXPECTED deviations
- **Existing Step numbering already uses sub-letter pattern (a..j) in executor SKILL.md.** Foreman pre-resolved per §0.4 — adopt the Brief's dot-numeric naming as a new sub-heading style. The two patterns can coexist; future Executor sessions can choose either.

---

## 5. Stop-Triggers

In addition to CLAUDE.md §9:
1. Insert text would create a duplicate heading (e.g., another `## Brief Authoring Pre-flight` already exists) — STOP.
2. Insert text would land inside an existing section in a way that breaks Markdown structure (e.g., inside a code fence) — STOP.
3. DECISIONS_LOG row #35 already exists (collision with concurrent session) — STOP.

---

## 6. Pipeline

**LIGHT PIPELINE — 2 hats:**

1. **Foreman (Opus)** authors this `SPEC.md` (DONE — this file).
2. **Executor (Sonnet)** applies the 3 insertions verbatim per §3.5, then writes EXECUTION_REPORT.md + FINDINGS.md. 4 commits.
3. **Foreman closes (Opus)** with `FOREMAN_REVIEW.md` self-reviewing the 3 doc edits + updating memory if needed. Per Brief §5, no Reviewer + no Localhost-Tester — Foreman self-reviews.

---

## 7. Out of Scope

- Any other accumulated SPEC proposals — wait for the NEXT harvest.
- `opticup-reviewer/SKILL.md` changes — Reviewer skill not yet in active self-improvement loop.
- `opticup-localhost-tester/SKILL.md` changes — same.
- Modifying past FOREMAN_REVIEWs (immutable).
- Re-running Pipelines on past SPECs.
- Any DB, EF, frontend code touch.
- Any module's MODULE_MAP / SESSION_CONTEXT / db-schema / ROADMAP.
- Any test file.

---

## 8. Expected Final State

| File | Action | Expected delta |
|---|---|---|
| `.claude/skills/opticup-architect/SKILL.md` | MODIFIED | +30 to +60 lines (new section + 3 sub-steps per §3.5.A) |
| `.claude/skills/opticup-executor/SKILL.md` | MODIFIED | +25 to +50 lines (2 new sub-steps per §3.5.B) |
| `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` | MODIFIED | +15 to +40 lines (1 table row + 1 named multi-paragraph block per §3.5.C) |
| `modules/Module 1.5 - Shared Components/docs/specs/SKILL_IMPROVEMENT_HARVEST_2026_05_19/SPEC.md` | NEW (this file) | this file |
| `.../EXECUTION_REPORT.md` | NEW (Executor) | ~100 lines |
| `.../FINDINGS.md` | NEW (Executor) | ~15 lines |
| `.../FOREMAN_REVIEW.md` | NEW (Foreman closure) | ~150 lines |

**Git state:** 5–6 commits in range from this SPEC seal.

**No memory update needed** — `feedback_english_only_responses.md` was already strengthened earlier this session.

**No FUNNEL_ROADMAP / MASTER_ROADMAP update needed** — this SPEC is a skill-improvement, not a module phase closure.

---

## 9. Rollback Plan

Per Brief D3, 1 commit per file means each can be reverted independently:
- `git revert <C2 commit>` — undoes architect SKILL.md change.
- `git revert <C3 commit>` — undoes executor SKILL.md change.
- `git revert <C4 commit>` — undoes DECISIONS_LOG change.

No DB / EF / runtime state to roll back. Pure doc.

---

## 10. Commit Plan

- **C1** (already done — this SPEC.md): `chore(spec): seal SKILL_IMPROVEMENT_HARVEST_2026_05_19 — Light Pipeline doc-only harvest`.
- **C2**: `chore(skills): apply Pattern A+B+D improvements to opticup-architect SKILL — Steps 0.7+0.8+0.9 (SKILL_IMPROVEMENT_HARVEST_2026_05_19)`.
- **C3**: `chore(skills): apply Pattern A+C improvements to opticup-executor SKILL — Steps 1.5.6+1.5.7 (SKILL_IMPROVEMENT_HARVEST_2026_05_19)`.
- **C4**: `chore(architect): log SKILL_IMPROVEMENT_HARVEST_2026_05_19 in DECISIONS_LOG (cross-module entry #35 + named block)`.
- **C5**: `chore(spec): SKILL_IMPROVEMENT_HARVEST_2026_05_19 — Executor retrospective`.

Foreman closure adds 1 more commit (FOREMAN_REVIEW.md).

---

## 11. Destructive Operations

**Count: 0.**

Per Iron Rule 32, `destructive-ops-declared.mjs` scans for: file deletes, `git rm`, mass renames, `git rebase`, `git reset --hard`, `git push --force`, `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`, `ALTER TABLE ... DROP`, DML mass-delete, CLAUDE.md/SKILL.md section deletion, main-branch modification.

**This SPEC has none of these.** All edits are additive doc inserts. The Executor must NOT delete any existing content from the 3 target files (criterion 9). If a future deletion or restructure is needed, that's a separate SPEC.

If Executor encounters need for any destructive op → STOP, escalate.

---

## 12. Cross-References

- **Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/SKILL_IMPROVEMENT_HARVEST_2026_05_19_BRIEF.md`.
- **Source SPECs (today's 2026-05-19 cohort):**
  - `modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/FOREMAN_REVIEW.md`.
  - `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/CLOSURE_NOTE.md` (status pivot to 🟡 after hotfix).
  - `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX/FOREMAN_REVIEW.md`.
  - `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UI_LINT/FOREMAN_REVIEW.md`.
- **Precedent SPEC (same Light Pipeline shape):** `SKILL_HARVEST_2026_05_18` (2026-05-18).
- **User memory:** `feedback_english_only_responses.md` (Pattern D source).
- **Iron Rules:** 12, 21, 31, 32.

---

## 13. Author Notes

Smallest SPEC of the day. Pure additive doc edits. The leverage is high: the next ~20 SPECs authored by opticup-architect will each save 2–10 minutes by hitting Pattern A/B/C/D zero times at execution.

The most important sub-rule is **Step 0.9 — User Memory Compliance Check, with the SPECIFIC PROHIBITION on Hebrew-status-line instructions**. That single line saves Daniel from a 4th re-ask cycle. Daniel has been gracious about asking 3 times; the rule is now infrastructure, not culture (per his 2026-05-09 directive captured in DECISIONS_LOG #11).

---

*End of SPEC.*
