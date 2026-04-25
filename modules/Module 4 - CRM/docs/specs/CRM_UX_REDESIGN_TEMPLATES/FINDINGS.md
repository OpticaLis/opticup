# FINDINGS — CRM_UX_REDESIGN_TEMPLATES

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_UX_REDESIGN_TEMPLATES/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — JS string-length is not a reliable proxy for PG `LENGTH()`

- **Code:** `M4-INFO-CRMUX-01`
- **Severity:** INFO
- **Discovered during:** §3 criterion 12 verification (Email body unchanged after pure-load).
- **Location:** N/A (general execution methodology, surfaced by `crm-messaging-templates.js` body-length check).
- **Description:** The SPEC's criterion 12 specifies `LENGTH=12957` for the Email row of `event_invite_new`. Verifying via JS yielded three different numbers for the same row's body content:
  - `_crmMessagingTemplates()[i].body.length` → 12,962 (raw string from Supabase JSON; 5 surrogate-pair emoji codepoints inflate JS UTF-16 code-unit count above PG character count)
  - `<textarea>.value.length` after rendering → 12,770 (browser's textarea normalizes `\r\n` line endings to `\n`, removing 187 `\r` characters)
  - PG `LENGTH(body)` via SQL → 12,957 (canonical, matches SPEC baseline)
- **Reproduction:**
  ```sql
  SELECT id, LENGTH(body) FROM crm_message_templates WHERE id='275da2b7-0714-4b0b-b72d-…';
  -- 12,957
  ```
  ```javascript
  window._crmMessagingTemplates().find(t => t.id === '275da2b7-…').body.length
  // 12,962
  document.querySelector('[data-section-channel="email"] textarea').value.length
  // 12,770
  ```
- **Expected vs Actual:**
  - Expected: a single canonical body length verifiable from any path.
  - Actual: 3 different numbers, all internally consistent, only PG matches the SPEC criterion.
- **Suggested next action:** TECH_DEBT — but really, this is a documentation/methodology improvement.
- **Rationale for action:** Encoded into Executor-Skill Improvement Proposal 2 (EXECUTION_REPORT §8). The SPEC author already specified SQL as the verify command for criterion 12, so the SPEC was correct — the lesson is for future executors to never substitute JS `.length` even casually. No production code change needed.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `auto` filter category in templates sidebar is non-functional

- **Code:** `M4-DEBT-CRMUX-02`
- **Severity:** LOW
- **Discovered during:** Refactor of `filterLogical()` (preserved the existing `auto` category).
- **Location:** `modules/crm/crm-messaging-templates.js:130` (line ~130 in the new code, was line 120 in the old code).
- **Description:** The "אוטומטי" category tab in the sidebar always returns `false` from the filter, meaning clicking it shows zero templates. To work correctly, the category would need to JOIN against `crm_automation_rules.action_config.template_slug` to determine which templates are "in use" by an automation rule. The current behavior — return all-false — is the same as the pre-refactor behavior (carried verbatim per SPEC §7 out-of-scope: "DO NOT FIX HERE").
- **Reproduction:**
  1. Open Templates tab.
  2. Click the "אוטומטי" pill in the sidebar.
  3. Result: empty list, "אין תבניות".
- **Expected vs Actual:**
  - Expected: list of templates referenced by at least one active automation rule (about 11 base slugs given current rules).
  - Actual: empty list always.
- **Suggested next action:** NEW_SPEC (combine with the upcoming `CRM_UX_REDESIGN_AUTOMATION` SPEC, since the JOIN that powers this filter is naturally part of the automation editor's data model).
- **Rationale for action:** The filter is non-blocking (the "הכל" tab works), and SPEC §7 explicitly defers it. Bundling into the next SPEC saves a separate cycle.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Name-divergence handling not implemented; deferred per SPEC §7

- **Code:** `M4-INFO-CRMUX-03`
- **Severity:** INFO
- **Discovered during:** Implementation of `groupByBaseSlug` and decision §4.5 in EXECUTION_REPORT.
- **Location:** `modules/crm/crm-messaging-templates.js:65–80` (groupByBaseSlug; the `g.name = stripChannelSuffix(r.name) || g.name` line).
- **Description:** SPEC §7 ("Out of scope") notes that if SMS and Email rows of the same base slug have divergent `name` columns (after stripping the channel suffix), the editor should pick one and "log a warning to console". My implementation picks the last `is_active=true` row in iteration order (effectively whichever appears last in the SQL `ORDER BY name` result), without logging. On demo, all 13 base slugs have consistent names across SMS and Email rows, so the warning would never fire — implementing it would be dead code in the current dataset. If a future SPEC introduces a tenant where divergence does occur, the warning should be added.
- **Reproduction:**
  ```sql
  SELECT slug, name FROM crm_message_templates
  WHERE tenant_id='8d8cfa7e-…' AND slug LIKE 'event_invite_new_%';
  -- both rows: name = 'הזמנה לחדשים — SMS' and 'הזמנה לחדשים — Email'
  -- stripped: both 'הזמנה לחדשים' — no divergence
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §7): when divergence occurs, console.warn fires.
  - Actual: silent first-active-wins selection, no warning.
- **Suggested next action:** DISMISS (or add to TECH_DEBT for future-tenant readiness).
- **Rationale for action:** SPEC explicitly out-of-scope. The corrective action (surface a warning when stripped-names diverge across channels of the same base slug) is a 4-line addition that can be revisited if real-world data ever exhibits it. Not blocking.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.*
