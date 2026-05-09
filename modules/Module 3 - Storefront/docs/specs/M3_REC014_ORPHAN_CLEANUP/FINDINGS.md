# FINDINGS — M3_REC014_ORPHAN_CLEANUP

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_REC014_ORPHAN_CLEANUP/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `/test-shortcodes/` rows had `is_deleted=true` in addition to SPEC-cited `status='archived'`

- **Code:** `M3-OBS-02`
- **Severity:** INFO
- **Discovered during:** Step 0 SQL pre-flight + DELETE backup capture
- **Location:** `storefront_pages` table — the 3 rows for prizma + slug `/test-shortcodes/` (now deleted; preserved in `pre_delete_test_shortcodes_backup.json`)
- **Description:** SPEC §2 background table cited the rows' state as `status='archived'`. Live pre-flight + full backup capture revealed they ALSO had `is_deleted=true`. So the rows were doubly-hidden (archived AND soft-deleted) before this SPEC's hard delete. This doesn't change the action — hard delete on doubly-hidden test data is the right cleanup — but it tells us the soft-delete pattern was applied to `storefront_pages` at some point in the past despite the table's CMS-page semantics, and the rows survived as soft-deleted-archived for nearly a month before this hard-delete SPEC closed them out.
- **Reproduction:** Pre-DELETE backup JSON in this SPEC folder shows `"is_deleted": true` on all 3 rows.
- **Expected vs Actual:**
  - Expected (per SPEC §2): `status='archived'`.
  - Actual: `status='archived' AND is_deleted=true` on all 3 rows.
- **Suggested next action:** DISMISS
- **Rationale for action:** No bug, no defect, no follow-up needed. The doubly-hidden state was strictly more conservative (more hidden) than the SPEC anticipated. Hard delete remains the right outcome. The observation is logged here for transparency in case a future SPEC wants to audit which `storefront_pages` rows are soft-deleted (e.g. for retention-policy work) — the convention is clearly "use both flags when an admin both archives AND deletes from the editor UI".
- **Foreman override (filled by Foreman in review):** { }

---

> No other out-of-scope findings during this SPEC execution.

The execution surfaced two minor execution-side observations (Postgres CTE-with-DML snapshot semantics, backup-JSON formatting trade-off) — both documented in `EXECUTION_REPORT.md §4 Decisions Made in Real Time` rather than here, because they are decisions about the execution method, not project-side findings.

---
