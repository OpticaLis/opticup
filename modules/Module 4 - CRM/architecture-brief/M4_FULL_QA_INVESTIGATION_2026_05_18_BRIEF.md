# M4 Full QA Investigation — Demo End-to-End Audit (2026-05-18)

**Status:** Read-only investigation. NO file writes. NO commits. NO migrations. NO EF deploys. Pure forensic audit on `demo` tenant.

**Authored by:** Architect (Cowork, 2026-05-18 evening)
**Pipeline mode:** Investigation-only (deviation from Full-Auto Pipeline — see §1)
**Target:** Module 4 (CRM) full surface area on demo tenant
**Owning module:** Module 4 - CRM
**Co-existing pipeline:** `M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A` is running on `develop` (executor-2a). This investigation MUST NOT touch any file in M1 lens-catalog-admin scope or write to develop.

---

## 1. Pipeline Mode — Investigation-Only (Deviation from Default)

This is NOT the Full-Auto Pipeline. The Architect is explicitly invoking **Investigation-Only Mode** because:

1. **Concurrent Pipeline Lock:** `M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A` is running. Per CLAUDE.md §9 Parallel Pipeline Coordination, any session that would touch repo files MUST claim a lock + check collision. This investigation avoids the question entirely by writing ONLY to `outputs/` (Cowork session temp area) and NOT to the repo at all.
2. **Daniel directive:** "כרגע זאת רק הכנה לעבודה" — Daniel wants a written audit + remediation plan, NOT execution. Decisions will be locked after the audit + after the M1 Pipeline closes.
3. **Risk surface:** unknown regressions in M4 (user-reported: confirmation modal flashes for ~1s on every status change, swallowing user input + skipping message send). Touching code without a written audit is exactly the anti-pattern that produced the bug in the first place.

**The investigator's deliverable is a single Markdown report**, written to:
`/sessions/affectionate-zealous-newton/mnt/outputs/M4_FULL_QA_REPORT_2026_05_18.md`

That report becomes the input to a follow-up SPEC after the M1 Pipeline closes.

---

## 2. Background — User-Reported Symptom (the trigger)

**Daniel's report (2026-05-18 evening):**

> "משום מה לא משנה איזה סטטוס במערכת מתחלף — יש חלון שקופץ ונעלם אחרי כשנייה גם כשלא צריך לשלוח שום הודעה. וכשצריך לשלוח הודעה קורה בדיוק אותו הדבר ואין את האפשרות לשלוח אותה. כנראה משהו בעידכונים האחרונים של המודול שבר אותו."

**Visual evidence (attached screenshots):**

- **Screenshot 1:** "אישור פעולה" modal visible briefly. Inside: "מחשב נמענים..." + "טוען פרטי נמענים מהשרת..." spinners. Primary CTA: "אישור ושלח הודעות (0)" — count is 0 even though the event has 1 registered attendee per the parent screen. Secondary actions: "אישור ללא הודעה", "שלח טסט ל-3 הראשונים", "ביטול". Top-right toast: "סטטוס עודכן: הרשמה פתוחה" (green checkmark).
- **Screenshot 2:** Modal already dismissed. Two toasts visible top-right: green "סטטוס עודכן: תכנון" + amber "אין נמענים — ההודעה לא תישלח."

**Symptom signature:**
- Modal appears
- Modal auto-dismisses after ~1s
- "סטטוס עודכן" toast fires (status WAS persisted)
- Sometimes amber "אין נמענים" toast fires after
- User never had a chance to click confirm OR cancel
- Status changed; message never sent (even when it should have)

