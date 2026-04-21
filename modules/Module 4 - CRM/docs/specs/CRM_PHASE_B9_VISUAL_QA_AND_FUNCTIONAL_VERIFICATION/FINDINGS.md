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
- **Foreman override (filled by Foreman in review):** { }
