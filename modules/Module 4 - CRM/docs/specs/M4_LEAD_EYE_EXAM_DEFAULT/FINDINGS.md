# FINDINGS — M4_LEAD_EYE_EXAM_DEFAULT — Rung 1

Findings discovered during execution that are NOT part of Rung 1's stated scope. Each is logged with severity, location, description, and a suggested follow-up. Per Iron-Rule discipline ("one concern per task"), nothing was fixed inside this Rung.

---

## FINDING #1 — Pre-existing kludge: lead-intake EF concatenated eye_exam into client_notes since v1

- **Severity:** INFO (resolved by this Rung)
- **Location:** `supabase/functions/lead-intake/index.ts` lines 152–156 (before this Rung)
- **Description:** The original `lead-intake` EF (v1, 2026-04-22) had no structured eye-exam column to write to, so it concatenated the value into `client_notes` as `בדיקת עיניים: ${eyeExam}` joined with `\n` to any free-text notes. This was a temporary kludge that survived through Rung 2 of P5_V2_REBUILD until this Rung.
- **Resolution:** removed in Rung 1's commit `c438c75`. New behavior: `eye_exam` writes to `crm_leads.eye_exam_default`; `client_notes` carries only the free-text `notes` field (or NULL if absent).
- **Action:** none — closed by Rung 1 itself. Logged for historical traceability.

---

## FINDING #2 — Pre-existing latent UI bug: crm-leads-detail.js parses client_notes as JSON to read eye_exam

