# VISUAL_FIDELITY_GATE — Findings

## F-VFG-1 — CSS variables empty at :root → card + list rendered with transparent backgrounds (root cause of the M5 paperwork-PASS)

**Severity:** HIGH (resolved in this SPEC).
**Where:** `css/customers.css` Phase D + E.
**Description:** my Phase D authoring of `css/customers.css` used Hybrid+Navy token names (`--bg-page`, `--accent`, `--border-subtle`, `--text-primary`, etc.) — copied from the mockup. The mockup itself declares these tokens inside its own `:root { ... }` block (it's self-contained). My CSS file referenced them via `var(--*)` but never declared them anywhere, and `shared/css/variables.css` uses a different naming convention (`--color-primary`, `--color-success`). Result: every `var(--bg-page)` etc. resolved to empty string → every `background: var(--bg-surface)` rendered transparent → card looked unstyled. The Phase D + E "Chrome MCP fidelity PASS" screenshots captured this unstyled state without flagging it. Architect noticed in a separate review — Daniel directive: make the gate blocking.
**Decision:** Resolved in code (commit will land in this SPEC) — `.cust-page` selector now declares all 24 Hybrid+Navy tokens (per opticup-executor's "page-scope `body { --primary }` override" pattern). Post-fix: every token resolves; computed styles match the mockup palette.

## F-VFG-2 — Foreman + Reviewer + Localhost-Tester closure didn't enforce the fidelity table

**Severity:** HIGH (resolved structurally).
**Where:** the existing Tier C Mockup Fidelity Check in `opticup-localhost-tester` SKILL was present but never actually invoked during Phase D + E (the Executor ran inline Chrome MCP smokes instead, and the Foreman accepted screenshots as evidence without demanding the comparison table).
**Decision:** Resolved by this SPEC — `opticup-localhost-tester` SKILL appended a "Visual-Fidelity Gate (MANDATORY BLOCKING)" section with Step 0 first-load styled-check + table-MUST-be-embedded-in-FOREMAN_REVIEW rule + "paperwork PASS is INVALID" callout. `CLAUDE.md` Iron Rule 34 tightened. `opticup-strategic` SKILL appended a Foreman closure checklist. `opticup-reviewer` SKILL appended an audit checklist.

## F-CARD-ADDRESS-SCHEMA — Mockup's 5-row address breakdown vs live's 2-row schema

**Severity:** MEDIUM (schema-blocked).
**Where:** Card Tab 1 Address block.
**Description:** Mockup shows: עיר / שכונה / רחוב + מספר / מיקוד / משפחה (5 rows). Live `customers` table has `city text` + `address text` (single field for the rest). Rendering 5 visual rows on 2 columns would require either (a) splitting `address` into structured columns (schema migration) or (b) rendering aspirational empty rows (violates `feedback_no_polish_by_validation`).
**Decision:** TECH_DEBT — needs a future M5 schema-expansion SPEC that adds neighborhood / street_number / street_name / postal_code columns. Out of scope this SPEC (Brief §4 explicit). Documented for future architect pass.

## F-CARD-CONTACT-SCHEMA — Mockup's 4-row contact vs live's 2-row schema

**Severity:** LOW (schema-blocked).
**Where:** Card Tab 1 Contact block.
**Description:** Mockup shows: נייד / טלפון-עבודה / אימייל / אחר (4 rows). Live has only `phone` + `email`. Adding work_phone + contact_other requires schema columns.
**Decision:** TECH_DEBT — bundle with F-CARD-ADDRESS-SCHEMA in the same future schema-expansion SPEC.

## F-CARD-DISCOUNT-GROUP-SCHEMA — Mockup's discount_group row vs live (no column)

**Severity:** LOW (schema-blocked).
**Where:** Card Tab 1 Additional Info block.
**Description:** Mockup shows: קופ"ח / מקצוע / קבוצת-הנחה / מקור (4 rows). Live has 3 — no `customers.discount_group` column.
**Decision:** TECH_DEBT — bundle with schema-expansion SPEC. Probably ties into M13 Loyalty / discount groups as a single concern.

## F-LIST-ASPIRATIONAL-COLUMNS (already in Phase E FINDINGS as F-LIST-MOCKUP-COLUMNS)

**Severity:** MEDIUM (schema-blocked + feature-blocked).
**Where:** List Sketch 2 row design.
**Description:** Mockup row shows: avatar + name+pill + id+age + phone+email-status + HF+tier + last-exam + last-order + 3 actions. Live row shows: avatar + name+lifecycle + customer_number_display + phone + HF + פתח-כרטיס. Missing: age (birth_date NULL on demo), email-verified-state (no column), HF-tier (M13), last-exam (needs `v_exam_for_customer` join), last-order (needs `orders` aggregation), 📅/💬/📞 actions (M14/M12/telephony).
**Decision:** TECH_DEBT — already logged in Phase E. The gate confirms the drift is well-bounded to documented future-module work.

## Summary

| # | Severity | Decision |
|---|---|---|
| F-VFG-1 | HIGH | Resolved in code (CSS variable scope fix in `css/customers.css`) |
| F-VFG-2 | HIGH | Resolved structurally (skill + governance edits in this SPEC) |
| F-CARD-ADDRESS-SCHEMA | MEDIUM | TECH_DEBT — future schema-expansion SPEC |
| F-CARD-CONTACT-SCHEMA | LOW | TECH_DEBT — bundle with address |
| F-CARD-DISCOUNT-GROUP-SCHEMA | LOW | TECH_DEBT — bundle with M13 Loyalty |
| F-LIST-ASPIRATIONAL-COLUMNS | MEDIUM | TECH_DEBT — same as Phase E F-LIST-MOCKUP-COLUMNS |

2 HIGH resolved in this SPEC. 4 schema/feature-blocked items confirmed as TECH_DEBT (not introduced by this SPEC; some pre-existing from Phase D/E). No new schema work in scope.
