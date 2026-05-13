# FINDINGS — BROADCAST_EVENT_LINK_SUPPORT

> **Location:** `modules/Module 4 - CRM/docs/specs/BROADCAST_EVENT_LINK_SUPPORT/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `crm_message_queue.error_message` truncates the unsubstituted-placeholder name

- **Code:** `M4-DEBT-QUEUE-ERROR-MESSAGE-WIDTH`
- **Severity:** LOW
- **Discovered during:** E2E #3 verification (SPEC §3 criterion 11)
- **Location:** `crm_message_queue.error_message` column + the dispatch-queue / send-message error-write path
- **Description:** When the `send-message` EF rejects a row with `unsubstituted_placeholder: <name>`, the full error lands in `crm_message_log.error_message` (e.g. `unsubstituted_placeholder: nonsense`) but the matching `crm_message_queue.error_message` column was found to contain only the prefix `unsubstituted_placeholder` (the `: <name>` suffix is missing). The criterion 11 verification had to inspect the log table specifically to confirm which placeholder caused the failure. This is a usability degrade for operators inspecting the queue — they see "unsubstituted_placeholder" but not which one.
- **Reproduction:**
  ```sql
  SELECT id, error_message FROM crm_message_queue WHERE id='ffa3b671-ffa1-4157-a812-1f3e204ef22e';
  -- returns: error_message = 'unsubstituted_placeholder'
  SELECT id, error_message FROM crm_message_log WHERE id='876d08b6-3b10-40cc-a17c-2ac41892861a';
  -- returns: error_message = 'unsubstituted_placeholder: nonsense'
  ```
- **Expected vs Actual:**
  - Expected: `crm_message_queue.error_message` carries the same precision as `crm_message_log.error_message` (operator can debug from queue table alone).
  - Actual: queue table loses the suffix; full info only in log table.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Not a blocker for this SPEC (the log table has the truth). But low-cost to fix in a future M4 hygiene SPEC — either widen the column (if VARCHAR(N)) or write the full string consistently in both tables. Likely the dispatch-queue EF truncates before INSERT into queue. Worth a 5-minute follow-up SPEC bundled with other M4 hygiene items.
- **Foreman override (filled by Foreman in review):** { }

---

## End of findings