**Daniel's hypothesis:** recent updates to M4 broke something. Likely candidates from recent SPEC history:
- `STATUS_CHANGE_TRIGGERS_FRAMEWORK_2026_05_13` (introduced DB-trigger → queue → consumer flow; rewrote `crm-automation-engine.js`; added `fires_on` UI picker)
- `M4_V2_MODAL_SESSION_RESTORE_FIX` (modal lifecycle)
- `BROADCAST_EVENT_LINK_SUPPORT` (event_id propagation through queue)
- `MIGRATION_3_CRM` (Tailwind utility-class swaps on crm.html)
- `M4_DRY_RUN_PREVIEW_AND_DISPATCH` + `M4_DRY_RUN_PREVIEW_E2E_VALIDATION` (the very "אישור פעולה" preview modal in the screenshot)

These are pure hypotheses. The investigator validates by reading code + DB state.

---

## 3. Scope

### In-scope

**Module 4 (CRM) only.** Full surface area on demo tenant (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345):

1. **Leads pipeline** — lead-intake EF → `crm_leads` → automation rule eval → `crm_message_queue` → dispatch-queue EF → SMS/Email/WhatsApp send → `crm_message_log`
2. **Events** — event create, update, status changes (תכנון → הרשמה פתוחה → הרשמה סגורה → ...), attendee register/invite/check-in/cancel, capacity enforcement (`v_crm_event_stats`), waitlist auto-promote
3. **Broadcasts** — broadcast create, recipient resolution, dry-run preview ("אישור פעולה" modal flow), confirm + send, queue drain
4. **Automation rules** — rule editor UI, `fires_on` picker (added by STATUS_CHANGE_TRIGGERS_FRAMEWORK), trigger types (status_change events from DB trigger), action types (send_message), condition operators
5. **Message dispatch** — dispatch-queue EF logic (parallel SMS/Email/WhatsApp groups, scheduled_for handling, allowlist gates demo-only SMS + email), retry behavior
6. **Status-change framework** — `crm_status_change_events` queue, DB triggers on `crm_event_attendees.status` + any other registered entities, `crm_trigger_type_registry`, automation-engine consumer loop
7. **Modals & UI flows** — preview modal lifecycle (the bug), inline-edit modals, broadcast wizard, event detail modal
8. **Permissions** — staff CRM access (view leads, edit events, send messages), tenant-scoped RLS on all M4 tables

### Out-of-scope (do NOT touch)

