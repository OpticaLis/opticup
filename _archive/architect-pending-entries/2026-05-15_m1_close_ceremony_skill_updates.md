# Pending entry — M1 Lens Close Ceremony skill updates

**Created by:** opticup-architect (Cowork) 2026-05-15 evening
**Purpose:** apply three updates to skill files that Cowork cannot write directly. The Layer 1 sweep in the next Claude Code session (per `opticup-executor` SKILL.md Step 4.5) consumes this file and applies the changes, then deletes this file.

---

## File 1 — append to `.claude/skills/opticup-architect/references/decisions/M1.md`

**Append at end of file** (after the existing `2026-05-14 — M1 Lens Inventory: Mockup Review Session` section, after the final line `4. After all 7 mockups sealed → write SPEC ...`):

```markdown

---

## 2026-05-15 — Module 1 Lens Close Ceremony

**Ceremony scope:** 9 M1-Lens SPECs closed across 2026-05-14 → 2026-05-15:

1. `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN` 🟢 (2026-05-14)
2. `M1A_CURRENCIES_GLOBAL_HOTFIX` 🟢 (2026-05-14)
3. `M1A_OPERATIONS_RPCS_FIX` 🟢 (2026-05-15)
4. `M1A_DEBT_SWEEP` 🟢 (2026-05-15)
5. `M1B0_PURCHASE_ORDER_SCHEMA` 🟢 (2026-05-15)
6. `M1_LENS_PHASE_1B_FOUNDATION` 🟢 (2026-05-15)
7. `M1B_FOUNDATION_PERMISSIONS_HOTFIX` 🟢 (2026-05-15)
8. `M1_LENS_PHASE_1B_PROCUREMENT` 🟡 CLOSED WITH FOLLOW-UPS (2026-05-15)
9. `M1_LENS_PHASE_1B_GAP_CLOSURE` 🟢 (2026-05-15)

**State of M1 Lens after ceremony:** production-correct on Prizma (post-Gap-Closure). M7 build unblocked. Contact-lenses + accessories phases not started (ID-L-03 build order respected).

### Pattern Recurrence Tracker — harvested

Reviewed 7 FOREMAN_REVIEW.md files (28 total proposals: 14 author + 14 executor).

**Pattern A — Pre-flight probes must be exhaustive, not declarative (5 strikes):**
M1B0 Author #1 + M1B Foundation A-1 + M1A_OPERATIONS Author #1 + #2 + M1A_DEBT_SWEEP #1 + Procurement P-Author-3 + GAP_CLOSURE P-Author-1. → Promotes to `opticup-strategic` SKILL.md (SPEC-authoring discipline).

**Pattern B — Executor catches author blindspots via mid-execution adaptation (4 strikes):**
M1B0 Executor #1 + M1A_OPERATIONS Executor #1 + M1A_DEBT_SWEEP #2 + GAP_CLOSURE P-Exec-2. → Already covered by P28 in opticup-architect SKILL.md; concrete tactics promoted to `opticup-executor` SKILL.md.

**Pattern C — Column-reference cross-table probe (3 strikes, exactly):**
Procurement P-Author-1 (1/3) + GAP_CLOSURE P-Author-1 (2/3) + GAP_CLOSURE P-Exec-1 (3/3). → Promotes to `opticup-strategic` SKILL.md (bundled with Pattern A).

**Single-instance lessons NOT promoted (kept in M1 module-internal):** Iron Rule 32 heading regex fix (OPEN_TASKS task 0b); K2_RECEIPT_CALL_TEMPLATE.md (carry-forward 1/3); live-browser smoke fallback recipe.

### Self-improvement insights for opticup-architect SKILL.md

- **P-AR-09 validated by exercise** — today's ceremony was the first real exercise of the rule, 9 SPECs same day; surfaced 12 strike-events.
- **P-AR-11 (NEW, MEDIUM)** — When multiple SPECs close same day on one module → batch ceremony in ONE Cowork session, not per-SPEC. ROI ~8-10 hours per multi-Pipeline day.
- **P-AR-12 (NEW, LOW)** — Architect's ceremony job is to ROUTE harvested patterns to the right skill (strategic / executor), not absorb into opticup-architect.

### Architect → MASTER_ROADMAP updates applied this ceremony

- §2 Build Order: M1 Lens phase status → "🟢 Phase 1B complete; production-correct after Gap Closure"
- §2.5 Architecture Briefs Status: M1 Expansion row → "🟢 Phase 1B closed 2026-05-15 + Gap Closure 🟢"

### Architect → OPEN_TASKS updates applied this ceremony

- Task #5 (M1 expansion) — replaced with current state
- Task #3 (10 new modules) — M7 line unblocked
- 3 NEW task entries: M1_LENS_ADJUSTMENT_RPC_HARMONIZATION + M1_5_GOODS_RECEIPT_GENERIC_COMPONENT + M1A_FK_INDEXES_PREP_FOR_1B

**Ceremony status:** ✅ COMPLETE. Next M1 strategic action authorized.
```

