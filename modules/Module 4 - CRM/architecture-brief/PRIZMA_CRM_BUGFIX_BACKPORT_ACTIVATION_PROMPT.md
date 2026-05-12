# Activation: Prizma CRM Bug Fix Backport — Auto-Attach + Wrong Audience

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 4 - CRM/architecture-brief/PRIZMA_CRM_BUGFIX_BACKPORT_BRIEF.md`

**Mission:** The bug fixed in demo on 2026-05-11 (E2E audit) is still active in Prizma production. Backport the same data-only fix to Prizma's `crm_automation_rules` rows. Pre-flight verifies Prizma's rules match demo's pre-fix shape before any write. If they don't match — escalate, don't improvise. EF dry-run on Prizma in evaluate mode (no live sends). Ship to develop; main-merge is Daniel-only.

**Deliverables:**
- `DIAGNOSIS.md` — Prizma's rules pre-fix shape, side-by-side comparison to demo's post-fix shape
- 2 row UPDATEs on `crm_automation_rules` for Prizma tenant only (Path A)
- OR escalation file if Path B (structural mismatch)
- `TEST_REPORT.md` — EF dry-run results on Prizma (evaluate mode only)
- `READY-FOR-MAIN-MERGE.md` — PR title/body for Daniel to use
- Pre-commit git tag `pre-backport-prizma-event-invite-fix`
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- DECISIONS_LOG entry
- OPEN_TASKS update

**Continuous-Run Mandate (with planned escalation if mismatch):**
- Run in ONE Claude Code chat.
- DO NOT ask Daniel anything UNLESS Prizma's rules structurally differ from demo's pre-fix shape.
- Status lines (one Hebrew line per phase) only.

**Destructive Operations Envelope:**
- 2 single-row UPDATEs on `crm_automation_rules` for Prizma tenant only
- Pre-commit git tag creation
- FORBIDDEN:
  - Any write to Prizma's `tenants` row
  - Any write to demo's rules (already fixed, must remain byte-identical to E2E audit close)
  - Any DELETE
  - Any schema change
  - Any code change to `automation-engine` EF or any other code
  - Any live message during verification (evaluate mode only)
  - Force-push
  - Direct push or merge to `main` (Daniel-only via GitHub PR)
- Anything outside envelope → STOP + escalate

**Phase 1 — Pre-Flight (read-only):**
1. Query Prizma's rules:
   ```sql
   SELECT id, name, action_config, updated_at
   FROM crm_automation_rules
   WHERE tenant_id = <prizma-uuid>
     AND (action_config->>'template_slug' = 'event_invite_waiting_list'
          OR name LIKE '%רשימת המתנה%');
   ```
2. Save full output to DIAGNOSIS.md
3. Query demo's POST-fix rules (the 2 from E2E audit) — confirm they're still in post-fix state
4. Build side-by-side comparison table in DIAGNOSIS.md

**Phase 2 — Path Decision (auto):**

If Prizma's rules contain BOTH:
- `recipient_type = 'cross_event_active_waitlist'`
- `post_action_attendee_upsert.status = 'invited'`

→ **Path A: proceed with UPDATE** (matches demo's pre-fix shape exactly).

If EITHER differs (different recipient_type, or different post_action_attendee_upsert, or no post_action_attendee_upsert, or some unexpected key):

→ **Path B: STOP + escalate** with the actual content. Write `escalations/{TS}_prizma_rule_mismatch.md`. Emit Hebrew line to Daniel.

**Phase 3 — Fix Application (Path A only):**

For each rule (one transaction per rule):
1. Capture pre-state via SELECT, append to DIAGNOSIS.md
2. UPDATE the rule using jsonb operators:
   ```sql
   UPDATE crm_automation_rules
   SET action_config =
     (action_config - 'post_action_attendee_upsert')
     || jsonb_build_object(
          'recipient_type', 'leads_by_status',
          'recipient_status_filter', '["waitlist"]'::jsonb
        )
   WHERE id = '<rule-id>' AND tenant_id = '<prizma-uuid>';
   ```
3. Verify post-state matches demo's post-fix shape

**Phase 4 — EF Dry-Run Verification:**
1. Invoke `automation-engine` EF with `mode='evaluate'` for Prizma tenant + a hypothetical `event_status_change` to `registration_open`
2. Capture plan_items output → save to TEST_REPORT.md
3. Verify: recipients are filtered to `crm_leads.status='waitlist'` only, 0 attendees would be inserted
4. **DO NOT send actual messages.** Evaluate mode only.

**Phase 5 — Pre-Merge Documentation + Rollback Snapshot:**
1. Write `READY-FOR-MAIN-MERGE.md` with PR title + body suggesting:
   - Title: "fix(crm): backport event-invite waitlist fix to Prizma"
   - Body: description of the bug, the 2 rules updated, the EF dry-run verification, the demo verification done 2026-05-11
   - URL pattern: `https://github.com/opticalis/opticup/compare/main...develop?expand=1`
