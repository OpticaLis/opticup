# FINDINGS — C1_LEAD_INTAKE_PIPELINE

> **Date:** 2026-04-21
> **SPEC:** `modules/Module 4 - CRM/go-live/specs/C1_LEAD_INTAKE_PIPELINE/SPEC.md`

---

## Finding 1: Make Template Interpolation May Need Tuning

**Severity:** MEDIUM
**Category:** Integration

The Make scenario uses `replace()` to substitute `{{name}}`, `{{phone}}`,
`{{email}}` in template text fetched from Supabase. However:

- Make's own template syntax also uses `{{}}` — there may be conflicts if
  Make tries to parse the DB template text as its own expressions
- The `replace()` nesting (`replace(replace(replace(...)))`) may need
  adjustment after the first live test reveals the actual response format

**Recommended action:** During the first live test, check if Make correctly
passes through the `{{name}}` literal from DB before the `replace()` runs.
If Make pre-processes it, switch to a different placeholder format (e.g.,
`[[name]]`) in the DB templates.

---

## Finding 2: Rule 21 Hook False Positives (Recurring)

**Severity:** LOW
**Category:** Tooling (M4-TOOL-01, recurrence #4)

The `rule-21-orphans` pre-commit hook flagged 8 false positives for
IIFE-local function/variable names shared between `crm-incoming-tab.js`
and `crm-leads-tab.js`. This is the same pattern-matching limitation
reported in B3, B5, and B8.

Names flagged: `populateFilters`, `wireEvents`, `applyFiltersAndRender`,
`statuses`, `search`, `statusFilter`, `name`, `phone`.

**Workaround applied:** Renamed all in `crm-incoming-tab.js` to
`populateIncomingFilters`, `wireIncomingEvents`, `applyIncomingFilters`, etc.

**Recommended action:** The hook grep cannot distinguish IIFE-scoped locals
from globals. Options: (a) teach the hook about IIFE boundaries, (b) add
an allowlist for known CRM IIFE patterns, (c) accept the rename convention
as standard practice for CRM files. Option (c) is already de facto standard.

---

## Finding 3: Cowork VM Cannot Test CRM UI

**Severity:** LOW
**Category:** Environment

Cowork sandbox runs in a cloud VM without access to localhost:3000 where
the ERP serves. This means:

- CRM console error checks (SPEC criterion 17) cannot be verified
- Visual regression cannot be confirmed
- Only Claude Code running on Daniel's local machine (Windows desktop/laptop)
  can perform browser-based QA

**Recommended action:** For future Go-Live SPECs, split testing criteria:
(a) structural/code criteria verifiable in Cowork, (b) browser/visual
criteria that must run on Claude Code local. Tag each criterion accordingly
in the SPEC.

---

## Finding 4: Webhook Input Format Assumption

**Severity:** LOW
**Category:** Integration

The Make scenario assumes the storefront form sends data in the format:
```json
{
  "fields": {
    "name": { "raw_value": "..." },
    "phone": { "raw_value": "..." },
    ...
  }
}
```

This matches the existing Scenario 1A-S webhook input (analyzed from the
production scenario blueprint). However, if the demo storefront form sends
data in a different format (e.g., flat JSON `{ "name": "...", "phone": "..." }`),
the webhook data structure mapping in the new scenario will need updating.

**Recommended action:** During test, if the first webhook run fails with
mapping errors, check the webhook's "Determine data structure" output in
Make and adjust field references accordingly.

---

## Finding 5: SPEC Criterion #15 Text Mismatch

**Severity:** LOW
**Category:** Documentation

SPEC §3 criterion #15 says: `SELECT count(*) FROM crm_message_templates
WHERE trigger_event LIKE 'lead_intake%'`. But `crm_message_templates` uses
`slug` not `trigger_event` as the identifier column. The correct query is:
`SELECT count(*) FROM crm_message_templates WHERE slug LIKE 'lead_intake%'`.

**Recommended action:** Fix the SPEC criterion text if a FOREMAN_REVIEW
is written. Not a functional issue — the templates are correctly inserted
using `slug`.

---

## Summary Table

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | Make template interpolation conflict risk | MEDIUM | Test during first live run |
| 2 | Rule 21 hook false positives (4th recurrence) | LOW | Accept rename convention |
| 3 | Cowork VM cannot test CRM UI | LOW | Split criteria in future SPECs |
| 4 | Webhook input format assumption | LOW | Verify on first test run |
| 5 | SPEC criterion text mismatch (slug vs trigger_event) | LOW | Documentation fix |