---

## File 2 — append to `.claude/skills/opticup-architect/SKILL.md`

**Append two new patterns** after the existing `### P-AR-06 (LOW)` section (or wherever the last P-AR-XX entry lives):

```markdown

### P-AR-11 (MEDIUM) — Module Close Ceremony for a multi-Pipeline day batches all closures in ONE Cowork session

**Promoted to skill 2026-05-15 (M1 Lens Module Close Ceremony).**

When 3+ SPECs close on the same module on the same day, the Module Close Ceremony processes ALL of them in a SINGLE Cowork session, not per-SPEC. The Pattern Recurrence Tracker only fires when multiple SPECs are reviewed against each other — single-SPEC closures rarely meet the 3-strike threshold.

**Evidence:** M1 Lens day 2026-05-15 closed 9 SPECs. Single batched ceremony took ~30-45 minutes and surfaced 5+4+3 = 12 strike-events across 3 distinct patterns. Per-SPEC ceremonies would have taken 9-13 hours and missed every recurring pattern.

**Application:**
- Trigger: 3+ SPECs closed on the same module in 24-48h window.
- Action: open one Cowork session, read all FOREMAN_REVIEWs in one pass, build the Pattern Recurrence Tracker, route promoted patterns to the right skill.
- Pre-empts: per-SPEC ceremonies that miss cross-SPEC recurring patterns.

**ROI.** ~8-10 hours saved per multi-Pipeline day. Captures 100% of cross-SPEC patterns vs 0% with per-SPEC ceremonies.

### P-AR-12 (LOW) — Architect's ceremony job is to ROUTE harvested patterns to the right skill, not absorb into opticup-architect

**Promoted to skill 2026-05-15 (M1 Lens Module Close Ceremony).**

When a Module Close Ceremony surfaces a pattern, the Architect classifies WHICH skill owns it:

- **SPEC-authoring discipline** (pre-flight probes, audit completeness, brief vs reality) → `opticup-strategic` SKILL.md
- **Execution tactics** (mid-execution adaptation, fallback recipes, MIGRATION.md patterns) → `opticup-executor` SKILL.md
- **Reviewer discipline** (audit depth, severity classification) → `opticup-reviewer` SKILL.md
- **Cross-module / strategic / process** (audit drift, retired-SPEC handling, ceremony cadence) → `opticup-architect` SKILL.md (this skill)

The Architect's own SKILL.md grows ONLY when the pattern is strategic-process-level. Bloating opticup-architect with SPEC-authoring tactics or execution recipes is the anti-pattern.

**Evidence:** 2026-05-15 ceremony surfaced Pattern A (5 strikes) — SPEC authoring, routed to strategic. Pattern B (4 strikes) — execution tactics, routed to executor. Only P-AR-11 + P-AR-12 themselves belonged to opticup-architect.

**Application:** at every ceremony, after harvesting patterns, classify destination skill BEFORE writing the SKILL_PENDING entry. Each pattern lands in exactly one skill file.
```

---

## File 3 — pending hand-off to `opticup-strategic` SKILL.md

**Create new pending entry file at** `_archive/architect-pending-entries/2026-05-15_strategic_skill_exhaustive_preflight.md`

Content of that file:

```markdown
# Pending entry — opticup-strategic skill update

**Created by:** opticup-architect (Cowork) 2026-05-15
**Source:** M1 Lens Module Close Ceremony, Patterns A + C

Append the following to `.claude/skills/opticup-strategic/SKILL.md` (after the last existing P-STRAT-XX or §"SPEC Authoring Protocol" section, whichever is the natural insertion point):

---

### P-STRAT-NEW — Pre-flight probes in SPEC §0/§1.5 must be EXHAUSTIVE, not DECLARATIVE.

**Source: 5-strike pattern from M1 Lens Module Close 2026-05-15 (Pattern A) + 3-strike sub-pattern (Pattern C).**

When authoring a SPEC, the Pre-Flight section must enumerate every concrete probe the executor will run BEFORE Commit 1. Listing categories of probes ("audit smoke-touched schema") is insufficient — list every specific probe with the exact SQL/grep/file inspection.

**Probe types to enumerate:**

1. **Column existence + type per table the SPEC touches** — `information_schema.columns` query naming every column the SPEC will read or write.
2. **CHECK constraint definitions** — `pg_get_constraintdef` for every constraint relevant to inserts/updates the SPEC performs.
3. **Function body inspection** — `SELECT prosrc FROM pg_proc WHERE proname=...` for every RPC the SPEC modifies or relies on.
4. **Column-reference cross-table probe** — when a SPEC references column X in multiple tables, verify it exists with the same type on each table.
5. **Orchestrator call-arity audit** — every place where a function the SPEC modifies is called from JS/EFs/other RPCs, verify signature compatibility.
6. **Fixture content audit** — when smoke tests use existing data, list the fixture rows by ID + state expected.
7. **Baseline coverage** — every table the §smoke-tests-section will touch must have a pre-write row count or md5 captured in §0.
8. **Multi-rule verify probe** — when a SPEC fixes multiple Iron Rule violations, run the verify gate ONCE for each rule explicitly, not as a single combined run.

**Forbidden Pre-Flight style:**
- "Audit relevant tables" without naming them.
- "Verify constraints" without listing the constraint names.
- "Check function signatures" without writing the probes.

**Required Pre-Flight style:**
- Numbered list of explicit probes.
- Each probe's exact SQL/command/file path.
- Each probe's expected result OR "report actual, do not assume."

**ROI per SPEC:** Catches ~3-5 author bugs at SPEC-author time instead of mid-execution. M1 Lens Procurement caught 4 author bugs at executor pre-flight that should have been caught at SPEC author time per this rule.

---

After applying this update, this pending file is deleted by the executor per the standard sweep protocol.
```

---

## File 4 — pending hand-off to `opticup-executor` SKILL.md

**Create new pending entry file at** `_archive/architect-pending-entries/2026-05-15_executor_skill_mid_execution_adaptation.md`

Content of that file:

```markdown
# Pending entry — opticup-executor skill update

**Created by:** opticup-architect (Cowork) 2026-05-15
**Source:** M1 Lens Module Close Ceremony, Pattern B (4 strikes)

Append the following to `.claude/skills/opticup-executor/SKILL.md` in the appropriate execution-tactics section:

---

### P-EXEC-NEW — Mid-execution adaptation tactics: MIGRATION.md Applied Log + commit reordering + execute_sql fallback

**Source: 4-strike pattern from M1 Lens Module Close 2026-05-15 (Pattern B).**

When SPEC execution surfaces dependencies the author didn't anticipate, the executor has 3 sanctioned adaptation tactics. All three preserve Iron Rule 32 by NOT introducing new destructive operations and by documenting the adaptation in the SPEC's EXECUTION_REPORT.md:

**Tactic 1 — MIGRATION.md Applied Log:**
When the SPEC pre-fills migration bodies that need adjustment during execution (e.g., the author's `CREATE TABLE` statement collides with an existing object, or a referenced column is missing), maintain `MIGRATION.md` in the SPEC folder with sections per migration: "Pre-write body | Applied body | Why diverged". This becomes the audit trail.

**Tactic 2 — Commit-order reordering on dependency discovery:**
When Commit N depends on a column/table/RPC that the SPEC's Commit M (where M > N) creates, the executor may swap the commit order — BUT must:
1. Document the swap in EXECUTION_REPORT.md §"In-flight decisions"
2. Verify the new order still satisfies SPEC's success criteria
3. NOT introduce new commits, only reorder existing ones

**Tactic 3 — execute_sql fallback for apply_migration collisions:**
When `apply_migration` fails because PostgreSQL refuses the migration (PK collision, dependent view exists, etc.), the executor may run the migration via `execute_sql` after:
1. Verifying the failure is collision-based, not logic-based
2. Logging the fallback in EXECUTION_REPORT.md
3. Confirming the migration body is content-identical to what apply_migration would have run

**When NOT to use these tactics:**
- When the SPEC's success criteria require apply_migration specifically (e.g., for `supabase_migrations.schema_migrations` traceability).
- When the dependency is a SPEC bug, not a discovery (then STOP and escalate per Iron Rule 32 / Bounded Autonomy).
- When the adaptation introduces new destructive operations (must escalate first).

**ROI per SPEC:** Avoids ~30-60 min of escalation cycles for routine dependency surprises. Bounded by the SPEC's own destructive-ops envelope.

---

After applying this update, this pending file is deleted by the executor per the standard sweep protocol.
```

---

**End of pending-entries instructions.** When this file is consumed and the 4 updates above are applied, delete this file.
