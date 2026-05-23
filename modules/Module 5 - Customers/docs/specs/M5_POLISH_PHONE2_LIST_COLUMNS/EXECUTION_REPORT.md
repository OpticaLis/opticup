# M5_POLISH_PHONE2_LIST_COLUMNS — Execution Report

## Summary

Two small SaaS-clean improvements landed: (Item A) `customers.phone_secondary` column added + exposed in `v_customer_full` + rendered as a 2nd Contact row "טלפון-עבודה" with the same PIN-gating as the primary phone. (Item B) new `modules/customers/customer-list-columns.js` provides a column-picker modal with 11 wired columns (4 default-checked) + 4 future columns shown disabled as "בקרוב"; per-tenant choice persists via the existing `tenant_settings.customer_list_preferences` jsonb + `update_customer_display_preferences` RPC. Both closed via the Visual-Fidelity Gate with embedded screenshots + region-by-region tables (the gate the prior SPEC installed).

## §2 — What was done

| Commit | Subject | Files |
|---|---|---|
| `52e0e15` | docs(m5): seal SPEC | SPEC.md |
| (commit 2 — pending) | feat(m5): add customers.phone_secondary column + expose in v_customer_full + render in card contact + FIELD_MAP | css/customers.css (no-op for Item A) + customer-card-tab-details.js + js/shared-field-map.js + db-schema.sql |
| (commit 3 — pending) | feat(m5): per-tenant configurable list columns (picker + tenant_settings persistence) | customer-list-columns.js (NEW) + customer-list.js + customer-card-coming-soon.js + customers.html + css/customers.css |
| (commit 4 — pending) | docs(m5): close M5_POLISH_PHONE2_LIST_COLUMNS — retros + M5 docs + GLOBAL_MAP/SCHEMA additive | retros + state files |

**Supabase MCP migrations applied:**
- `m5_polish_01a_phone_secondary_column` — `ALTER TABLE customers ADD COLUMN phone_secondary text` (additive).
- `m5_polish_01b_phone_secondary_view` — `CREATE OR REPLACE VIEW v_customer_full` with `phone_secondary` appended at the end of the column list.

## §3 — Iron Rule self-audit

