# FINDINGS.md — M1B0_PURCHASE_ORDER_SCHEMA

> Discovered during execution. Each entry has severity (INFO/LOW/MEDIUM/HIGH/CRITICAL), location, description, and suggested action.

## F-1 — `vat_rates.active` column does not exist (Brief assumption diverged)

- **Severity:** LOW (caught in §0, no impact on execution)
- **Location:** Brief §6 Probe 13 (now SPEC §0 D2)
- **Description:** Brief §6 Probe 13 used `WHERE active = true` on `vat_rates`. Live schema has no `active` column — the temporal-validity axis is `effective_until IS NULL OR effective_until > CURRENT_DATE`. SPEC §0 D2 baselined this and the K2 extension code uses the correct filter.
- **Suggested action:** DISMISS. Caught + resolved at SPEC-author time. Brief is one-shot; no follow-up needed.

## F-2 — `next_po_number(uuid, text)` already exists (Brief naming collision)

- **Severity:** MEDIUM (could have caused mid-pipeline pivot if not caught in §0)
- **Location:** Brief §2 RPC #1; resolved in SPEC §0 D1.
- **Description:** Brief proposed naming the new lens-era PO-number RPC `next_po_number(p_tenant_id)`. Probe 12 surfaced a pre-existing `next_po_number(uuid, text)` SECDEF RPC serving the legacy frames-era `purchase_orders` plural table. SPEC renamed the new RPC to `next_purchase_order_number(p_tenant_id)` — Iron Rule 21 divergence per Phase 1A Open Q1 precedent.
- **Suggested action:** DISMISS for this SPEC. The §0 catch was the right outcome.

## F-3 — Both `stock_lot.purchase_order_id` + `purchase_receipt.purchase_order_id` existed as columns without FK clauses

- **Severity:** LOW (caught + fixed)
- **Location:** Probes 4 + 5; Block 4.
- **Description:** Phase 1A shipped both columns as UUID NULL without a FK target (because `purchase_order` did not exist yet). M1B0 added the FK clauses (ON DELETE SET NULL) + supporting indexes. Iron-Rule perspective: this is a phantom column pattern — not a defect, just a deferred completion.
- **Suggested action:** DISMISS. M1B0 closed the loop. Note for the Foreman: if Phase 1A had documented these as "to be FK'd in M1B0", §0 wouldn't need to discover them — could be a SESSION_CONTEXT improvement note.

## F-4 — File-size soft WARNINGS on shared.js (322) + shared-field-map.js (313)

- **Severity:** LOW
- **Location:** Commit 6 (`46ff2d2`)
- **Description:** Both files crossed the 300-line soft target while remaining below the 350 hard limit. Phase 1A lens-catalog-import (306 lines) set the soft-warn-acceptable precedent.
- **Suggested action:** TECH_DEBT entry — `M1B0-DEBT-01 — shared.js + shared-field-map.js at 322/313 lines, both ~30 lines from hard limit. Consider extraction of FIELD_MAP into per-domain sub-files in a future cleanup SPEC.` Low priority; not blocking Phase 1B.

## F-5 — `purchase_order_line.sale_order_id` FK deferred (M7 contract surface)

- **Severity:** INFO (intentional, Phase 1A precedent)
- **Location:** Block 2 (SPEC §6).
- **Description:** Column has no FK clause Day-1; will be added when M7 (Orders) ships its `sale_order(id)` table. Same pattern as Phase 1A `lab_jobs.purchase_receipt_id`. Iron Rule 16 documented in SPEC §0 Lessons-Already-Incorporated.
- **Suggested action:** DISMISS. Intentional, audited, consistent with Phase 1A precedent. Future M7 SPEC will close the loop.

## F-6 — Smoke artifacts left on demo (intentional)

- **Severity:** INFO
- **Location:** TEST_REPORT.md §Smoke artifacts.
- **Description:** Per SPEC §13 Cleanup section and Phase 1A `M1A-DEBT-04` precedent, smoke artifacts persist on demo (`abe836d2-...` PO partial / `3844a65a-...` PO cancelled / `5e3af187-...` receipt / `ab9cdc83-...` debt). Useful as Phase 1B seed.
- **Suggested action:** Extend `M1A-DEBT-04` MASTER_ROADMAP entry to include M1B0's artifacts. Phase 1B's §0 reuses or re-seeds.

## F-7 — WARN-level `authenticated_security_definer_function_executable` advisor on all 5 new RPCs

- **Severity:** INFO (project-wide pattern, not a defect)
- **Location:** Advisor scan during smoke (`get_advisors type=security`)
- **Description:** Every SECDEF function GRANTed to `authenticated` raises this advisor WARN. The project's canonical pattern (Phase 1A 10 RPCs + currencies-hotfix + M1A-Operations-Fix all do this) explicitly accepts the WARN because RLS + JWT-claim guard are the security barriers, not function-level privilege. Iron Rule 15 + Code Review pattern require this design.
- **Suggested action:** DISMISS as INFO. This is the canonical pattern. A future project-wide hardening SPEC could attempt to migrate SECDEF→SECURITY INVOKER + helper-function delegation, but it would touch every existing RPC and is far out of M1B0 scope.

---

## Disposition summary

| Finding | Severity | Disposition |
|---|---|---|
| F-1 vat_rates.active column absent | LOW | DISMISS (caught in §0) |
| F-2 next_po_number naming collision | MEDIUM | DISMISS (renamed in SPEC §0) |
| F-3 phantom Phase 1A columns | LOW | DISMISS (closed in Block 4) |
| F-4 file-size soft WARNINGs | LOW | TECH_DEBT (M1B0-DEBT-01 — propose to Foreman) |
| F-5 sale_order_id deferred FK | INFO | DISMISS (intentional, M7 precedent) |
| F-6 smoke artifacts persist | INFO | Extend M1A-DEBT-04 (propose to Foreman) |
| F-7 WARN advisor on SECDEF→authenticated | INFO | DISMISS (canonical pattern) |

No finding is HIGH or CRITICAL. No finding requires a new SPEC. 1 finding (F-4) proposes a TECH_DEBT entry; 1 finding (F-6) proposes a MASTER_ROADMAP edit to the existing M1A-DEBT-04. Both deferred to Foreman.

---

*End of FINDINGS.md.*
