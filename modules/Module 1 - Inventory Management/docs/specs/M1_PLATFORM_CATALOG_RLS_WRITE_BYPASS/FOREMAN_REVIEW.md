---
spec_id: M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS
reviewer: opticup-strategic (Foreman, Claude Code Opus 4.7 1M)
reviewed: 2026-05-18 night (Path X, same session as Executor + Reviewer + Tester)
status: 🟡 CLOSED-WITH-FOLLOWUPS — Stage 2A unblocker
brief: modules/Module 1 - Inventory Management/architecture-brief/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md
---

# FOREMAN_REVIEW — M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS

## 1. Verdict

🟡 **CLOSED-WITH-FOLLOWUPS — SPEC goal fully achieved; one architectural NEW_SPEC queued.**

**What shipped (5 commits on `develop`):**
- 4 new `platform_admin_bypass` RLS policies on `lens_brand` / `lens_design` / `lens_variant` / `contact_lens_variant` (cmd=ALL, USING + WITH CHECK both calling `public.is_platform_super_admin()`). DB verified — Reviewer + Tester both confirmed live state.
- Tier C VFV 8/8 PASS: 4 positive cases (Daniel's JWT successfully INSERTed global rows) + 4 negative cases (tenant-manager JWT rejected with `42501 RLS violation`). 0 lingering test rows.
- Stage 2A's 4 creation modals (T-BLOCK-2 carry) now functionally unblocked at DB layer.

**🟡 driver:** F-1 HIGH (architectural) — the Iron Rule 32 hook (`destructive-ops-declared.mjs`) lacks SQL-pattern authorization parsing. Hook blocked the migration commit even though SPEC §Destructive Operations explicitly declared the 4 `DROP POLICY IF EXISTS` ops as authorized. Daniel granted explicit one-time `--no-verify` chat go-ahead per Iron Rule 32 protocol (the only authorized bypass channel). NEW_SPEC `M1_5_IRON_RULE_32_HOOK_SQL_PATTERN_AUTHORIZATION` queued to close the gap permanently (bundles F-2 comment-awareness fix).

**SPEC goal verdict alone: 🟢.** Combined with infrastructure-gap surfaced during execution: 🟡 — consistent with prior Foreman convention (HIGH finding requiring NEW_SPEC follow-up → 🟡 verdict).

## 2. SPEC Quality Audit (self-audit of my own SPEC.md authoring)

**Strengths:**
- §0.2 Pre-flight verifications captured 5 live DB checks BEFORE seeding the SPEC. The polish-by-validation guard had a hard zero-baseline to compare against — Executor's pre-apply re-probe confirmed the same baseline minutes later, and would have triggered STOP if drift had occurred between SPEC seal and Executor start.
- §0.3 Runtime semantics rehearsal traced 4 caller classes (Daniel / tenant manager / anon / service_role) against the new policy + OR-combined existing policies. Tester's 8 cases hit exactly the 2 caller classes the rehearsal predicted. **All 8 cases behaved exactly as the rehearsal predicted.** Pattern P-AUTHOR-1 from Stage 2A's FR successfully applied.
- §3a Shared Edit Block (P-AUTHOR Author Proposal #1 from MIGRATION_2 FR, applied in Stage 2A) declared the migration SQL ONCE for 4 tables. Reviewer verified the block content once + checked per-table conformance via grep `S-MIGRATION-USES-FUNCTION` (8 hits required, achieved). Saved Reviewer 3× re-verification.
- §0.4 caught pre-existing schema drift (F-PRE-1: `contact_lens_variant.public_view.cmd='ALL'` vs siblings' `cmd='SELECT'`) at AUTHOR time. This kind of pre-flight observation is exactly the discipline Stage 2A's P-AUTHOR-1 codified.
- Hard rule "NO polish-by-validation closure" in §5 as ACTIVE stop-trigger, not soft language. Memory `feedback_no_polish_by_validation.md` respected.
- 27 measurable success criteria — 19 Executor-measurable + 8 Tester-measurable. Reviewer verified all 19 independently; Tester verified the 8.

**Weaknesses (generate the P-AUTHOR proposals below):**

- **§Destructive Operations declared the 4 DROP POLICY ops in PROSE form**, expecting the Iron Rule 32 hook to consume the authorization. The hook can't — it only handles file-deletion authorization. **The SPEC author (me) did not pre-flight-simulate the destructive-ops gate against the proposed migration.** A 60-second `node scripts/checks/destructive-ops-declared.mjs --simulate ./tmp-test-migration.sql` against a sample of the §3a Block A would have caught this BEFORE dispatch. Cost: ~25 minutes Executor wasted (apply + verify + stage + retry + escalation-write) + 1 Daniel-intervention cycle. **P-AUTHOR-1 below codifies the pre-flight simulation.**
- **No structured "authorized SQL patterns" syntax in SPEC §Destructive Operations.** Today the section is free-form prose. If it could carry a machine-readable block like `Authorized SQL patterns: ['DROP POLICY platform_admin_bypass ON public.lens_brand', ...]`, the hook's auth-parser could be extended to consume it. **P-AUTHOR-2 below codifies the template addition.**

**Verdict on SPEC quality: 8/10.** §0 was thorough; §3 measurable; §3a Shared Edit Block worked perfectly; runtime semantics rehearsal caught all the traps it was designed to. The miss was infrastructure-pre-flight discipline — a NEW author-skill gap surfaced by this SPEC.

## 3. Execution Quality Audit

**Strengths:**
- Executor pre-apply re-probe ran exactly as SPEC §5 required, confirmed 0/4 baseline, then proceeded. Polish-by-validation guard armed but didn't fire.
- Migration content copied verbatim from SPEC §3a Block A. Reviewer confirmed byte-for-byte match.
- `apply_migration` succeeded. Post-apply verification: 4 new rows in `pg_policies` with correct shape. 12 existing policies byte-identical to §0.2 baseline. **Live DB state matches SPEC §3 expectations.**
- Hook block correctly STOPPED execution per Iron Rule 32 protocol. Did NOT bypass with `--no-verify` autonomously. **Wrote escalation file at the exact right moment with the exact right content.** Decision matrix in escalation §"Options" listed 4 paths with cost/risk per option — gave Daniel a clean choice surface.
- Executor's findings (F-1 HIGH, F-PRE-1 INFO, F-2 LOW) are accurate, well-categorized, with concrete disposition recommendations.
- Iron Rule 9 backup not required (only 2 files staged at first commit; under threshold).

**Weaknesses:**
- **No proactive hook-gate simulation BEFORE applying the migration.** When the Executor saw the migration file contained `DROP POLICY IF EXISTS` × 4, they could have run `node scripts/checks/destructive-ops-declared.mjs` against the staged file BEFORE `apply_migration` to surface the block at zero-cost. Instead the gap surfaced post-apply, creating the DB/source-control divergence. **Cost: ~25 minutes wasted + escalation cycle.** P-EXEC-1 below codifies the pre-apply simulation step.
- **EXECUTION_REPORT §13 inlined FINDINGS** because Executor reported a harness restriction on creating a sibling `FINDINGS.md` mid-run. I (Foreman) wrote a separate `FINDINGS.md` at closure to satisfy SPEC §12 checklist. **The harness restriction itself is worth investigating.** P-EXEC-2 below codifies a clarification: FINDINGS.md should be created EARLIER in the run (right after the first surface-able finding) rather than at retrospective time.

**Verdict on Execution quality: 9/10.** The execution was disciplined and protocol-correct in every dimension where the Executor had autonomy. The hook-block was correctly STOPPED-AND-ESCALATED, not bypassed. The single 1-point deduction is the missing pre-apply simulation that would have surfaced the block before applying DB changes (creating the divergence).

## 4. Reviewer Report Audit (REVIEWER_REPORT.md `0506208`)

**Verdict alignment:** Reviewer declared 🟡 PASS-WITH-FOLLOWUPS. Foreman concurs.

**Reviewer's audit scope:**
- 19/19 Executor-measurable criteria PASS (independently re-verified all 19, not just sampled).
- 8 deferred to Tester (correctly deferred).
- Iron Rules 15, 21, 22, 31, 32 all PASS with detailed evidence.
- 3 Executor findings (F-1 HIGH, F-PRE-1 INFO, F-2 LOW) confirmed verbatim — Reviewer ran independent verification (inspected `destructive-ops-auth-parser.mjs` source to confirm absence of SQL-pattern handler; ran Supabase MCP probe on `contact_lens_variant.public_view` to confirm cmd=ALL).
- 0 new findings.
- **Constructive correction:** Reviewer noted the Executor's S-COMMITS + S-VERIFY-STAGED self-report values were "FAIL" written during the blocked state, BEFORE Daniel's chat go-ahead. After the bypass shipped Commits 1 + 2 + retrospective, those criteria become PASS. Reviewer documented the timeline correction.

**Foreman observation:** The Reviewer's REVIEWER_REPORT.md correctly captured a subtle Iron Rule 15 nuance — `platform_admin_bypass` is a distinct policy CLASS from `tenant_isolation`. The function-call form returning a boolean (derived from `auth.uid()`-matched membership in `platform_admins`) is the canonical pattern for ADMIN BYPASS surfaces. Direct `auth.uid()` in a tenant_id slot remains forbidden per Iron Rule 15. **This is the FIRST instance of the admin-bypass pattern in the project.** Reviewer's documentation of this nuance becomes precedent for future M11/M13/M14 admin SPECs.

**No disagreements with Reviewer self-report.**

## 5. Tester Report Audit (TEST_REPORT.md `845a6a9`)

**Verdict alignment:** Tester declared 🟢 GREEN — 8/8 PASS. Foreman concurs.

**Per-case results:**

| # | Case | Result | Evidence |
|---|------|--------|----------|
| 18 | S-VFV-POSITIVE-LENS-BRAND | PASS | INSERT under Daniel's JWT returned a row id (before ROLLBACK) |
| 19 | S-VFV-POSITIVE-LENS-DESIGN | PASS | same |
| 20 | S-VFV-POSITIVE-LENS-VARIANT | PASS | same |
| 21 | S-VFV-POSITIVE-CONTACT-VARIANT | PASS | same |
| 22 | S-VFV-NEGATIVE-LENS-BRAND | PASS | `42501: new row violates row-level security policy for table "lens_brand"` |
| 23 | S-VFV-NEGATIVE-LENS-DESIGN | PASS | same error for table `lens_design` |
| 24 | S-VFV-NEGATIVE-LENS-VARIANT | PASS | same error for table `lens_variant` |
| 25 | S-VFV-NEGATIVE-CONTACT-VARIANT | PASS | same error for table `contact_lens_variant` |
| 26 | S-VFV-CLEANUP | PASS | 0 lingering rows; every test BEGIN-ROLLBACKed |

**Critical insight from the Tester's run:** the new `platform_admin_bypass` policy is **additive on the platform-super-admin path AND invisible on the tenant-manager path**. The bypass is exactly as narrow as Brief D4 mandated. ✅

**The SPEC's hypothesis — "function call inside policy USING/WITH CHECK is the cleanest path; no JWT mint changes needed" — is now empirically validated.** Future M11/M13/M14 admin SPECs can reuse this pattern with confidence.

**Tester's test protocol** (`SET LOCAL ROLE authenticated` + `SET LOCAL request.jwt.claims = '{"sub":"<UID>", ...}'` inside `BEGIN..ROLLBACK`) is a model template for future RLS-policy SPECs. The Tester correctly used ROLLBACK to avoid DB pollution — INSERTs succeeded long enough to prove the policy permitted them, then were rolled back.

**No disagreements with Tester self-report.**

## 6. Findings Processing — Consolidated

| Finding | Source | Severity | Disposition |
|---|---|---|---|
| **F-1** — Iron Rule 32 hook lacks SQL-pattern authorization parsing | Executor + escalation file | HIGH (architectural) | **NEW_SPEC `M1_5_IRON_RULE_32_HOOK_SQL_PATTERN_AUTHORIZATION`** — Foreman to author next session. ~2-3 hours. Bundles F-2 comment-awareness fix. Until shipped, future destructive-SQL SPECs follow the same one-time `--no-verify` chat-go-ahead protocol Daniel granted here. |
| **F-PRE-1** — `contact_lens_variant.public_view.cmd='ALL'` vs siblings' `cmd='SELECT'` | Foreman §0.4 carry-forward | INFO | **TECH_DEBT** — bundle with Stage 2A leftover cleanup. Low-priority operational consistency. Defer to a TECH_DEBT housekeeping sweep within 48h. |
| **F-2** — Iron Rule 32 hook comment-awareness gap | Executor (collateral observation during F-1 investigation) | LOW (already-tracked) | **BUNDLED into F-1's NEW_SPEC** — both gaps are in the same governance-infrastructure layer. |

**Summary:** 0 BLOCKER unresolved at close. 1 HIGH → NEW_SPEC queued. 1 INFO + 1 LOW → bundle with existing follow-ups. No work needs redoing.

## 7. Strategic Flag — Stage 2A status update

**Stage 2A's 🟡 verdict carry T-BLOCK-2 is now RESOLVED at the DB layer.**

Stage 2A's FOREMAN_REVIEW §6 listed T-BLOCK-2 as "ESCALATED to Architect — new Brief stub at `architecture-brief/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md`". The Architect authored that Brief; the Module Strategist (me) authored this SPEC; the full pipeline ran and 8/8 VFV cases prove the RLS bypass works correctly.

**Net effect on Stage 2A:**
- DB layer: ✅ 4 creation modals now functionally unblocked. Platform admins can INSERT global rows. Tenant managers still cannot (narrow bypass).
- ERP code layer: UNCHANGED. Stage 2A's modals already POSTed to standard `.insert()` paths via Supabase client; they will now succeed without any client-side modification.
- Stage 2A's own FOREMAN_REVIEW.md remains historical record of the 🟡 closure with T-BLOCK-2 noted. The resolution of T-BLOCK-2 lives in THIS SPEC's documentation. No retroactive 🟡→🟢 flip on Stage 2A's verdict — that would rewrite history.

**5-stage plan progresses:** Stage 1 🟢 / Stage 2A 🟡 (effective 🟢, T-BLOCK-2 resolved) / **RLS Unblocker 🟡** (this) / Stage 2B unblocked + ready for Architect Brief.

**One observation for Daniel (strategic):** Stage 2B (Excel import dialog) is now the next viable build per the 5-stage plan. The Architect should author the Stage 2B Brief when ready; the Foreman + Executor + Reviewer + Tester pipeline is warm.

## 8. Master-doc Update Checklist

| Doc | Updated? | Where |
|---|---|---|
| `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` | ✅ (Foreman commit `4a3077b`) | Top-of-file RLS Unblocker block prepended above Stage 2A block; Stage 2A block updated to note T-BLOCK-2 resolved by this SPEC |
| `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` | ✅ (Foreman commit `4a3077b`) | New "Stage 2A unblocker" section prepended above Stage 2A section |
| `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` | ✅ (Executor commit `dbbbcf3`) | +1 row for the new migration file |
| `MASTER_ROADMAP.md` (root) | N/A — no module-level status change | M1 lens-catalog stays "in rebuild" until Stage 5. |
| `docs/GLOBAL_MAP.md` | N/A | No new shared functions. |
| `docs/GLOBAL_SCHEMA.sql` | N/A | DEFERRED to Stage 5 Integration Ceremony. Migration file is the canonical record until then. |
| `docs/FILE_STRUCTURE.md` | ⚠ NOT updated — DEFERRED — TECH_DEBT entry recommended per Stage 1 P-AUTHOR-2. Bundle with other deferred FILE_STRUCTURE updates from prior SPECs (Stage 1 F-1 + Stage 2A's deferred entries). | Housekeeping session within 48h. |
| `TECH_DEBT.md` | ⚠ NOT updated this SPEC — pre-existing modifications in working tree from prior sessions. F-PRE-1 + F-2 dispositions defer to dedicated housekeeping session. | Same pattern as Stage 1 + Stage 2A. |

## 9. Self-Improvement Proposals

### Two `opticup-strategic` (author skill) proposals

#### P-AUTHOR-1 — SPEC pre-flight MUST simulate the Iron Rule 32 destructive-ops gate against the proposed migration BEFORE dispatch

**Anchor:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" — add Step 1.6 (after Step 1.5 Cross-Reference Check, before Step 2 Create SPEC Folder):

```
### Step 1.6 — Destructive Ops Gate Simulation (MANDATORY when SPEC §1.5 / §3a contains destructive SQL or file-deletion patterns)

If the SPEC authorizes ANY destructive operations (DROP TABLE/COLUMN/POLICY,
TRUNCATE, ALTER ... DROP, DELETE without tenant scope, mass file delete,
≥5-file rename), simulate the Iron Rule 32 hook BEFORE sealing the SPEC:

1. Write a sample migration / file-action file at `/tmp/spec-simulation.sql`
   matching the proposed operation EXACTLY (same patterns, same SPEC slug).
2. Run: `node scripts/checks/destructive-ops-declared.mjs --simulate <file>`
   (extending the script's CLI surface if needed — see P-AUTHOR-2 below for
   the matching template change).
3. If the hook FLAGS the operation despite the SPEC's §Destructive Operations
   declaration → either:
   (a) Restructure the SPEC to avoid the destructive pattern (preferred when
       possible — e.g. use `CREATE OR REPLACE` instead of `DROP + CREATE`).
   (b) Author a hook-extension micro-SPEC FIRST as a dependency.
   (c) Note the conflict in §Destructive Operations + flag for Daniel
       `--no-verify` chat go-ahead at dispatch time (last resort).
4. NEVER dispatch a destructive-SQL SPEC without running this simulation.
```

**Rationale:** This SPEC's §Destructive Operations declared 4 DROP POLICY IF EXISTS authorized. The hook can't consume SQL-pattern authorizations. Executor's pre-apply state was clean; post-apply the DB had the policies but git was blocked → Daniel had to intervene mid-pipeline. A 60-second pre-dispatch simulation would have caught this BEFORE the Executor ran. Cost saved per future occurrence: ~25 min Executor + 1 Daniel-intervention.

**Acceptance test:** Next 3 SPECs that authorize destructive SQL include a §0 sub-section "Destructive Ops Gate Simulation: simulated against `/tmp/spec-simulation.sql` 2026-XX-XX — result: PASS / FAIL+resolution".

**Derived from:** my §2 weakness #1 + Executor's escalation file analysis.

#### P-AUTHOR-2 — SPEC_TEMPLATE §Destructive Operations should encode an `Authorized SQL patterns:` machine-readable block

**Anchor:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §Destructive Operations — extend the section:

```
## Destructive Operations

(Existing free-form prose for file-deletion authorizations stays.)

If the SPEC authorizes destructive SQL patterns (DROP TABLE/COLUMN/POLICY,
TRUNCATE, ALTER ... DROP, DELETE without WHERE), declare them in a
machine-readable block AFTER the prose:

### Authorized SQL patterns (machine-readable for auth-parser)

```yaml
sql-patterns:
  - pattern: 'DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_brand'
  - pattern: 'DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_design'
  - pattern: 'DROP POLICY IF EXISTS platform_admin_bypass ON public.lens_variant'
  - pattern: 'DROP POLICY IF EXISTS platform_admin_bypass ON public.contact_lens_variant'
```

The companion NEW_SPEC `M1_5_IRON_RULE_32_HOOK_SQL_PATTERN_AUTHORIZATION` will
extend `destructive-ops-auth-parser.mjs` to consume this block and pass
matching SQL patterns in staged files. Until that SPEC ships, the
declaration is documentation only — Daniel `--no-verify` chat go-ahead
remains required.
```

**Rationale:** Today the §Destructive Operations section is free-form prose. The auth-parser handles file-deletes only (via path/basename/glob match). Adding a machine-readable block in the SPEC template — even if the parser can't consume it yet — closes the documentation loop. Once the parser SPEC ships, every existing destructive-SQL SPEC retroactively has consumable authorization data.

**Acceptance test:** Next destructive-SQL SPEC includes the YAML block in §Destructive Operations. After F-1's NEW_SPEC ships, the hook recognizes the block and passes matching commits without `--no-verify`.

**Derived from:** my §2 weakness #2 + F-1.

### Two `opticup-executor` (executor skill) proposals

#### P-EXEC-1 — Pre-`apply_migration` destructive-ops gate simulation against the staged migration file

**Anchor:** `opticup-executor` SKILL.md §"DB Pre-Flight Check (Step 1.5)" — add sub-bullet:

```
- **Destructive-pattern gate simulation** (when migration file contains
  DROP/TRUNCATE/ALTER...DROP/etc.):
  ```
  git add <migration-file>
  node scripts/checks/destructive-ops-declared.mjs
  git reset HEAD <migration-file>  # un-stage; restore for proper commit later
  ```
  If exit ≠ 0 BEFORE apply, STOP and escalate. Avoids the apply→divergence
  trap (DB updated but commit blocked, source control + DB out of sync).
```

**Rationale:** Executor applied the migration successfully, THEN discovered the commit was blocked. Result: DB and source control temporarily diverged; rollback path itself trips the same hook. A 30-second pre-apply gate simulation would have surfaced the block at zero-cost (DB still in original state) and let the Executor escalate before ANY DB change.

**Source:** my §3 weakness #1.

#### P-EXEC-2 — Write FINDINGS.md EARLIER (after first surface-able finding), not at retrospective time

**Anchor:** `opticup-executor` SKILL.md §"Retrospective Files (mandatory)" — modify the FINDINGS.md timing guidance:

```
FINDINGS.md should be created EARLY in the run — as soon as the first
surface-able finding is detected. Initialize the file with `# FINDINGS — <SPEC>`
+ section template. Append each finding as it surfaces. This avoids the
"harness restriction on creating sibling files mid-run" failure mode and
ensures findings have detailed real-time context (not retrospective-only
summary).
```

**Rationale:** Executor reported a harness restriction on creating `FINDINGS.md` mid-run, so they inlined findings into EXECUTION_REPORT §13. The Foreman had to extract them to a separate file at closure. Writing FINDINGS.md as a stub at the START of the run (before any finding surfaces) and appending throughout avoids both the restriction AND the loss of real-time context.

**Source:** my §3 weakness #2.

## 10. Verdict (closing)

🟡 **CLOSED-WITH-FOLLOWUPS — SPEC goal fully achieved; one architectural NEW_SPEC queued for governance infrastructure.**

- **5 commits on `origin/develop`** (`6ce37cf` → `845a6a9`).
- **DB:** 4 new `platform_admin_bypass` policies live, verified by Reviewer + Tester independently.
- **Tier C VFV:** 8/8 PASS. 4 positive (platform admin INSERT global rows succeeds) + 4 negative (tenant manager INSERT global rows fails 403). Pattern empirically validated.
- **Stage 2A T-BLOCK-2:** RESOLVED. Stage 2A's 4 creation modals are functionally unblocked at the DB layer.
- **0 client-side code changes** (S-NO-CLIENT-CHANGES).
- **3 findings:** F-1 HIGH → NEW_SPEC `M1_5_IRON_RULE_32_HOOK_SQL_PATTERN_AUTHORIZATION` queued; F-PRE-1 INFO + F-2 LOW → TECH_DEBT / bundle.
- **2 author + 2 executor improvement proposals** harvested, all with concrete anchors + acceptance tests.
- **Iron Rule 32 bypass:** Daniel granted explicit one-time `--no-verify` chat go-ahead, documented in 4 commit messages (`dbbbcf3` / `4a3077b` / `0506208` / `845a6a9`). This is the only authorized bypass channel; the NEW_SPEC above closes the gap permanently.

**Strategic next step:** Stage 2B (Excel import dialog) is now the next viable build per the 5-stage plan. Architect to author Brief when ready.

---

_Authored 2026-05-18 night (IDT) by opticup-strategic (Foreman). Pipeline closed — lock release follows this commit._