2. Write `ROLLBACK_SQL.md` containing the EXACT SQL to restore Prizma's pre-fix state. Format:
   ```sql
   -- Captured 2026-05-12 by Pipeline before UPDATE
   -- Use this to revert if main-merge causes regression

   UPDATE crm_automation_rules
   SET action_config = '<EXACT-PRE-VALUE-AS-JSONB-LITERAL>'::jsonb
   WHERE id = '<rule-id-1>' AND tenant_id = '<prizma-uuid>';

   UPDATE crm_automation_rules
   SET action_config = '<EXACT-PRE-VALUE-AS-JSONB-LITERAL>'::jsonb
   WHERE id = '<rule-id-2>' AND tenant_id = '<prizma-uuid>';
   ```
   The two PRE-values must be the verbatim `action_config` jsonb captured in Phase 1 (DIAGNOSIS.md). This makes rollback a 2-line copy-paste operation if needed.
3. Write `ARCHITECT_REVIEW_CHECKPOINT.md` — a structured side-by-side diff that the Architect (Daniel + me in Cowork) reviews BEFORE Daniel merges to main. Format:
   ```markdown
   # Architect Review Checkpoint — Prizma Backport

   ## Rule 1: <name> (<id>)
   ### Before
   ```json
   <full pre-fix action_config>
   ```
   ### After
   ```json
   <full post-fix action_config>
   ```
   ### Diff highlights
   - Removed keys: <list>
   - Changed keys: <key>: <before> → <after>
   - Preserved keys: <list>
   - Unexpected keys (present in Prizma but NOT in demo's pre-fix): <list — should be empty; if not, flag>

   ## Rule 2: <name> (<id>)
   <same structure>

   ## Diff Verdict
   - 🟢 Clean — only intended keys changed, no surprises → safe to merge
   - 🟡 Cautious — minor unexpected keys preserved but content unchanged → review with Architect
   - 🔴 Stop — structural difference that wasn't anticipated → escalate before merge
   ```
   The Pipeline auto-classifies the diff into 🟢/🟡/🔴 based on the comparison. Daniel + Architect review this file in Cowork before any main-merge.
4. Daniel reviews ARCHITECT_REVIEW_CHECKPOINT.md, opens GitHub PR, merges via dashboard.

**Success Criteria:**
1. DIAGNOSIS.md with full pre/post comparison
2. Path decision documented (A or B with reasoning)
3. If Path A: 2 UPDATEs applied; Prizma's rules now byte-equivalent to demo's post-fix shape (for the intended keys)
4. EF dry-run on Prizma produces correct filtered recipients + 0 attendee inserts
5. Demo's rules byte-identical to post-E2E-audit state (no regression)
6. `READY-FOR-MAIN-MERGE.md` exists
7. `ROLLBACK_SQL.md` exists with verbatim pre-state SQL (one statement per rule)
8. `ARCHITECT_REVIEW_CHECKPOINT.md` exists with side-by-side diff + auto-classified verdict (🟢/🟡/🔴)
9. Pre-commit git tag exists
10. `npm run verify:integrity` exit 0
11. `npm run smoke` 7/7 PASS
12. Working tree clean
13. Pushed to `origin/develop` (NOT main)

**Closure:** End with ONE Hebrew summary:

> ✅ Prizma CRM Bugfix Backport CLOSED 🟢 — 2 כללי automation בפריזמה מתוקנים. EF dry-run אישר התנהגות נכונה. דמו ללא רגרסיה. ROLLBACK_SQL.md + ARCHITECT_REVIEW_CHECKPOINT.md ({🟢/🟡/🔴}) מוכנים. ממתין לסקירת ארכיטקט ב-Cowork לפני merge ל-main.

או (אם Path B):

> 🛑 Backport נעצר — Prizma's rules differ structurally from demo's pre-fix. Escalation file: {path}. ממתין לארכיטקט.

Begin with pre-flight read-only inspection.
