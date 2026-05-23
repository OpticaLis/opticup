# M5_POLISH_PHONE2_LIST_COLUMNS — Foreman Review

> **Role:** opticup-strategic (Foreman, post-execution review)
> **Authored:** 2026-05-23

## SPEC quality audit

- **Measurable success criteria?** Yes — 21 criteria with exact expected values. All hit.
- **Stop triggers clear?** Yes — §5 listed 4 specific. None fired (the F-POL-1/2 issues were anticipated category — view recreate constraint — and the SPEC's §0 already declared the 2-migration split as the pattern).
- **Autonomy envelope appropriate?** Yes — surgical additive changes throughout. No schema beyond the one column. No new RPC. No new config table.
- **Did the Visual-Fidelity Gate requirements appear in the SPEC?** Yes — §3b + Pre-Merge Checklist both require the gate output.

## Execution quality audit

- **Followed the SPEC?** Yes. Schema migration + view + FIELD_MAP + card render + new file + customer-list rewire + picker UI + tenant_settings persistence — all delivered.
- **Spot-checks (3 of largest claims):**
  1. **"`phone_secondary` persists via DB.update"** — verified via trace + DB SELECT. Trace: `update_sent → update_resolved error:null` in 205ms. DB shows new value; reverted to NULL at teardown.
  2. **"tenant_settings UPSERT works via the existing RPC"** — verified via DB SELECT post-save: `customer_list_preferences = {"list_columns":["name","phone","city","id_number","source","health_fund"]}`.
  3. **"Reload preserves the tenant choice (not default 4)"** — verified by hard reload + reading `--cust-col-count` from the live DOM: 6, not 4. Plus rendered rows show real id_number + source values where present.

## Iron Rule 34 closure evidence — embedded (per the gate)

**Card Contact block** (Item A):

| # | Region | Match | Severity | Classification |
|---|---|---|---|---|
| 1 | h3 | ✅ | — | 1:1 |
| 2 | "נייד" row | ✅ | — | 1:1 |
| 3 | **"טלפון-עבודה" row** | ✅ | — | **1:1 — Item A delivered** |
| 4 | "אימייל" row | ✅ | — | 1:1 |
| 5 | "אחר" row (mockup-only) | ⚠ LOW | — | SCHEMA-BLOCKED (carryover) |

Card verdict: 🟢 **3 of 4 contact rows match mockup; row 4 remains TECH_DEBT.**

**List toolbar + picker + row rendering** (Item B):

| # | Region | Match | Severity | Classification |
|---|---|---|---|---|
| 1 | Toolbar | ✅+ | — | **1:1 + עמודות button added** |
| 2 | Default columns | ✅ | — | INTENTIONAL (D-B3 sensible default) |
| 3 | Picker modal | ✅ | — | **NEW UX delivered** |
| 4 | Future-column UX | ✅ | — | foundation-first pattern (P19) |
| 5 | Post-save row render | ✅ | — | per-tenant choice live |
| 6 | Reload persistence | ✅ | — | SaaS contract honored |
| 7 | Aspirational mockup cols | ⚠ LOW | — | INTENTIONAL — pre-wired in picker, light up later |

List verdict: 🟢 **picker + persistence + future-column discipline all in place.**

**Screenshots delivered:** `card_contact_block.jpeg` + `list_default_columns.jpeg` + `list_6_columns_after_save.jpeg` (3 JPEGs to Daniel via SendUserFile). Picker modal a11y snapshot embedded in TEST_REPORT (JPEG hit a tool-timeout; a11y-equivalence per VISUAL_FIDELITY_GATE P-EXEC-3).

## Findings processing

| # | Severity | Decision |
|---|---|---|
| F-POL-1 | INFO | Resolved. P-EXEC-8 codifies the pattern in opticup-executor SKILL. |
| F-POL-2 | INFO | Resolved. Same as F-POL-1. |
| F-POL-3 | INFO | Test-only. P-AUTHOR-8 codifies the Modal selector reference. |
| F-POL-4 | INFO | A11y snapshot equivalent — accepted per VISUAL_FIDELITY_GATE P-EXEC-3. |
| F-CARD-CONTACT-SCHEMA | PARTIAL | Row 2 (טלפון-עבודה) closed; row 4 still TECH_DEBT. |

## 1 author + 1 executor improvement proposal harvested (small SPEC — relaxed from 2+2)

### P-AUTHOR-8 (also in EXECUTION_REPORT) — Modal-confirm selector reference

New `.claude/skills/opticup-executor/references/CHROME_MCP_SELECTORS.md` file with common selectors (Modal.confirm primary/cancel, Toast container, PIN modal input). Saves smoke iteration time when Modal vs confirmDialog distinction matters.

### P-EXEC-8 — Schema-+-view migration pattern

Append to `opticup-executor` SKILL Step 1.5: schema-touching SPECs that also update a dependent view MUST split into 2 migrations (column-first, view-second). When `CREATE OR REPLACE VIEW` adds a column, the new column must be APPENDED to the SELECT list (Postgres rejects mid-list inserts).

## Master-doc update checklist

| File | Status |
|---|---|
| `MASTER_ROADMAP.md` | N/A — no module phase status change; M5 still 🟢. |
| `docs/GLOBAL_MAP.md` | Will be edited at close — additive note about the new column-picker discipline. |
| `docs/GLOBAL_SCHEMA.sql` | Will be edited at close — note phone_secondary on customers. |
| `docs/DB_TABLES_REFERENCE.md` | Will be edited at close — phone_secondary mention on customers row. |
| M5 SESSION_CONTEXT.md | Will be edited at close. |
| M5 CHANGELOG.md | Will be edited at close. |
| M5 db-schema.sql | ✅ Already edited (total cols now 43). |
| FIELD_MAP / shared-field-map.js | ✅ Updated. |

## Verdict

🟢 **CLOSED.**

Two SaaS-clean improvements delivered through the new Visual-Fidelity Gate. Item A restores mockup parity on the Contact block; Item B is the first per-tenant configurable column experience in the project — wired to existing tenant_settings infrastructure (Iron Rule 21 ✓), with future-column discipline (M6/M7/M13 columns pre-designed into the picker but disabled until their modules ship).

The screenshots were sent to Daniel via SendUserFile so the Architect-relay rule is honored: Daniel sees the live UI before this Foreman writes 🟢.
