# FINDINGS — M1_LENS_PHASE_2_COMPLETION

> Findings logged by the executor as the Pipeline runs. Each finding has a severity (INFO/LOW/MEDIUM/HIGH/CRITICAL), a location, a description, and a suggested next action (new SPEC / TECH_DEBT entry / dismiss).

---

## F-1 — M1_LENS_GENERIC_RECEIPT_DEFERRED (Tier 3 deferral of Part A)

**Severity:** HIGH (this is the principal output of Part A — it closes D-M1-09's old framing and opens a reframed follow-up)

**Location:** Strategic / cross-module — concerns `modules/goods-receipts/` (4,473 lines / 20 files) + `modules/lens-goods-receipt/` (632 lines / 8 files) + the D-M1-09 promise

**Description:**

The Brief assumed a generic Module 1.5 goods-receipt component could absorb the shared UX surface between frames-receipt and lens-receipt. Empirical analysis (EXECUTION_REPORT.md §"Part A — A1 analysis") found **~0 functionally meaningful lines of truly shareable logic** between the two flows.

The flows share verbal descriptions ("supplier picker", "line list", "save flow") but the parallel ends at description:

- **Frames** is an OCR-first invoice-reconciliation flow built over 2026-04, writing to `goods_receipts` / `goods_receipt_items` with client-side orchestration of PO updates + supplier_debt creation. ~1,400 lines of OCR + AI learning + PO-compare + Excel export are entirely lens-absent.
- **Lens** is a structured PO-close flow built over 2026-05-14/15 (Phase 1A + 1B), writing to `purchase_receipt` / `purchase_receipt_line` / `stock_lot` / `stock_movement` via atomic RPC `m1_create_receipt_from_box`. Server-side everything. No OCR. No PO-compare. No Excel.

The 10 candidate extraction points (supplier picker, PO-line loader, line table rendering, manual line entry, save orchestration, discrepancy display, permission gate, file attachment, doc-numbers, status chip pattern) all evaluated to **non-shareable** because the data models, UX paradigms, and server-side architectures genuinely differ. Forcing a generic component would re-introduce coupling that doesn't currently exist, would risk a regression in Prizma-production frames-receipt code, and would not eliminate any duplication.

**The original D-M1-09 promise ("anchor on existing frames pattern, generic component in Module 1.5") was framed at the wrong axis.** The right unit of analysis is UX-level consistency (e.g., "every receipt screen presents qty discrepancy the same way visually") not code-level helpers. The code paths are too different to merge productively.

**Suggested next action: NEW_SPEC `M1_LENS_GR_D_M1_09_REFRAMING`** — to be authored by opticup-architect (Cowork session) at Daniel's next strategic chat:

1. Decide whether to:
   - (a) close D-M1-09 with the reframing rationale captured here (mark as "RESOLVED — reframed; original premise didn't hold against code reality"), OR
   - (b) re-author D-M1-09 as a UX-consistency mandate (any receipt screen MUST show discrepancy with the same chip pattern, MUST handle manual line additions with the same modal pattern, etc.) — this is a design-system level promise, not a refactor promise, and would be tracked through `M1_5_DESIGN_SYSTEM_*` SPECs rather than as a receipt-specific extraction.
2. If (b): author a UX-consistency SPEC after Module 1 Close Ceremony, scoping to chip/badge consistency + manual-line modal consistency + summary card consistency.

**Why this is HIGH and not MEDIUM:** D-M1-09 has been an open commitment since Phase 1B Procurement. Documenting honestly that the original framing doesn't hold is more valuable to the project than a forced refactor that wouldn't actually eliminate duplication. Without this honest deferral, the next executor (or Pipeline) would inherit the same wrong-axis assumption.

---

## F-2 — Defensive `escapeHtmlSafe` wrapper duplicated across 4 lens files

**Severity:** LOW (code-smell; not a bug; Iron Rule 21 candidate)

**Location:** `modules/lens-goods-receipt/lens-goods-receipt-{supplier,lines,manual,...}.js` — 4 files, 8 lines each (32 lines total) of identical defensive wrapper:

```js
function escapeHtmlSafe(s) {
  if (typeof escapeHtml === 'function') return escapeHtml(s);
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}
```

**Description:**

This defensive wrapper exists in case `escapeHtml` (defined in `js/shared-ui.js`) is not loaded before the lens files. In practice every lens HTML page loads `js/shared-ui.js` BEFORE `modules/lens-goods-receipt/*.js`, so the fallback path is dead defensive code. The duplication is also an Iron Rule 21 (No Duplicates) candidate — each lens file should call global `escapeHtml` directly.

**Why this surfaced in Part A:** during the empirical surface scan for Part A1, this was the only "shared" pattern across multiple lens files. It looked like a shareability candidate at first glance, but it's actually a Rule 21 violation hiding inside lens — the right fix is to delete the wrapper from all 4 files and reference global `escapeHtml`, not to extract it to Module 1.5.

**Suggested next action: TECH_DEBT entry** `M1_LENS_ESCAPE_HTML_DEDUP` (or fold into the next M1 routine-cleanup SPEC). Estimated work: 3 minutes — `Grep escapeHtmlSafe`, replace with `escapeHtml`, delete 4×8 line wrappers. Verify with the lens screens still rendering correctly.

---

## F-3 — `record_count_correction` does not exist (Brief §2.2 autonomy band reference)

**Severity:** INFO (Brief reference clarification)

**Location:** Brief §2.2 autonomy band

**Description:**

The Brief §2.2 autonomy band granted permission to include `record_count_correction` in Part B harmonization "if it exists as a third RPC in the same family." Foreman's pre-flight probe at Stage 1 (SPEC §0.A P6) confirmed **`record_count_correction` does not exist** in the live DB. Part B will only address `record_adjustment_lost` + `record_adjustment_found`.

**Suggested next action: dismiss.** Documented here so the Foreman knows the autonomy band was checked.

---

## F-4 — `record_adjustment_found` has 0 JS callers in repo

**Severity:** INFO (Part B impact-scope clarification — makes Part B breaking-FREE)

**Location:** Repo-wide grep (Foreman Stage 1, SPEC §0.A P7)

**Description:**

`record_adjustment_found` exists as an RPC in the live DB but is called by zero JS/HTML/TS files in the repo. All grep hits are docs / Briefs / SPECs / migrations. This means Part B's signature change (9-arg → 11-arg, `p_reason TEXT` → `p_reason_id UUID`, return type movement_id → adjustment_id) is breaking-FREE at the application layer. No backward-compatibility shim needed.

**Suggested next action: dismiss.** Documented so the Foreman knows the deletion-of-old-overload path is safe.

---

*Findings F-5 onward appended by Parts B / C / D as they execute.*
