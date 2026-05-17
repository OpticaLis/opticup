# FOREMAN_REVIEW — M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A

**Reviewer:** opticup-strategic (Foreman), Claude Code, 2026-05-18 evening
**SPEC start commit:** `5a2ed41` (C-A0)
**SPEC end commit:** `746976a` (C-A2)
**Commit range:** 3 commits (5a2ed41 → cc16997 → 746976a)
**Verdict:** 🟢 **CLOSED** (executor scope) — Pipeline pauses awaiting Daniel decision on Prizma backfill

---

## 1. SPEC Quality Audit

| Aspect | Verdict | Notes |
|--------|---------|-------|
| Goal clearly stated | ✅ | §1 — DB substrate for Pipeline (5 sentences max) |
| Success criteria measurable | ✅ | 16 criteria, each with EXACT expected value + verify command/query |
| Autonomy envelope defined | ✅ | §4 declared destructive ops + §5 stop triggers + §7 out-of-scope |
| Stop triggers narrow | ✅ | §5 — 7 specific triggers, all DB-state observable |
| Rollback plan present | ✅ | §6 — per-change rollback path |
| Cross-Reference Check done | ✅ | §0.C + §1.5 — 0 collisions / 9 hits resolved (live DB) |
| Runtime semantics rehearsed | ✅ | §0.D — 5 explicit rehearsals (CHECK NULL, FK SET NULL, FK NO ACTION, default backfill via PG11 metadata, ordering) |
| Brief vs DB reality | ✅ | §0.C resolved Brief's `branch_manager` to actual `manager` role; bdolach probed at AUTHOR time, not executor time |
| Pre-flight breadth | ✅ | 4 column-existence probes + supplier probe + RPC signature probe + roles probe + role_permissions structure + employees existence — comprehensive |

**SPEC defects discovered post-execution:** 1 minor — the Rule 32 hook regex strictness on heading was not pre-validated by the Foreman before sealing. Caught at executor's first commit attempt. Costs 1 minute. Documented as P-AUTHOR-1 below.

**SPEC defects in §3:** 1 minor — row 11's explanatory parenthetical said "4 granted=true" but the actual expected is 8 (= 2 roles × 2 perms × 2 tenants). The intent ("granted=true ONLY for ceo and manager") was correct; only the cross-check number in the parenthetical was off. Executor's verify query correctly returned 8 — no impact on PASS judgment. Documented as P-AUTHOR-2 below.

**SPEC quality score: 9.5/10.** High-quality SPEC; one heading-format gotcha + one explanatory-arithmetic typo that didn't impact execution.

---

## 2. Execution Quality Audit

| Aspect | Verdict | Notes |
|--------|---------|-------|
| Followed SPEC §4 declared ops | ✅ | All 11 declared ops executed; nothing outside the list |
| Commit hygiene | ✅ | 3 single-concern commits; no `git add -A`; no --amend; no --no-verify |
| Migration grouping (DM-2) | ✅ | Sensible consolidation of §4 ops #1-#9 into 3 migrations — within executor autonomy per SPEC §4 (declared ops are atomic, grouping is execution detail) |
| Brief role-name resolution (DM-3) | ✅ | Documented in EXECUTION_REPORT §5; also pre-resolved in SPEC §0.C — no executor confusion |
| COMMENT statements (DM-4) | ✅ | Added without authorization but inside zero-risk scope (Postgres COMMENT ON COLUMN is purely documentation); executor self-acknowledged as a Sentinel-friendly add |
| Iron Rule self-audit | ✅ | 9/9 rows PASS; evidence cited per row |
| Integrity gate | ✅ | exit 0 on every commit |
| Smoke 7/7 | ✅ | PASS post-C-A1 |
| Findings logged not hidden | ✅ | 2 INFO findings filed; both real, neither buried |
| Heading-format false start (D-1) | ✅ | Caught at gate, fixed in same C-A0 cycle, documented honestly in EXECUTION_REPORT §4 |

**Spot-check verification (Foreman independent re-probe):**
- ✅ `tenants.default_supplier_id` FK action confirmed `confdeltype='n'` (= SET NULL) — matches SPEC §3.1.
- ✅ CHECK constraint exact text matches SPEC §0.D rehearsal verbatim.
- ✅ Grant matrix exactly 20 rows / 8 granted=true / 12 granted=false in EXACTLY the matrix declared in SPEC §10 (ceo+manager × 2 perms × 2 tenants get true; team_lead+viewer+worker get false).
- ✅ Prizma row delta: purchase_receipt=0 (unchanged), tenants=1 (unchanged row count), permissions=85 (=83+2), role_permissions=278 (=268+10). EXACTLY matches SPEC §3 row 16.
- ✅ File sizes verified: SPEC.md 265 lines (executor self-reported 375 — see "Minor inflation" below), EXECUTION_REPORT 144 lines, FINDINGS 40 lines, db-schema.sql 2234 lines (matches +46 claim).

