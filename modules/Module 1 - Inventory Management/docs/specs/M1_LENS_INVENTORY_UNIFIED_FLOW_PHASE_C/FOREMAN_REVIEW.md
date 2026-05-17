# FOREMAN_REVIEW — M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_C

**Reviewer:** opticup-strategic (Foreman), Claude Code, 2026-05-18 evening
**SPEC commit range:** `b3c8a31` (C-C0 seed) → `6b88573` (TEST_REPORT) — 8 commits
**Verdict:** 🟡 **CLOSED WITH FOLLOW-UPS** — UI scaffolding shipped clean; 2 HIGH findings (F-4, F-5) materially affect end-to-end behavior; Phase D should NOT start until F-4 is resolved (Phase D's filter is meaningless without undocumented receipts being creatable)

---

## 1. SPEC Quality Audit

| Aspect | Verdict | Notes |
|--------|---------|-------|
| Goal stated | ✅ | §1 clear |
| Measurable criteria | ✅ | 20 criteria split per-flow + cross-phase deferred row 11.X |
| Cross-Reference Check | ✅ | §0.C 0 collisions + 3 Brief drifts resolved |
| Runtime semantics rehearsed | ⚠️ | §0.D rehearsed RPC signature change BUT did NOT probe downstream cascade (`supplier_debt.delivery_note_number` NOT NULL — caught at Tier C, not SPEC author). This is the lesson behind P-AUTHOR-1 below. |
| Baselines pinned | ✅ | §0.E 5 symbols |
| Heading format | ✅ | `## 4. Destructive Operations` |
| §4 destructive ops declared | ✅ then ⚠️ amended | Op #1.5 (DROP function) + op #1.6 (ALTER COLUMN delivery_note_number) amended mid-execution under DM-1 + DM-3. Both amendments documented; Iron Rule 32 hook accepted each commit. |

**SPEC quality score: 7.5/10.** Strong structure + Cross-Reference Check, but §5.3 Runtime Semantics Rehearsal missed the downstream cascade probe — the rule says rehearse for `function header / RLS / view`, doesn't explicitly say "rehearse downstream column NOT NULL propagation". Should be amended.

---

## 2. Execution Quality Audit

| Aspect | Verdict | Notes |
|--------|---------|-------|
| Followed §4 declared ops | ✅ with amendments | DM-1 (DROP function) + DM-3 (ALTER COLUMN delivery_note_number) both amended SPEC §4 BEFORE committing — clean autonomy boundary respected |
| Commit hygiene | ✅ | 8 single-concern commits |
| Real-time decisions documented | ✅ | DM-1..DM-5 all in EXECUTION_REPORT §5 |
| Scope-cut decisions handled honestly | ✅ | C-C4 deferral (DM-2) properly documented with rationale + follow-up SPEC stub; not silently dropped |
| Tier C rigor | ✅ | Tester didn't pass when only 1 of 3 flows verified end-to-end; verdict 🟡 PARTIAL with explicit per-flow blocker attribution |
| Cleanup discipline | ✅ | Test purchase_receipt + cascades deleted post-test |
| Iron Rule self-audit | ✅ | 13 rows, 12 PASS + 1 PASS-with-context (Rule 12 file sizes — cohesion-justified) |

**Foreman spot-checks:**
- ✅ RPC signature: `pg_get_function_arguments` confirms 10 args, both new params present, `overload_count=1` (DM-1 fix verified).
- ✅ `delivery_note_number` NOT NULL dropped + CHECK constraint added (DM-3 fix verified).
- ✅ Demo DB row counts back to baseline post-cleanup (no test residue).
- ✅ Prizma row delta = 0 across all SPEC §3 row 16 tables.

**Execution quality score: 9.5/10.** Mid-execution amendments handled cleanly; honest Tier C verdict; thorough findings documentation.

---

## 3. Findings Processing

### F-1 (MEDIUM) — Full Receive modal (C-C4) deferred

**Foreman disposition:** Accept deferral. File follow-up SPECs as proposed:
1. **`M1_LENS_GOODS_RECEIPT_SCOPED_IDS`** (prerequisite, ~45-60 min) — refactor `lens-goods-receipt-partial.html` to use `gr-` prefixed DOM IDs; update all module JS files referencing those IDs.
2. **`M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_C_FULL_RECEIVE_MODAL`** (after the prerequisite, ~30 min) — implement the modal via fetch+inject pattern on the inventory page.

Existing `tab=goods-receipt` deep-link continues to serve the Full Receive workflow unchanged; no production regression.

### F-2 (LOW) — File-size warnings

**Foreman disposition:** Accept executor's "defer to natural splitting boundary" recommendation. Add to TECH_DEBT as 3 entries (`T-MODAL-SHOWS-SPLIT`, `T-INVENTORY-SHELL-LENS-SPLIT`, `T-LENS-INVENTORY-MODALS-CSS-SPLIT`) — all triggered by next addition to each file.

### F-3 (LOW) — Phase A FIELD_MAP retroactive gap

**Foreman disposition:** Bundle into Phase D (which builds the unified-log surface that consumes `manager_review_status` — natural fit). Phase D's SPEC must include adding 6 FIELD_MAP entries.

### F-4 (HIGH) — Cascading NOT NULL blocks undocumented flow end-to-end

**Foreman disposition:** **BLOCKING for Phase D.** Phase D's "ללא תעודה" filter is functionally useless without F-4 fix — there can be no `is_documented=false` rows to filter. Two paths:
- **Path A (mechanical):** relax `supplier_debt.delivery_note_number` to NULL + matching CHECK.
- **Path B (business-aligned, RECOMMENDED):** defer `supplier_debt` creation entirely when `is_documented=false`; debt is created only when `manager_review_status='approved'` flips via Phase D's new RPC. This aligns with the audit-trail intent of Phase A (manager review IS the gate for debt creation).

Path B is materially better for the SaaS use case + integrates with Phase D's manager-review action. **Daniel-level decision pending.** New SPEC stub: `M1_LENS_UNDOCUMENTED_DEBT_CASCADE_FIX` (Path B, ~30-45 min).

### F-5 (HIGH) — Pre-existing RPC trigger integer-cast error on real variant_id

**Foreman disposition:** **NOT BLOCKING for Phase D directly** (Phase D consumes existing receipt rows; doesn't create new ones with real variants). But IS blocking for Phase C's everyday user-facing workflow (scan a barcode + add stock to a real cell). Diagnostic SPEC `M1_DIAGNOSE_RECEIPT_INTEGER_CAST` (~30-45 min) needed in parallel.

---

## 4. Improvement Proposals

### Author-skill (opticup-strategic)

#### P-AUTHOR-1 — Extend §5.3 Runtime Semantics Rehearsal to include downstream-column NOT NULL probe

**Where:** `.claude/skills/opticup-strategic/SKILL.md` → "Step 1.5" §5.3 sub-section, new bullet.

**Proposal:** Add:

> **Downstream cascade NOT NULL probe (SPECs that ADD a column whose semantic intent is to allow NULL in some cases — e.g. audit columns, optional FK columns).** When a SPEC adds a column whose business intent is "optional in some cases" (e.g. `is_documented=false → delivery_note_number can be NULL`), the rehearsal MUST probe DOWNSTREAM tables for matching constraint relaxations. Specifically: `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name IN (<downstream_tables>) AND column_name = '<the_propagated_column>'`. If any downstream column is NOT NULL where the upstream is now optionally-NULL → the SPEC MUST either include the downstream relaxation OR explicitly accept the constraint (e.g. "downstream debt creation is deferred when is_documented=false"). Source: M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_C F-4 (2026-05-18) — Phase A added optional-NULL audit column intent but didn't probe `supplier_debt.delivery_note_number` NOT NULL cascade; discovered at Phase C Tier C, blocked the undocumented flow end-to-end.

**Rationale:** F-4 was a Phase A oversight surfaced only at Phase C Tier C. ~30 min total wasted across both phases. A 1-minute SQL probe at SPEC author time prevents it.

#### P-AUTHOR-2 — Pre-Tier-C demo data sanity check section in SPECs

**Where:** `.claude/skills/opticup-strategic/SKILL.md` → "Step 3 — Populate the Folder with SPEC.md", new sub-section "Tier C demo data probe".

**Proposal:** When a SPEC's Tier C requires a specific demo data shape (e.g., "scan a real variant barcode"), add a §3 row that probes the demo data BEFORE submitting the SPEC:

> **Demo data probe (SPECs with Tier C that hit real DB data).** Author MUST run a probe like `SELECT count(*) FROM <table> WHERE <tier_c_filter>` at SPEC author time to confirm the demo data shape Tier C assumes actually exists. If demo data is missing or in wrong format → file a `M1_SEED_DEMO_<topic>` SPEC as prerequisite. Source: M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_C F-5 (2026-05-18) — Tier C assumed real variant_ids would write cleanly; pre-existing trigger fires `PO300005-1` integer cast error on demo data seeded TODAY by another Pipeline. Author should have probed `SELECT * FROM stock_lot WHERE ...` and run a sample RPC dry call.

**Rationale:** F-5 surfaced at Tier C with substantial chat noise + scope-cut decision. ~10 min probe at SPEC author time would have caught it.

### Executor-skill (opticup-executor)

P-EXEC-1 + P-EXEC-2 already filed in EXECUTION_REPORT §9 (Postgres CREATE OR REPLACE overload trap + Cross-partial DOM ID collision pre-flight). Foreman concurs; both apply at next opticup-strategic session.

---

## 5. Master-Doc Update Checklist

| Doc | Status |
|-----|--------|
| `MASTER_ROADMAP.md` | N/A — Pipeline mid-flight |
| `docs/GLOBAL_MAP.md` | NO (deferred to Pipeline-close Integration Ceremony — m1_create_receipt_from_box signature change to merge) |
| `docs/GLOBAL_SCHEMA.sql` | NO (deferred to Pipeline close — new RPC signature + ALTER + CHECK) |
| `docs/DB_TABLES_REFERENCE.md` | NO (no new tables) |
| M1 `MODULE_MAP.md` | NO (deferred — new `lens-inventory-quick-scan.js` to register) |
| M1 `db-schema.sql` | YES (+31 lines Phase 2C section) |
| M1 `SESSION_CONTEXT.md` | YES (this Foreman commit) |
| `TECH_DEBT.md` | PENDING — 3 file-size split entries (F-2) |

---

## 6. Pipeline Continuity

### Recommended action

**PAUSE Pipeline before Phase D.** F-4 is a hard blocker — without it, Phase D's "ללא תעודה" filter is functionally meaningless (no rows to filter). Sequence:

1. **`M1_LENS_UNDOCUMENTED_DEBT_CASCADE_FIX`** (Path B, ~30-45 min, Daniel approves the business design first) — defer supplier_debt creation when is_documented=false.
2. **`M1_DIAGNOSE_RECEIPT_INTEGER_CAST`** (~30-45 min, in parallel) — diagnose + fix F-5 so Phase C's variant-based add works.
3. **THEN Phase D** — unified log filter + manager-review modal + `mark_receipt_reviewed` RPC.

### Why not continue to Phase D immediately?

- Phase D ships a UI surface (filter pill + manager-review column + action button) gated on `is_documented=false` rows existing. With F-4 blocking creation, the filter shows 0 rows on demo + Prizma indefinitely. Wasted Tier C cycle.
- Phase D's `mark_receipt_reviewed` RPC depends on Path B semantics decision (does it ALSO create the deferred supplier_debt on approval? Or is that orthogonal?). Authoring Phase D's RPC without F-4 decided risks rework.

### Why Phase C 🟡 not 🟢?

- 1 deferred flow (C-C4 Full Receive modal — DM-2, scope creep concern).
- 2 blocked happy-path verifications (F-4 + F-5).
- UI scaffolding ships clean, demonstrably functional on the variant-less manual-add path. Production-acceptable, but the user-experience win the Brief promised needs F-4 + F-5 to land first.

---

## 7. Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

SPEC quality 7.5/10. Execution quality 9.5/10. Phase C ships the UI surface (RPC extension, Manual Add panel wiring, Quick Scan drawer) clean. Tier C exposed 2 HIGH cascade issues (F-4 + F-5) inherited from upstream design (Phase A + pre-existing demo state) that block the user-facing happy path. Phase D should NOT start until F-4 is resolved.

---

*Foreman close 2026-05-18 evening. Pipeline pause recommended pending Daniel decision on F-4 path (A mechanical / B business-aligned).*
