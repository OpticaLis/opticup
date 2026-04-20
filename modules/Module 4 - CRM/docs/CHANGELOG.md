# Module 4 — CRM: Changelog

---

## Phase A — Schema Migration (2026-04-20)

| Hash | Message |
|------|---------|
| `3c8e9fe` | `feat(crm): add CRM schema migration SQL (23 tables, 7 views, 8 RPCs)` |
| `370b0b9` | `docs(crm): update TODO and close CRM_PHASE_A_SCHEMA_MIGRATION with retrospective` |

---

## Phase B1 — Data Discovery (2026-04-20)

| Hash | Message |
|------|---------|
| `e9e8b5a` | `docs(crm): add Data Discovery Report for Monday exports` |
| `1152602` | `chore(spec): close CRM_PHASE_B1_DATA_DISCOVERY with retrospective` |

---

## Phase B2 — Data Import (2026-04-20)

| Hash | Message |
|------|---------|
| `7912a51` | `feat(crm): add Monday data import scripts (xlsx parser + REST runner)` |
| `8466e6b` | `feat(crm): import Monday data to CRM (leads, events, attendees, ads, CX)` |
| `5c1d7a7` | `chore(spec): close CRM_PHASE_B2_DATA_IMPORT with retrospective` |

---

## Phase B3 — Core UI (2026-04-20)

| Hash | Message |
|------|---------|
| `848b0c3` | `feat(crm): add CRM module card to home screen` |
| `3fb06b7` | `feat(crm): add CRM page structure and shared helpers` |
| `e6aeb12` | `feat(crm): add leads tab with search, filter, pagination, and detail modal` |
| `fda1fb2` | `feat(crm): add events tab and event detail modal` |
| `21918a6` | `feat(crm): add dashboard tab with stats and event performance` |
| `1bb0df6` | `chore(spec): close CRM_PHASE_B3_UI_CORE with retrospective` |

**Post-B3 fixes (pending commit):**
- `fix(crm): correct nav CSS selector — nav#mainNav → nav#crmNav`