- **Severity:** **HIGH** (broken since v1, masked because nobody noticed)
- **Location:** `modules/crm/crm-leads-detail.js` lines 204–215 (per the activation prompt's findings template)
- **Description:** Per the activation prompt, the ERP lead-detail view reads `JSON.parse(client_notes).eye_exam` — but the EF NEVER wrote `client_notes` as JSON. It wrote a plain Hebrew string starting with `בדיקת עיניים: …`. So `JSON.parse` on this string throws, and the eye-exam field has been blank in the lead-detail UI for every lead since 2026-04-22. This is a silent UI failure: leads have an eye-exam preference recorded, but the staff-facing view never displays it.
- **Why it didn't surface earlier:** the staff Hebrew UI gracefully shows nothing when the parse fails (probably wrapped in try/catch or `??` fallback). Customers/staff didn't notice because the eye-exam preference also wasn't load-bearing for any downstream automation rule yet.
- **Action:** **Rung 2 fixes this directly** by reading `lead.eye_exam_default` from the new column instead of trying to JSON-parse `client_notes`. This is in Rung 2's stated scope per `RUNG_2_ACTIVATION_PROMPT.md`. **No action needed from this Rung beyond logging.**
- **Foreman should verify:** Rung 2's UI patch path actually exists at `modules/crm/crm-leads-detail.js:204-215` (I did not open the file in this Rung — out of scope).

---

## FINDING #3 — FIELD_MAP entry for eye_exam_default not added in Rung 1; deferred to Rung 2 — scope-boundary verification needed

- **Severity:** MEDIUM
- **Location:** `js/shared.js` § FIELD_MAP
- **Description:** Iron Rule 5 requires every new DB field to be added to FIELD_MAP in `shared.js`. Rung 1 added `crm_leads.eye_exam_default` but did NOT touch `shared.js` — the field is consumed only by the EF (server-side, no FIELD_MAP needed) and by the storefront form (separate repo, no FIELD_MAP). The ERP lead-detail UI begins consuming the field in Rung 2; that is when the FIELD_MAP entry should be added per Rule 5.
- **Risk if Rung 2 forgets:** the new column lives outside the Hebrew↔English translation map. Any future ERP UI that tries to display "Eye Exam Preference" via the FIELD_MAP lookup will get a raw column-name fallback instead of the proper Hebrew label.
- **Action:** Foreman to confirm the FIELD_MAP addition is part of Rung 2's task list and is enforced by its execution criteria. If not — write a follow-up SPEC.

---

## FINDING #4 — Hardcoded Hebrew option strings in the EF allow-list — Rule 9 boundary case

- **Severity:** LOW (informational, scope-bounded by SPEC)
- **Location:** `supabase/functions/lead-intake/index.ts` lines 28–33 (`EYE_EXAM_OPTIONS` const)
- **Description:** Iron Rule 9 forbids hardcoded business values. The 4 canonical Hebrew option strings (`לא, אין צורך בבדיקה`, `כן, בדיקה רגילה`, `כן, בדיקת מולטיפוקל`, `יש לי כבר מרשם עדכני`) are hardcoded in the EF. The SPEC's B1 rollout deliberately freezes these strings, so this is acceptable for now. But this is exactly the kind of value that becomes a `tenant_eye_exam_options` configurable table the moment a second tenant onboards and wants different wording or different options (e.g., "Yes, contact-lens fitting" for a contact-lens-heavy chain).
- **Action:** when the second tenant lands (or sooner if a UX change requires editing the strings), promote `EYE_EXAM_OPTIONS` to a tenant-scoped table (`tenant_lead_form_options` or similar). For now: file under "known tech debt, intentional".

---

## FINDING #5 — SPEC was silent on inline doc-update expectations (db-schema.sql, GLOBAL_SCHEMA.sql, FIELD_MAP)

- **Severity:** LOW (process, not code)
- **Location:** N/A — SPEC authoring practice
- **Description:** The activation prompt for Rung 1 enumerated the 3 commit files (migration SQL, EF source, config.toml) but did NOT instruct the executor to update `modules/Module 4 - CRM/docs/db-schema.sql` (the module-scoped DB source-of-truth) or any other doc inline with the commit. CLAUDE.md §10 says doc merges happen at Integration Ceremony, not per-Rung — so technically this is correct. But for fast-moving multi-Rung SPECs, the gap between code change and doc update means the module's `db-schema.sql` is out of sync with the live DB until the entire SPEC closes (across all Rungs). For Rung 1 specifically: a 1-line `ALTER TABLE` snippet in `modules/Module 4 - CRM/docs/db-schema.sql` would have cost 30 seconds.
- **Action:** Foreman to clarify the per-Rung doc-update expectation in the executor skill (or in future SPECs explicitly). I deferred to the strict CLAUDE.md §10 reading and left module-scoped `db-schema.sql` un-updated. If that's wrong, add a doc-update step to Rung 2.

---

## FINDING #6 — `crm_event_attendees_lead_id_fkey` cascades broke a naive cleanup

- **Severity:** LOW (process, useful for future executors)
- **Location:** Test cleanup script in this SPEC's activation prompt
- **Description:** When the test tenant has an active event in `registration_open` or `waiting_list` status, every fresh lead created via `lead-intake` triggers `dispatchFreshLead` → T5 path → upsert into `crm_event_attendees`. A naive `DELETE FROM crm_leads WHERE id IN (…)` then fails with `23503` FK violation. The full dependency chain for a fresh lead on prizma is: `short_links` (8 rows per lead, from URL shortening in dispatched SMS), `crm_message_log` (2 per lead = SMS + email), `crm_event_attendees` (1 per lead).
- **Action:** when authoring future SPECs that exercise `lead-intake` end-to-end, include a canonical cleanup CTE that walks all 7 FKs targeting `crm_leads` (full list from `pg_constraint`: `crm_message_log`, `crm_unsubscribes`, `crm_lead_tags`, `crm_event_attendees`, `crm_lead_notes`, `short_links`, `crm_message_queue`). Recommended: factor into a tenant-scoped SQL helper `purge_crm_lead_with_dependents(uuid[])` callable from QA scripts.

---

## FINDING #7 — Curl on Windows Git Bash mangles UTF-8 in multi-line single-quoted -d bodies

- **Severity:** LOW (executor toolchain)
- **Location:** Toolchain-level — not a code defect
- **Description:** Sending a multi-line single-quoted JSON body containing Hebrew via `curl -d '{ ... "eye_exam":"כן, ..." ... }'` mangles bytes such that the EF sees something other than the visually-identical Hebrew string. Source bytes (file + echo) and deployed bytes (EF source) were verified identical via `xxd`; the over-the-wire bytes were the only difference. Replacing with `curl --data-binary @file.json` (where the file is written via Bash heredoc with explicit UTF-8) makes it work.
- **Action:** add to executor skill reference (this is Proposal 1 of two in EXECUTION_REPORT §9). Also worth a one-line note in the project's TROUBLESHOOTING.md if Hebrew curl payloads will recur in QA scripts.

---

*7 findings logged. None block Rung 2; one (FINDING #3) requires Foreman scope-boundary verification before Rung 2 starts.*