- **M1 lens-catalog-admin scope** — owned by the concurrent Pipeline. Read of files inside that scope is also forbidden (avoid even file-tool reads on lens-catalog-admin/*).
- **Storefront repo** (`opticalis/opticup-storefront`) — separate repo. Read-only access is fine for understanding lead-intake handoff, but the audit is M4-only.
- **Prizma production data** — read-only safe queries are OK (count(), sample 1 row, schema introspection). NO writes, NO updates, NO E2E test phone numbers other than Daniel's 3 (0537889878 / 0503348349 / per memory).
- **Other modules** (M2 platform admin, M3 storefront, etc.) — not the focus.

### Categorically forbidden actions

- Any `git add` / `git commit` / `git push` / `git stash` / branch ops
- Any `Write` / `Edit` / `Replace` tool call inside the repo (`C:\Users\User\opticup`)
- Any `mcp__71e952df-c264-48ea-bc4b-2e8cddd3a111__apply_migration` / `deploy_edge_function` / `execute_sql` with mutating statements
- Any `claim`/`heartbeat` against the pipeline lock folder (this is investigation, not Pipeline)
- Any modification of Prizma tenant data on Supabase

The investigator's tool surface is: **Read** (file tool), **Grep**, **Glob**, **Bash** (read-only commands only — `git status`, `git log`, `cat`, `grep`, `head`, `tail`, `wc`, `find`, `ls`), **Chrome MCP** (browser automation against `https://app.opticalis.co.il/` or `http://localhost:3000/` if available, demo tenant only), **Supabase MCP** (`execute_sql` with read-only SELECT statements), **WebFetch** where useful.

---

## 4. Destructive Operations

**None.**

This investigation is categorically read-only. The investigator must STOP and write an escalation to `outputs/` if it encounters a need for any of the operations listed in CLAUDE.md Iron Rule 32 §"Destructive."

---

## 5. Investigation Plan (the 8 surfaces)

The investigator covers these 8 surfaces in order. For each surface: discover code + state, reproduce in Chrome, capture screenshots, query DB, document findings.

### Surface 1 — Status-change confirmation modal (the user-reported bug)

**Priority:** CRITICAL. Reproduce first; this is the head bug.

**Hypothesis tree:**
- H1: The modal's auto-dismiss timer (introduced for "no recipients" path) is firing on ALL paths
- H2: The recipient-resolution query is racing — modal opens before count is computed, then auto-dismisses on count=0
- H3: A toast event handler is incorrectly triggering modal.close()
- H4: STATUS_CHANGE_TRIGGERS_FRAMEWORK introduced a duplicate code path — both the old "code-call" preview AND the new "DB-trigger-queue" path are firing, with one closing the other's modal
- H5: A CSS regression from MIGRATION_3_CRM made the modal display:none after class-toggle race

**Reproduction recipe (Chrome MCP):**
1. Navigate `https://app.opticalis.co.il/crm.html` with demo creds (or localhost:3000 if Daniel has it running). Login PIN 12345 as user with crm.* perms.
2. Open Events tab. Pick the live "אירוע המותגים מאי 26 - TEST2" (event #28 from the screenshot).
3. Trigger status change: "הרשמה פתוחה" → "תכנון" (or whatever transition has an automation rule).
4. Capture screen recording / sequential screenshots of modal lifecycle: open → contents → close.
5. Read browser console + network tab for the same window.
6. Repeat the transition that SHOULD send a message (e.g. "תכנון" → "הרשמה פתוחה" if a rule is registered for that transition). Document what happens.

**Code surfaces to read (M4 only):**
- `js/crm-automation-engine.js` (browser engine mirror — rebuilt by STATUS_CHANGE_TRIGGERS_FRAMEWORK)
- `js/crm-events-tab.js` (events board UI)
- `js/crm-modal-*` / `js/crm-broadcast-wizard.js` / any file with "אישור פעולה" / "preview" / `confirm` / `dry-run` references
- `crm.html` (recent Tailwind class swaps from MIGRATION_3_CRM)

**DB queries (read-only):**
```sql
-- Was a status_change_event row inserted when modal flashed?
SELECT id, entity_type, entity_id, old_status, new_status, created_at, consumed_at
FROM crm_status_change_events
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
ORDER BY created_at DESC LIMIT 20;

-- Which automation rules are wired for event status transitions?
SELECT id, name, trigger_type, action_type, fires_on, conditions, action_config, is_active
FROM crm_automation_rules
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND (trigger_type ILIKE '%status%' OR trigger_type = 'event_status_change' OR fires_on IS NOT NULL)
ORDER BY name;

-- Anything fresh in the queue?
SELECT id, status, channel, scheduled_for, lead_id, event_id, created_at, error_message
FROM crm_message_queue
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
ORDER BY created_at DESC LIMIT 50;

-- Anything fresh in the log?
SELECT id, status, channel, lead_id, event_id, error_message, dispatched_at
FROM crm_message_log
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
ORDER BY dispatched_at DESC LIMIT 50;
```

**Expected output of Surface 1:**
A section titled "Surface 1 — Status modal bug" in the report, with:
- Reproduction confirmed YES/NO
- Root cause classification (which H1-H5 hypothesis fits, or new)
- Code locations identified (file + line range)
- DB evidence (which queries returned what)
- Severity: CRITICAL/HIGH
- Proposed fix (Architect-tier — one paragraph, NOT a SPEC)

### Surface 2 — Leads pipeline end-to-end on demo

Submit a test lead through the storefront demo form (or via direct EF call with `curl`-equivalent through `execute_sql`'s HTTP wrapper, demo tenant), follow it through:
- `lead-intake` EF success → `crm_leads` row → automation-engine pickup → `crm_message_queue` row → dispatch-queue drain → `crm_message_log` row → SMS hits Daniel's whitelisted phone (or skips with `email_not_allowed`/`status='skipped_no_token'` cleanly)

**Test data:** ONLY 0537889878 or 0503348349 — never anything else (per memory `feedback_test_phone_numbers.md`).

Document any breakage. If lead-intake works but automation doesn't fire, that's a finding. If automation fires but dispatch fails, that's a finding. Etc.

### Surface 3 — Events module

For event lifecycle on the test event (#28 "אירוע המותגים מאי 26 - TEST2"):
- Read current state from DB
- Verify capacity counter math matches UI (`v_crm_event_stats`, exclude `status='invited'` per M4_INVITED_GHOST_ATTENDEE_FIX)
- Test status transitions in Chrome — capture which transitions fire which rules
- Test attendee register/cancel/check-in flows
- Test waitlist auto-promotion (PRIZMA_CRM_BUGFIX_BACKPORT scope)
- Verify soft-delete + restore (DELETE_EMPTY_EVENT + RESTORE_DELETED_EVENT_UI)

### Surface 4 — Broadcast wizard

Open broadcast wizard for the test event. Walk through every step. Capture:
- Audience selection — does it correctly count recipients?
- Template selection — pre-fills correctly?
- Schedule field — accepts immediate + future?
- Preview modal — same "אישור פעולה" modal as Surface 1? If yes, same bug? If different, separate bug.
- Confirm → does it actually enqueue rows in `crm_message_queue`?

### Surface 5 — Automation rules editor

Open the rules editor. For 3-5 representative rules:
- Read rule's `trigger_type`, `fires_on`, `conditions`, `action_config` in DB
- Compare against what UI shows
- Verify `fires_on` sub-picker (added by STATUS_CHANGE_TRIGGERS_FRAMEWORK) renders + saves
- Test creating a new rule, save, reload, verify

### Surface 6 — Dispatch-queue EF behavior

Manually invoke `dispatch-queue` EF on demo (or wait for pg_cron tick):
- Does it claim queue rows atomically?
- Does it respect demo SMS + email allowlists? (test_mode_sms_allowlist + ui_config.test_mode_email_allowlist)
- Does it call Make webhook correctly?
- Does it write to `crm_message_log` with correct status?
- Does it handle the parallel-by-group multi-channel send (STATUS_CHANGE_TRIGGERS_FRAMEWORK's 26× improvement claim)?

Read the EF source from Supabase MCP. Compare against what the SPEC retrospective claimed.

### Surface 7 — Permissions / RLS

For demo tenant + a non-crm-admin user:
- Can they see leads they shouldn't?
- Can they cross-tenant read? (cross-tenant probe)
- Are all M4 tables protected by canonical 2-policy pattern (service_bypass + tenant_isolation via JWT claim)?

Use Supabase advisors + direct `pg_policies` query.

### Surface 8 — Recent regression candidates

For each of these SPECs (closed in last 2 weeks), trace what they touched + verify whether their claimed deliverables still hold:
- STATUS_CHANGE_TRIGGERS_FRAMEWORK (2026-05-13)
- BROADCAST_EVENT_LINK_SUPPORT (2026-05-13)
- M4_V2_MODAL_SESSION_RESTORE_FIX
- M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1
- M4_AUTOMATION_RULES_UPDATED_AT
- M4_INVITED_GHOST_ATTENDEE_FIX
- M4_DRY_RUN_PREVIEW_AND_DISPATCH + M4_DRY_RUN_PREVIEW_E2E_VALIDATION
- MIGRATION_3_CRM (Tailwind class swaps)
- M4_FAILED_MESSAGE_BADGE_CLEANUP

For each: did its commits land cleanly on develop? Are its claimed assertions in the FOREMAN_REVIEW still observably true on demo? Document drift if any.

---

## 6. Deliverable Specification

**ONE file:** `/sessions/affectionate-zealous-newton/mnt/outputs/M4_FULL_QA_REPORT_2026_05_18.md`

**Sections, in order:**

1. **Executive Summary** (≤200 words, Hebrew) — for Daniel. The 3-5 most important findings, sorted by severity. Lead with the modal bug.
2. **Methodology** — what was tested, what Chrome MCP did, what queries ran, what was excluded and why.
3. **Surface-by-surface findings** — 8 sub-sections, one per surface above. Each finding gets:
   - Title
   - Severity (CRITICAL / HIGH / MEDIUM / LOW / INFO) per opticup-guardian classification
   - Reproduction (steps that an executor can re-run)
   - Evidence (file:line for code; SQL output for DB; screenshot reference for UI)
   - Hypothesis on root cause
   - Proposed remediation (1 paragraph — Architect-tier, NOT a SPEC. Names the area + the approach, not the exact code change.)
4. **Cross-cutting observations** — patterns across multiple surfaces (e.g., "3 separate UI files all swallow promise rejections silently — symptom of a missing global error handler")
5. **Risk classification** per opticup-guardian (live-customer-harm vs theoretical-edge-case)
6. **Proposed SPEC slate** — list of SPECs that would close the findings, ordered by priority + dependency. For each: SPEC slug suggestion, scope summary (1 sentence), estimated time, blockers.
7. **Visual evidence appendix** — Chrome MCP screenshots saved to `outputs/M4_QA_SCREENSHOTS_2026_05_18/` with filenames matching the findings.
8. **Open questions for Daniel** — anything the investigator couldn't decide without strategic input.

---

## 7. Hard Constraints

1. **NO writes to the repo.** Everything goes to `outputs/`. The single Markdown report + the screenshot folder. That's it.
2. **NO Pipeline lock claim.** This is not a Pipeline. Skip the entire claim/heartbeat dance.
3. **Read-only DB.** SELECT only. Use `mcp__71e952df-c264-48ea-bc4b-2e8cddd3a111__execute_sql` for read queries on demo; if a query needs to mutate, STOP and document instead.
4. **Demo tenant only.** Prizma is read-only for schema introspection ONLY (`information_schema`, `pg_policies`, etc.). Never Prizma row data writes.
5. **One investigator session.** No subagents. The Claude Code session that picks this up does the whole investigation linearly.
6. **No file edits in M1 lens-catalog-admin scope.** Even reads: avoid unless absolutely necessary for understanding M4's relationship.
7. **STOP triggers:**
   - Any operation that would require a write on the repo → STOP + write `outputs/M4_QA_ESCALATION.md` + emit one Hebrew line to Daniel.
   - Discovery of a CRITICAL live-customer-harm bug (e.g., actual customer leads being dropped silently on Prizma) → STOP + escalate immediately, before continuing the audit.
   - Any DB query returning unexpected size (>10MB result) → summarize via aggregate, don't dump.

---

## 8. Expected Wall-Clock

40-60 minutes if everything's accessible. Up to 90 if Chrome MCP needs to navigate slowly or DB queries reveal layered findings.

---

## 9. Why This Brief Exists (Architect's reasoning, for the record)

Daniel reported a user-visible bug + asked for a comprehensive audit before any fixes. The Default Mode (Full-Auto Pipeline) doesn't fit because:
- Daniel explicitly said "כרגע זאת רק הכנה לעבודה" — prep, not execution
- A concurrent Pipeline is running on the same repo; touching files now risks a coordination incident
- The bug class (modal lifecycle + status framework + dispatch) spans multiple SPECs from the last 2 weeks. A thorough audit will produce a SPEC slate, not a single SPEC.

Investigation-Only Mode is the right shape: collect evidence first, plan SPECs after the M1 Pipeline closes, then dispatch via Full-Auto Pipeline as usual.

This Brief is the input. The output is a Markdown report that becomes the next Architect-Daniel strategic conversation.

