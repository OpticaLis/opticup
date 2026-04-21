# FINDINGS — CRM_PHASE_B9_VISUAL_QA_AND_FUNCTIONAL_VERIFICATION

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B9_VISUAL_QA_AND_FUNCTIONAL_VERIFICATION/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — CRM messaging templates use `sb.from()` directly (Rule 7 violation)

- **Code:** `M4-R07-01`
- **Severity:** MEDIUM
- **Discovered during:** Phase A visual audit — reading crm-messaging-templates.js
- **Location:** `modules/crm/crm-messaging-templates.js:62-66` (loadTemplates function)
- **Description:** The templates module calls `sb.from('crm_message_templates').select(...)` directly instead of using the `fetchAll` / `batchCreate` / `batchUpdate` helpers from `shared.js` or the `DB.*` wrapper. This violates Iron Rule 7 ("All DB interactions pass through shared.js helpers"). The same pattern exists in `crm-messaging-broadcast.js`, `crm-messaging-rules.js`, `crm-event-day-manage.js`, and several other CRM files. This appears to be a systematic B7/B8 pattern where direct `sb.from()` calls were used throughout the CRM module.
- **Reproduction:**
  ```bash
  grep -rn "sb\.from(" modules/crm/ --include="*.js" | wc -l
  # Expected: 0 (all through helpers)
  # Actual: ~30+ direct calls
  ```
- **Expected vs Actual:**
  - Expected: All DB calls through `fetchAll`, `batchCreate`, etc.
  - Actual: Direct `sb.from()` calls throughout all CRM modules
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** This is pervasive (all 15+ CRM JS files) and functional — migrating to DB.* wrapper should be a dedicated SPEC, not a drive-by fix. Does not cause data issues today since tenant_id is always applied manually, but the wrapper adds error classification, retry logic, and activity logging.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — CRM delete operations use soft-delete via `is_active: false`, not `is_deleted` flag (Rule 3 inconsistency)

- **Code:** `M4-R03-01`
- **Severity:** LOW
- **Discovered during:** Phase A visual audit — reading crm-messaging-templates.js:293-303
- **Location:** `modules/crm/crm-messaging-templates.js:295` (deleteTemplate function)
- **Description:** The template delete function sets `is_active: false` instead of using the standard `is_deleted` soft-delete pattern from Iron Rule 3. While functionally equivalent (the template is hidden from the UI), it diverges from the project-wide convention. The `crm_message_templates` table does have an `is_active` column by design, so this may be intentional — but it means "delete" in the UI doesn't match the standard soft-delete pattern, which could confuse future developers.
- **Reproduction:**
  ```javascript
  // Current (line 295):
  sb.from('crm_message_templates').update({ is_active: false })
  // Standard pattern:
  sb.from('crm_message_templates').update({ is_deleted: true })
  ```
- **Expected vs Actual:**
  - Expected: `is_deleted: true` per Rule 3
  - Actual: `is_active: false` (different column, same effect)
- **Suggested next action:** DISMISS
- **Rationale for action:** The `is_active` flag is a design choice for templates (active vs draft vs deactivated), not a deletion. The UI says "בוטלה" (deactivated), not "נמחק" (deleted). This is intentional dual-state rather than a Rule 3 violation.
- **Foreman override:** DISMISS — agreed with executor reasoning

---

## Findings from Attempt 2 (Claude Code local, browser-verified)

> Added by opticup-strategic (Foreman) from attempt 2 session output.
> Attempt 2 executor reported these in terminal but did not write them to this file.

### Finding 3 — No "add lead" button in CRM UI

- **Code:** `M4-UX-06`
- **Severity:** MEDIUM
- **Discovered during:** Attempt 2 functional QA — criterion #18 (lead creation)
- **Location:** `modules/crm/crm-leads-tab.js` (no creation UI exists)
- **Description:** The CRM has no way to manually create a new lead. All 893 leads were imported from Monday.com (Phase B2). The SPEC criterion #18 said "If 'add lead' exists → create test lead." It does not exist. Users cannot add leads through the UI — only through import scripts.
- **Foreman disposition:** TECH_DEBT — tracked as M4-UX-06. Not a bug (never built), but needed before CRM can replace Monday.com fully

---

### Finding 4 — Demo tenant has no CRM data (duplicate of M4-DATA-03)

- **Code:** `M4-DATA-04`
- **Severity:** LOW
- **Discovered during:** Attempt 2 functional QA — demo tenant page load
- **Description:** Demo tenant (`?t=demo`) loads correctly with 0 console errors but shows empty states for all tabs. No leads, events, or messages exist for the demo tenant.
- **Foreman disposition:** DISMISS — duplicate of M4-DATA-03 already tracked in SESSION_CONTEXT.md

---

### Finding 5 — Phase naming confusion between B9 attempts

- **Code:** `M4-DOC-10`
- **Severity:** LOW
- **Discovered during:** Attempt 2 documentation phase
- **Description:** Attempt 1 and attempt 2 both used "B9" naming but produced separate commit ranges. The CHANGELOG and commit messages needed careful labeling to distinguish the two attempts.
- **Foreman disposition:** DISMISS — resolved by FOREMAN_REVIEW §0 documenting both attempts clearly

---

### Finding 6 — Session expiry when switching tabs via chrome-devtools MCP

- **Code:** `M4-INFRA-01`
- **Severity:** LOW
- **Discovered during:** Attempt 2 browser QA — tab switching
- **Description:** Supabase auth session timed out during slow MCP-driven browser operations. The chrome-devtools MCP tool calls take 5–15 seconds each, and navigating through all 5 tabs required many sequential calls. Not CRM-specific — affects any MCP-driven browser QA session.
- **Foreman disposition:** TECH_DEBT — tracked as M4-INFRA-01. Relevant for future automation SPECs that use browser MCP tools