**Minor inflation:** EXECUTION_REPORT §3 said "SPEC.md 361 lines initial, +14 after §13.A append in C-A1 = 375 final". Actual: 265. Self-reported numbers were ~100 lines off. Not material — no decision depended on this number. Worth a P-EXEC proposal: executor should `wc -l` rather than estimate.

**Execution quality score: 9.5/10.** Clean, honest, documented, audit-trail intact. Minor self-reporting inflation on file size doesn't impact decisions.

---

## 3. Findings Processing

### F-1 (INFO) — Rule 32 hook regex strictness on SPEC heading

**Foreman disposition:** Address via P-AUTHOR-1 below (Strategic skill update — add heading-format pre-validation at Step 3 SPEC populating). Defer hook-side regex relaxation to a separate TECH_DEBT entry (5-min hook edit, but lower priority since the workaround is trivial).

**TECH_DEBT entry to file:** `T-RULE32-HOOK-REGEX-PARENS` — relax `scripts/checks/destructive-ops-declared.mjs` regex to accept descriptive parenthetical suffixes on the heading. ~3-line edit; low priority since author-side fix (P-AUTHOR-1) is durable.

### F-2 (INFO) — architect-pending-applied warning every commit

**Foreman disposition:** Resolved by Phase E per Brief §7 — pending entries sweep + skill harvest commit `chore(skills): apply pending entries`. No new action needed. Will be naturally swept at Pipeline close.

---

## 4. Improvement Proposals

### Author-skill improvements (opticup-strategic)

#### P-AUTHOR-1 — Heading-format pre-validation at SPEC seal time

**Where:** `.claude/skills/opticup-strategic/SKILL.md` — "Step 3 — Populate the Folder with SPEC.md", new bullet item

**Proposal:** Add a sub-step BEFORE Step 4 (Dispatch to Executor):

> **Step 3.5 — Heading-format pre-check.** Before sealing the SPEC.md, grep the file for the Rule 32 hook's required heading:
> ```bash
> grep -E '^## ([0-9]+\.\s+)?Destructive Operations\s*$' <SPEC.md path>
> ```
> If the grep returns nothing, the heading does not match the hook regex — edit to drop any trailing parenthetical (e.g. `(Iron Rule 32)`) BEFORE handing off to executor. Saves 1 false-start commit cycle. (Source: M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A FOREMAN_REVIEW F-1 + EXECUTION_REPORT D-1, 2026-05-18.)

**Rationale:** Caught at executor's first commit, but the hook is non-negotiable so the issue is structural. Author can pre-validate in 2 seconds; saves executor a cycle. Source: this SPEC's D-1 in EXECUTION_REPORT §4.

#### P-AUTHOR-2 — Verify arithmetic in §3 explanatory parentheticals against the actual count

**Where:** `.claude/skills/opticup-strategic/SKILL.md` — "Step 3 — Populate the Folder with SPEC.md", paragraph after the "Every SPEC MUST include" bullet list

**Proposal:** Add a one-line discipline note:

> **§3 numeric parentheticals must equal the verify query's expected output.** When a §3 row says "expect N rows" or includes inline arithmetic ("4 granted=true for 2 roles × 2 perms × 2 tenants"), the author MUST hand-compute the result and verify it matches the verify query's expected value. Inconsistent inline arithmetic erodes executor trust in the success criteria. (Source: M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A FOREMAN_REVIEW §1, 2026-05-18 — SPEC row 11 said "4" where actual is "8" = 2 roles × 2 perms × 2 tenants.)

**Rationale:** This SPEC's §3 row 11 parenthetical said "4 granted=true" but the algebra is 2 × 2 × 2 = 8. Executor correctly computed 8 in the verify query, no impact on outcome — but the SPEC's text now contains a self-contradiction. A 10-second author-side hand-compute prevents this.

### Executor-skill improvements (opticup-executor)

Per executor's own EXECUTION_REPORT §9, two proposals already filed:
- **P-EXEC-1** (Step 1 SPEC validation) — add heading-format pre-validation grep at executor side. Foreman accepts as filed; redundant with my P-AUTHOR-1 (executor proposes the same fix, just on executor side) — both layers should have the guard. Defense in depth.
- **P-EXEC-2** (Database patterns section) — codify Supabase MCP migration naming convention `<module-slug>_<spec-slug-shortened>_<purpose>`. Foreman accepts as filed; the pattern worked cleanly here (3 migrations all unambiguously named).

