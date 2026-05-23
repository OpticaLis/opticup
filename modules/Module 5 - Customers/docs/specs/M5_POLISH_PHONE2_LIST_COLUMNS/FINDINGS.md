# M5_POLISH_PHONE2_LIST_COLUMNS — Findings

## F-POL-1 — `CREATE OR REPLACE VIEW` rejects column reorder; must append to end

**Severity:** INFO (resolved in execution; documented for future view-update SPECs).
**Where:** Step 1 migration on `v_customer_full`.
**Description:** Postgres' `CREATE OR REPLACE VIEW` cannot rename existing columns or insert a new one in the middle. The first attempt inserted `phone_secondary` after `phone` (matching DB column order on the table); Postgres interpreted the shifted positions as renaming column 8 from `email` to `phone_secondary` and aborted. Fix: append `phone_secondary` at the END of the view SELECT list.
**Decision:** Resolved in code (migration `m5_polish_01b_phone_secondary_view`). Documented for future view migrations: when adding columns, ALWAYS append at end OR DROP + CREATE the view in one transaction.

## F-POL-2 — Atomic-migration roll-back of ALTER+VIEW combo

**Severity:** INFO (resolved by splitting migrations).
**Where:** Same migration step.
**Description:** The first attempt bundled `ALTER TABLE ADD COLUMN` + `CREATE OR REPLACE VIEW` into one Supabase MCP migration. When the view recreate failed (F-POL-1), the entire migration rolled back atomically — including the ALTER. Subsequent attempts to recreate the view referenced a non-existent column. Fix: split into 2 migrations (`m5_polish_01a_phone_secondary_column` + `m5_polish_01b_phone_secondary_view`).
**Decision:** Resolved. Pattern: schema-+-view changes should be 2 migrations (commit the column first, then update dependent views).

## F-POL-3 — PIN-gating modal uses `Modal.confirm`, not `confirmDialog()` fallback

**Severity:** INFO (smoke-only).
**Where:** S2 smoke flow.
**Description:** My initial smoke clicked `#confirm-yes` (the fallback HTML modal in `shared.js`). The active modal is actually `Modal.confirm` from `shared/js/modal-builder.js`, which renders `.modal-container > .modal-footer > button.btn-primary` (with text "אישור"). The fallback element didn't exist. Smoke retried with the correct selector + verified the DB write.
**Decision:** Test-only — production behavior is correct (a real user just clicks the visible button). Note for future smokes: use `button.btn.btn-primary` text-matched to "אישור" / "ביטול" for Modal.confirm dialogs.

## F-POL-4 — Picker JPEG screenshot timed out repeatedly

**Severity:** INFO (a11y snapshot is equivalent evidence per VISUAL_FIDELITY_GATE P-EXEC-3).
**Where:** S5 picker capture.
**Description:** 4 consecutive `take_screenshot(format=jpeg, quality=60)` attempts hit `Page.captureScreenshot timed out` on the picker modal. The a11y snapshot (rendered text + element tree) was captured successfully and embedded in TEST_REPORT as equivalent structural evidence.
**Decision:** Acceptable per gate (P-EXEC-3 a11y-equivalence). For visual proof, capture before opening the picker (saved as `list_6_columns_after_save.jpeg`) + the 2 other screenshots that did succeed.

## F-CARD-CONTACT-SCHEMA (carryover from VISUAL_FIDELITY_GATE F-CARD-CONTACT-SCHEMA — partially resolved)

**Severity:** PARTIAL RESOLUTION.
**Description:** VISUAL_FIDELITY_GATE flagged the Contact block as 4-row mockup vs 2-row live. This SPEC adds row 2 (טלפון-עבודה) — **2 of the 2 remaining gaps closed: phone_secondary now exists**. Row 4 ("אחר") still SCHEMA-BLOCKED.
**Decision:** Updated in TECH_DEBT: address-breakdown + "אחר" contact field remain as the future schema-expansion SPEC. The 2nd-phone gap is closed.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-POL-1 | INFO | Resolved (append-at-end pattern documented). |
| F-POL-2 | INFO | Resolved (2-migration split for schema-+-view). |
| F-POL-3 | INFO | Smoke fix only; production behavior correct. |
| F-POL-4 | INFO | A11y snapshot accepted per VISUAL_FIDELITY_GATE P-EXEC-3. |
| F-CARD-CONTACT-SCHEMA | PARTIAL | row 2 (טלפון-עבודה) now live; row 4 still TECH_DEBT. |

0 HIGH / 0 MEDIUM. All INFOs resolved or test-only. 1 partial-resolution shrinks an existing TECH_DEBT entry.