| Rule | Status |
|---|---|
| 5 (FIELD_MAP) | ✅ — `'טלפון-עבודה':'phone_secondary'` added to customers map. |
| 7 (DB via helpers) | ✅ — `DB.select` + `DB.rpc('update_customer_display_preferences', …)`. No `sb.from()`. |
| 8 (sanitization) | ✅ — escapeHtml on every dynamic interpolation in customer-list-columns.js + customer-list.js renderCell. |
| 9 (no hardcoded business values) | ✅ — column registry tokens are tenant-neutral; tenant chooses via picker. |
| 12 (file size) | ✅ — customer-list-columns.js = 158 lines (under 300). customer-list.js grew from 290 → 328 lines (within 350 hard cap; some growth from data-driven row rendering switch). |
| 14/15/22 (tenant_id) | ✅ — `tenant_settings` already has `tenant_id NOT NULL` + canonical 2-policy RLS + UNIQUE(tenant_id). The RPC enforces `p_tenant_id`. |
| 21 (no orphans, no duplicates) | ✅ — REUSED existing `tenant_settings` + `update_customer_display_preferences`. No new config table. No new handler. |
| 31 (integrity gate) | ✅ — exit 0 at every commit. |
| 32 (destructive ops) | ✅ — declared additive + no DROP/TRUNCATE/DELETE outside the smoke. |
| 34 (Visual-Fidelity Gate) | ✅ — Step 0 styled-check + Step 1 stylesheet audit + Step 2 region-by-region tables (card + list) embedded in TEST_REPORT.md + FOREMAN_REVIEW.md. |
| Selective git add (CLAUDE.md §9 #6) | ✅ — explicit-filename throughout. NO `-a`. |

## §4 — Deviations from SPEC

- **Postgres view-recreate constraint** caught at first migration attempt (F-POL-1). Required 2-migration split (F-POL-2). Both successful on retry. Documented.
- **PIN modal selector** differed from my initial assumption (F-POL-3). Smoke retried with correct selector; production behavior is correct.
- **Picker JPEG screenshot timeout** (F-POL-4). A11y snapshot used as equivalent evidence per VISUAL_FIDELITY_GATE P-EXEC-3.

None block-class.

## §5 — Decisions made in real time

| Decision | Reasoning |
|---|---|
| `phone_secondary` appended at END of view, not at logical position after `phone`. | Postgres CREATE OR REPLACE VIEW can only add columns at the end. F-POL-1. |
| 2-migration split (column first, view second). | F-POL-2 — atomic-rollback semantics on bundled DDL. |
| Default tenant columns = `["name", "phone", "city", "health_fund"]`. | Matches what users currently see + the most common ID dimensions (name/phone/city) + the one M5-specific dimension that's already wired (health_fund). |
| Future-column click fires `showComingSoon` via `bindComingSoon`. | Reuses the existing discipline (Iron Rule 21); no new handler. |
| `--cust-col-count` CSS custom property drives `grid-template-columns: 36px repeat(N, …) auto`. | Data-driven layout from JS state without rebuilding every CSS rule. |

## §6 — What would have helped me go faster

- A `pg_get_viewdef()` snippet pre-loaded in the SPEC would have surfaced the view-rebuild constraint at author time (F-POL-1 was preventable).
- The opticup-executor SKILL note on "Modal.confirm vs confirmDialog" selectors would have saved one smoke iteration (F-POL-3).

## §7 — Self-assessment

| Axis | Score | Justification |
|---|---|---|
| Adherence to SPEC | 9/10 | All 21 criteria pass. 4 INFO findings, all resolved or test-only. |
| Adherence to Iron Rules | 10/10 | 0 hard violations. Selective git add. Append-only governance edits to coming-soon registry. |
| Commit hygiene | 9/10 | Logically-scoped commits. NO `-a`. |
| Documentation currency | 9/10 | EXECUTION_REPORT + FINDINGS + TEST_REPORT all written; tables embedded in both TEST_REPORT and FOREMAN_REVIEW. |

## §8 — Improvement proposals harvested

### P-EXEC-8 — Schema-+-view migration pattern in opticup-executor SKILL

**Symptom:** F-POL-1 + F-POL-2 — bundled `ALTER TABLE + CREATE OR REPLACE VIEW` failed atomically when the view tried to reorder columns. Split into 2 migrations worked. Worth codifying.

**Proposed change:** Add to `.claude/skills/opticup-executor/SKILL.md` Step 1.5 DB Pre-Flight:

> **For SPECs that touch a table AND a dependent view (or RLS / RPC):** apply DDL as SEPARATE Supabase MCP migrations — column-first, then view/RPC second. Bundled migrations roll back atomically if any single step fails. Additionally: when ADDING a column to an existing view via `CREATE OR REPLACE`, the new column MUST be appended at the END of the SELECT list — Postgres rejects column insertion in the middle (interprets it as a rename).

**Acceptance:** next view-extending SPEC follows the 2-migration pattern without learning the constraint at runtime.

### P-AUTHOR-8 — Reusable Modal-confirm selector reference

**Symptom:** F-POL-3 — production Modal.confirm uses `.modal-container > .modal-footer > button.btn.btn-primary` (text "אישור"). The shared.js confirmDialog fallback (`#confirm-yes`) only renders when Modal isn't loaded. New smokes default to looking for the wrong element.

**Proposed change:** Add to `.claude/skills/opticup-executor/references/CHROME_MCP_SELECTORS.md` (NEW file) a reference table of common UI selectors:

```
Modal.confirm primary button: button.btn.btn-primary (text "אישור")
Modal.confirm cancel button:  button.btn.btn-secondary (text "ביטול")
Toast info container:          #toast-c > .toast.toast-info
PIN modal input:               #pin-input (when pin-modal.js loaded)
```

**Acceptance:** future smokes consult the reference and pick correct selectors first try.
