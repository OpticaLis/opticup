---
spec_id: M1_LENS_CATALOG_TRUE_REBUILD
executor: opticup-executor
authored: 2026-05-18
verdict: PARTIALLY EXECUTED
---

# FINDINGS — M1_LENS_CATALOG_TRUE_REBUILD

## F-1 — Pre-existing `.list-item` vs `.lens-cat-admin-list-item` class mismatch in SPEC 9 (INFO, fixed in this SPEC)

**Severity:** INFO (proactively repaired during Commit 1)

**What:** SPEC 9 (`M1_LENS_CATALOG_ADMIN_REBUILD`, commit `eda7f80`) wrote the page-frame CSS at `css/lens-catalog-admin-page.css` scoping all interactive row styles under the class `.lens-cat-admin-list-item` (scoped by `.lens-tab-section[data-tab="catalog-admin"]`). BUT the row renderers in `catalog-brands-col.js` + `catalog-designs-col.js` (also from SPEC 9) emit HTML rows with bare `class="list-item"` instead of the scoped class. The two never matched, so list rows would inherit no styling within the dark-themed page-frame.

**Why nobody noticed:** SPEC 9 deferred S10 (drill verification) because the OAuth gate blocked Tier C. With no data ever loading in any column body, no `.list-item` HTML rows were ever emitted, so the broken cascade was invisible. SPEC 9 closed 🟢 on the strength of a single empty-layout screenshot.

**Fix shipped (Commit 1, this SPEC):** Updated `catalog-brands-col.js:renderBrandsList()` + `catalog-designs-col.js:renderFilteredDesigns()` to emit `<div class="lens-cat-admin-list-item" ...>` instead of `<div class="list-item" ...>`. Selectors in event handlers updated to match. Item title + item meta nested in `<div class="item-title">` + `<div class="item-meta">` per the page-frame CSS shape.

**Lesson for future SPECs:** when SPEC §6 Tier C is deferred and CLOSED 🟢 anyway on a "verification-only" verdict, the executor should still grep-audit class-name consistency between renderer + CSS. A 2-minute grep would have caught this in SPEC 9.

---

## F-2 — Iron Rule 9 backup folder gitignored — recovery path is git-history-only (INFO)

**Severity:** INFO (documented for future executors)

**What:** Iron Rule 9 requires a backup folder at `modules/Module N/backups/{ISO_DATE}_{SPEC_SLUG}/` containing copies of all touched files + governance docs before any operation touching >5 files or >100 LOC refactors. The backup folder is correctly created locally (16 files for this SPEC's Commit 1), but `modules/Module 1 - Inventory Management/backups/**` is gitignored — the backup is local-only.

**Why this matters:** Future executors picking up SPEC A on a different machine (or after machine wipe) won't have the local backup. Recovery from a botched commit relies entirely on `git revert` / `git reset` of the canonical commit hashes (`434f254` / `454491b`). This is the intended design per the prior session's commit message ("git history is canonical rollback") but it's worth flagging that a "backup folder exists locally" is NOT a portable safety net.

**Suggested follow-up:** None. The architecture is intentional. Just worth noting in executor skill SKILL.md §Backup Protocol that the folder's gitignore status means rollback authority lives in git, not in the backup folder.

---

## F-3 — `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` not updated for new `catalog-suppliers-col.js` file (LOW, deferred)

**Severity:** LOW (correctness gap — closure docs should be complete)

**What:** Commit 1 created `modules/lens-catalog-admin/catalog-suppliers-col.js` (NEW, 113 LOC). Per CLAUDE.md §10 Integration Ceremony + opticup-executor SKILL.md §Documentation Updates, every new file should be reflected in the module's `MODULE_MAP.md` in the SAME commit. This was overlooked in Commit 1 (the commit was already 8 files large + focused on shipping the mockup-faithful rebuild) and not retroactively added in Commit 2.

**Impact:** Low — `MODULE_MAP.md` is a navigation index. The lens-catalog-admin section will need a one-line addition listing the new file + its responsibility. Not blocking any work.

**Suggested fix:** Add a one-line entry to `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` in the next SPEC that touches lens-catalog-admin. Format: `catalog-suppliers-col.js — Suppliers column (col 1) loader + click handler; brand_count via supplier_brand_distribution join`.

---

## F-4 — `catalog-import.js` import flow `wireImportFlow(state, onImportComplete)` callback refresh is now tied to `loadBrandsForSupplier(state)` — but if no supplier is selected, the refresh is a silent no-op (LOW, behavioral)

**Severity:** LOW (UI behavior subtle)

**What:** Commit 1's orchestrator change in `lens-catalog-admin.js` wires `wireImportFlow(state, () => loadBrandsForSupplier(state))`. Previously the callback was `() => loadBrands(state)` which always reloaded all brands. After the change, if the user imports a brand catalog file WITHOUT having selected a supplier first, the post-import refresh is a no-op (empty Brands column with "בחר ספק ←" placeholder). The imported brand IS in the DB (visible after selecting any supplier that has a distribution row for it), but the UI gives no immediate feedback.

**Impact:** Low — the existing import flow already gates the button: `catalog-import.js` line 10-13 `if (!state.selectedTenant) { showToast('בחר טננט קודם', 'error'); return; }`. So at minimum a tenant is selected before import. But "supplier not selected" is a weaker gate that doesn't currently exist in the import flow.

**Suggested fix:** Future SPEC adds a similar `if (!state.selectedSupplier)` gate to `catalog-import.js:processFile()` OR changes the refresh callback to `() => loadSuppliers(state)` (which reloads the Suppliers column counts and doesn't depend on a selected supplier).

---

## F-5 — SPEC §3 S6 / S10 / S11 deferred verifications create a documentation-completeness gap (INFO)

**Severity:** INFO (process)

**What:** SPEC A's most strict success criteria (S6 drill flow, S10 ≥6 screenshots, S11 mockup side-by-side classification) were architected as 2-pass — Pass 1 structural after Commit 2, Pass 2 data-driven after SPEC B closes. With SPEC B aborted, these criteria are deferred to a future SPEC. The deferred status is documented in EXECUTION_REPORT §4 + §5 + §10, but at the SPEC.md level there is no in-line "DEFERRED — see EXECUTION_REPORT" marker on the §3 success criteria rows.

**Impact:** A future reader of SPEC.md alone (without EXECUTION_REPORT) might assume the strict criteria were met. They were not — they were deferred to a successor SPEC.

**Suggested fix:** Add a §3 footnote pointing at this EXECUTION_REPORT. Could be done in the same closure commit if practical, or in the future SPEC.

---

**Total: 5 findings (3 INFO, 2 LOW).**

All findings logged for the future SPEC author + foreman to consume. None are blocking.