Additionally, Foreman adds **P-EXEC-3** below from this review's spot-check:

#### P-EXEC-3 — `wc -l` for file size claims in EXECUTION_REPORT.md

**Where:** `.claude/skills/opticup-executor/SKILL.md` — "Step 4 — Write EXECUTION_REPORT.md at the end", under "Required sections" → "What was done"

**Proposal:** Add a one-line discipline note:

> **File size claims must come from `wc -l`, not estimation.** When the EXECUTION_REPORT cites file sizes (e.g. "SPEC.md 361 lines initial, +14 after append = 375 final"), the executor MUST run `wc -l <file>` to confirm BEFORE committing the report. Estimated counts that turn out 30%+ off (as happened in this SPEC — 375 claimed vs 265 actual) undermine Foreman trust in subsequent self-reports.

**Rationale:** Spot-check this SPEC showed SPEC.md is 265 lines, not 375. The 110-line discrepancy is small in absolute terms but it's a 30% over-count. Nothing here depended on the number, but the next SPEC where Foreman uses the executor's self-reported number for downstream decisions will be at risk.

---

## 5. Master-Doc Update Checklist

| Doc | Touched this SPEC? | Update needed |
|-----|---------|---------|
| `MASTER_ROADMAP.md` | N/A | Phase A of mid-Pipeline; full Pipeline close updates this at end |
| `docs/GLOBAL_MAP.md` | N/A | No new RPCs/functions/views shipped in Phase A (the m1_create_receipt_from_box extension is Phase C; mark_receipt_reviewed is Phase D) |
| `docs/GLOBAL_SCHEMA.sql` | NO (deferred) | Will merge at Pipeline close (Integration Ceremony) — new columns, perms, grant matrix |
| `docs/DB_TABLES_REFERENCE.md` | NO (no new tables, just columns on existing) | No update needed — DB_TABLES_REFERENCE tracks tables not columns |
| M1 `MODULE_MAP.md` | NO | No new JS files; no new module functions; will be touched if Phase B/C/D add code files |
| M1 `MODULE_SPEC.md` | NO | Current state doesn't change at Phase A — UI surfaces still unchanged |
| M1 `ROADMAP.md` | NO (deferred) | Pipeline close adds a "Unified Flow" row |
| M1 `db-schema.sql` | YES | +46 lines appended in C-A1 |
| M1 `CHANGELOG.md` | NO (deferred) | Will write at Pipeline close — single block covering all 5 phases |
| M1 `SESSION_CONTEXT.md` | YES (this commit) | Will write block now |

---

## 6. Pipeline Continuity Notes

### What is blocking Phase B start
- **Daniel decision on Prizma `default_supplier_id` backfill** (escalation `2026-05-18T_M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A_PRIZMA_AUTH.md`). Three options laid out for Daniel: (1) authorize backfill to בדולח; (2) skip backfill (use Phase B settings UI later); (3) name a different supplier.
- Demo backfill is DONE — Phase B SPEC can technically proceed with full Tier C VFV on demo even if Daniel hasn't decided on Prizma yet (Brief §11 says "before continuing Phase B" but the constraint is the Prizma criterion, not the autonomous demo work).

### Foreman recommendation
Per Brief §11 explicit text ("Wait for Daniel to authorize ... before continuing Phase B"), pause Pipeline here. Daniel response unlocks Phase B SPEC authoring. If Daniel chooses option 2 (skip backfill), Phase B SPEC adds a "Prizma backfill via Phase B UI" criterion in its first SPEC §3.

### What's tracked as pending
- TECH_DEBT entry `T-RULE32-HOOK-REGEX-PARENS` (5-min hook regex relaxation, low priority).
- P-AUTHOR-1, P-AUTHOR-2, P-EXEC-3 — applied to skill files by next opticup-strategic session per Self-Improvement Mandate (or sooner if Pipeline continues in same session).

---

## 7. Verdict

🟢 **CLOSED (executor scope) — Pipeline pauses for Daniel.**

Phase A delivered exactly what Brief §3 specified, no scope creep, clean 3-commit landing. Every spot-check independently passes. SPEC quality 9.5/10, Execution quality 9.5/10. 2 INFO findings filed and dispositioned. 5 improvement proposals harvested (2 author + 3 executor) — to be applied to skill files when continued.

**Next gate:** Daniel decision on Prizma backfill. Until then, no Phase B authoring per Brief §11.

---

*Foreman close 2026-05-18 evening. Awaiting Daniel decision before Phase B.*
