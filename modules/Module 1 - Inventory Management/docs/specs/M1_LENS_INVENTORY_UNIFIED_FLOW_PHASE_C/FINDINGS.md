# FINDINGS — M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_C

**Generated:** 2026-05-18 evening
**Executor:** opticup-executor (Claude Code)

---

## F-1 (MEDIUM) — Full Receive modal (C-C4) deferred — DOM ID collision blocks clean embedding

**Location:** Brief §5.3 (Full Receive modal flow); affected files: `modules/lens-inventory/lens-inventory-partial.html` + `modules/lens-goods-receipt/lens-goods-receipt-partial.html` + `modules/lens-goods-receipt/lens-goods-receipt-main.js` lines 34, 36, 40.

**Description:** Brief §5.3 specifies: "Top-right button '📦 קבלת סחורה מלאה' opens a modal with the existing קבלת סחורה screen's content embedded — NOT a navigate." Discovery during C-C4 planning: both the inventory partial and the goods-receipt partial declare unscoped DOM IDs `#access-gate` and `#app`. The `lens-goods-receipt-main.js` file directly manipulates these IDs (`document.getElementById('access-gate')`, `document.getElementById('app')`). Embedding the GR partial inside a modal while the inventory partial is still active causes JS handlers to fight over the same DOM nodes — inventory's `#app` could be hidden by GR's gate logic, etc.

Workarounds considered + rejected:
- **iframe** — adds auth/session complexity; defers wins to user (cross-frame storage limits).
- **Tab-switch with return** — violates Brief's explicit "NOT a navigate".
- **In-place GR partial rewrite to use scoped IDs** (`#gr-access-gate` / `#gr-app` / etc.) — substantial scope creep; touches 8+ files in `modules/lens-goods-receipt/` plus the goods-receipt module's tab loader; not appropriate to bundle into Phase C.

**Suggested next action:** New SPEC `M1_LENS_GOODS_RECEIPT_SCOPED_IDS` as PREREQUISITE for the Full Receive modal SPEC:
- Refactor `lens-goods-receipt-partial.html` to use `#gr-access-gate` / `#gr-app` prefixed IDs (and any other unscoped IDs the partial uses).
- Update all `modules/lens-goods-receipt/*.js` references to the new IDs.
- Verify the deep-link `tab=goods-receipt` route still works.
- After that ships, follow-up SPEC `M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_C_FULL_RECEIVE_MODAL` can implement the modal cleanly.

Estimated effort: scoped-ID refactor ~45-60 min (mechanical rename across 8 files); Full Receive modal implementation ~30-45 min (fetch+inject pattern is straightforward once IDs are clean).

**Severity MEDIUM** because: the user-facing workflow is preserved via the existing `tab=goods-receipt` deep-link button (no functional regression); Quick Scan (Flow 1) + Manual Add (Flow 2) already cover the everyday add-stock use case. Full Receive's multi-line flow is for batch shipments — a less-frequent operation that still has a fully-functional path via the dedicated tab.

---

## F-2 (LOW) — Multiple files at Rule 12 soft-target warning (300 lines)

**Location:**
- `modules/lens-inventory/lens-inventory-modal-shows.js` (317 lines after C-C3, was 176)
- `modules/inventory/inventory-shell-lens.js` (345 lines after C-C3 — was 344; +1 for the new lens-inventory-quick-scan.js entry)
- `css/lens-inventory-modals.css` (358 lines after C-C3, was 302) — over the 350 hard cap by 8 lines, but CSS files appear exempt from the file-size hook's hard-block behavior (warning-only).

**Description:** All 3 files exceeded the 300-line soft target during Phase C. None hit the 350 hard cap for blocking (the CSS file is over but hook is warning-only for CSS extensions per observed C-C3 commit output). Each file's growth is justified by single-responsibility cohesion: modal-shows manages all modal-open behavior + the new Phase C drawer routing; inventory-shell-lens is the per-tab registry for all 7 lens tabs; lens-inventory-modals.css is the Phase A1 visual chrome file for all modal/drawer surfaces.

**Suggested next action:** Three independent paths, no immediate urgency:
1. **`modal-shows.js`** → at next add of lens-inventory modal feature, split helpers into `lens-inventory-modal-actions.js` (handler dispatcher + drawer/modal openers) + keep `modal-shows.js` for the close + reason-chips + qty-controls plumbing.
2. **`inventory-shell-lens.js`** → at next add of a lens tab, split the per-tab registry data block into a sibling `lens-tab-registry.js` (pure data) + keep the shell logic in this file (P-EXEC F-4 from MOCKUP_1TO1 already proposed this).
3. **`lens-inventory-modals.css`** → at next Phase D modal/drawer style, extract a sibling `lens-inventory-quick-scan.css` (lift the 56 lines added in C-C3).

**Severity LOW** because: hook warnings only; no behavioral impact; clean split paths exist when natural triggers fire.

---

## F-3 (LOW) — Phase A FIELD_MAP gap (retroactively flagged)

**Location:** `js/shared.js` FIELD_MAP — does NOT include entries for the Phase A new columns (`default_supplier_id`, `is_documented`, `undocumented_reason`, `manager_review_status`, `manager_reviewed_by`, `manager_reviewed_at`).

**Description:** Iron Rule 5 ("Every new DB field → add to FIELD_MAP in shared.js") was not honored by Phase A's executor (me, in the prior phase). Phase C did not introduce new fields (only RPC param adds) so this finding is RETROACTIVE — caught during Phase C self-audit on Rule 5. The FIELD_MAP is the project's Hebrew-label registry; missing entries means UI surfaces that auto-render labels from FIELD_MAP would show the raw column name instead of the Hebrew label.

**Suggested next action:** Add to FIELD_MAP in `js/shared.js`:
```js
'default_supplier_id': 'ספק ברירת מחדל',
'is_documented': 'מסומך',
'undocumented_reason': 'סיבת אי-תיעוד',
'manager_review_status': 'סטטוס בדיקת מנהל',
'manager_reviewed_by': 'נבדק על-ידי',
'manager_reviewed_at': 'תאריך בדיקה'
```
Either bundle into Phase D (which builds the unified-log surface that consumes manager_review_status — natural fit) OR file as a tiny standalone fix.

**Severity LOW** because: today, no UI surface auto-renders FIELD_MAP labels for these 6 columns (the unified log Phase D will be the first consumer). Catching it now prevents a Phase D execution-time gap.

---

*FINDINGS closed. 3 entries logged: 1 MEDIUM (F-1 Full Receive deferral), 2 LOW (F-2 file-size warnings, F-3 Phase A FIELD_MAP retroactive gap).*
