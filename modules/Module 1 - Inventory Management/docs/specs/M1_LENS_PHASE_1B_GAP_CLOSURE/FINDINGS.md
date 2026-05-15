# FINDINGS — M1_LENS_PHASE_1B_GAP_CLOSURE

> Author: opticup-executor (2026-05-15 evening)
> Severities: INFO / LOW / MEDIUM / HIGH / CRITICAL.
> Disposition recommendations: NEW_SPEC / TECH_DEBT / DISMISS.

---

## F-1 — Concurrent-Pipeline cross-commit pollution (LOW)

**Location:** Git history, commit `8f6969b feat(m4): add fb-capi-dispatch Edge Function`.

**Description:** During this Pipeline's C1 (open SPEC) commit attempt, a concurrent M4 Pipeline (different agent, same git config user `OpticaLis`) ran `git add` over the working tree and absorbed my newly-staged `SPEC.md` (856 lines) into THEIR commit `8f6969b`. The commit message describes the M4 EF feature only; SPEC.md content is intact but mis-attributed in git archeology. Two sibling files (`MIGRATION.md` + `ROLLBACK.md`) were untracked at the moment of the race and survived; I committed them separately as `73be384` (C1').

**Root cause:** Cross-session race on `.git/index`. Both sessions had read-write access to the same working tree at the same time. The other session's `git add` widened scope unexpectedly (likely `git add -A` or no-pathspec wildcard).

**Impact:** Cosmetic only. SPEC.md content is correct + on develop. Future archeology will be confusing for anyone searching for `M1_LENS_PHASE_1B_GAP_CLOSURE` in commit-message search.

**Recommended disposition:** **NEW_SPEC `GIT_CROSS_SESSION_RACE_PREVENTION`** (severity LOW) — propose an advisory `.git/index.lock` watchdog or pre-commit ID check to detect cross-session interleaved adds. OR: **DISMISS** if Cowork-VM-rotation drift is the only documented git contention mode and cross-session adds within the same machine are considered out-of-scope for project tooling.

---

## F-2 — `record_adjustment_found` vs `record_adjustment_lost` pattern asymmetry (MEDIUM)

**Location:** `pg_proc` — both functions.

**Description:** Per §1.5 D5 of the SPEC, `record_adjustment_found` (Phase 1A) uses free-text `p_reason text` and passes `v_lot_id` as `p_adjustment_id` to `record_stock_movement` (a hack to satisfy `stock_movement_exactly_one_source` because `stock_adjustment` table didn't exist yet). `record_adjustment_lost` (shipped today) uses `p_reason_id uuid` FK to `stock_adjustment_reason` and passes the real `stock_adjustment.id` to `record_stock_movement`. Existing `adjustment_found` stock_movement rows have `stock_lot.id` sitting in `adjustment_id` column — a data-hygiene drift from before `stock_adjustment` existed.

**Impact:** Asymmetric data shape between the two sibling RPCs. Foreign-key integrity on `stock_movement.adjustment_id → stock_adjustment.id` is impossible to add today because existing `adjustment_found` rows would violate it. M9 reporting / D-M1-10 reconciliation surfaces will show "adjustment_found" rows with adjustment_id pointing at stock_lot.id, not stock_adjustment.id.

**Recommended disposition:** **NEW_SPEC `M1_LENS_ADJUSTMENT_RPC_HARMONIZATION`** (severity MEDIUM). Scope:

1. Backfill `stock_adjustment` rows for existing `adjustment_found` `stock_movement` rows (one INSERT per movement). Replace `adjustment_id` to point at new stock_adjustment.id instead of stock_lot.id.
2. CREATE OR REPLACE `record_adjustment_found` to use the new `stock_adjustment_reason` FK pattern (mirror `_lost`'s shape).
3. ADD FK constraint `stock_movement.adjustment_id REFERENCES stock_adjustment(id)`.
4. Smoke: re-run an `adjustment_found` smoke + verify the FK is honored end-to-end.

**Triggers:** Before M7 (Orders) build starts and depends on accurate `stock_movement.adjustment_id` FK semantics. Foreman authors.

---

## F-3 — `purchase_receipt.discrepancy_status` previously absent on parent (INFO, resolved)

**Location:** `purchase_receipt` table.

**Description:** Phase 1A delivered `discrepancy_qty` + `discrepancy_status` + `discrepancy_reason` columns on `purchase_receipt_line` (per D-M1-10). It did NOT add the aggregate `discrepancy_status` column to the parent `purchase_receipt` table. SPEC §2.1 step 5 assumed the column existed; smoke-time pre-flight surfaced the gap. I added the column ad-hoc as Block 4c (ALTER TABLE ADD COLUMN IF NOT EXISTS — additive, non-destructive).

**Impact:** Resolved in this Pipeline. The aggregate field is now writable and populated by `m1_create_receipt_from_box`.

**Recommended disposition:** **DISMISS** (resolved in this Pipeline). Document in `docs/GLOBAL_SCHEMA.sql` at Foreman Integration Ceremony.

---

## F-4 — Iron Rule 32 hook strictness on multi-line headings (INFO)

**Location:** `scripts/checks/destructive-ops-declared.mjs` (Iron Rule 32 enforcement).

**Description:** SPEC §4 heading was originally `## 4. Destructive Operations (Iron Rule 32)`. The hook's regex requires exactly `## Destructive Operations` or `## 4. Destructive Operations` (no trailing text). My first commit attempt failed verify with "missing heading"; I had to trim the parenthetical. The hook does not match `^## (\d\. )?Destructive Operations.*$` — only matches when the heading line ENDS at "Destructive Operations".

**Impact:** Cost ~30 seconds of friction (one Edit + re-stage + re-verify). Could matter cumulatively across many SPECs.

**Recommended disposition:** **TECH_DEBT entry `IRON_RULE_32_HOOK_HEADING_RELAXATION`** (severity INFO). Either relax the regex to allow trailing text, or document the exact heading format in `SPEC_TEMPLATE.md`.

---

## F-5 — `record_stock_movement` does not have service_role bypass (INFO)

**Location:** `record_stock_movement` body (Phase 1A).

**Description:** `record_stock_movement` uses `IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN RAISE 42501` — no service_role bypass clause. For SECURITY_HOTFIX_2-style Block A pattern, service_role calls would still need a `tenant_id` claim in the JWT (which they get from the API layer typically). My `record_adjustment_lost` matched this pattern for sibling consistency.

**Impact:** Service-role-direct calls to `record_stock_movement` (e.g., backfill scripts) must SET `request.jwt.claims` first. This is the project convention. Not a defect; just non-obvious for new contributors.

**Recommended disposition:** **DISMISS** (project convention, not a defect). Document in `docs/CONVENTIONS.md` at Foreman Integration Ceremony.

---

*End of FINDINGS. 5 items: 1 LOW + 1 MEDIUM (NEW_SPEC needed) + 2 INFO (dismiss or TECH_DEBT) + 1 INFO resolved in-pipeline.*
