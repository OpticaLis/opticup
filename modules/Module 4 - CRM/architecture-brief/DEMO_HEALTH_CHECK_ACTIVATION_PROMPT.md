# Activation: Demo Tenant — Event Registration Link Fix

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 4 - CRM/architecture-brief/DEMO_HEALTH_CHECK_BRIEF.md`

**Mission:** Daniel reported that opening an event in the demo tenant produces a "registration opened" template with a link pointing to opticalis domain instead of the demo's domain. This blocks his manual test cycle. Diagnose the root cause, propose fix path A/B/C, escalate to Architect for approval, apply fix, verify on demo + read-only check on Prizma. CRM Migration #3 is PAUSED until this is resolved.

**Deliverables:**
- `DIAGNOSIS.md` in SPEC folder (template ID, link generator, domain source, both tenants' config state, root cause)
- Mid-pipeline escalation to Architect after diagnosis (this is INTENTIONAL — Daniel pastes Architect's response back to resume)
- Fix applied at the correct layer
- `TEST_REPORT.md` showing demo URL produced correctly + Prizma URL still correct (read-only)
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- DECISIONS_LOG entry

**Continuous-Run Mandate (with planned escalation):**
- Run in ONE Claude Code chat.
- ONE planned escalation point after diagnosis — Pipeline writes escalation file, emits one Hebrew line, waits for Daniel to paste Architect's path decision back into the same chat.
- After path decision received → Pipeline resumes and runs to completion.
- All other phases automatic.

**Destructive Operations Envelope:**
- POSSIBLY: single-row UPDATE on `tenants` table for demo tenant (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`) — scoped, single row, non-destructive in practice
- POSSIBLY: Edge Function redeploy or RPC update — code changes
- FORBIDDEN: any UPDATE on Prizma's tenants row, any DELETE, any schema change, any force-push, any merge to main, any actual outbound message
- Anything outside this envelope → STOP + escalate

**Diagnostic Path (run in order):**
1. Find the template body matching "נפתחה הרשמה" or "אירוע" + "הרשמה" — get template_id, placeholder used for link
2. Find the link generator (Edge Function / RPC / client-side) — trace the codepath that fills the placeholder
3. Find the domain source — hardcoded? `tenants.domain` lookup? JWT claim? Fallback?
4. Query `tenants` row for demo (UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`) — inspect domain/custom_domain/public_url
5. Query `tenants` row for Prizma — inspect same columns
6. Compare and identify root cause

**After diagnosis — STOP and ESCALATE.** Write `escalations/{TS}_demo_link_root_cause.md` with:
- Root cause (1-2 sentences)
- Proposed fix path:
  - Path A: demo tenant config missing → single UPDATE on demo's tenants row
  - Path B: shared codepath fallback is wrong → fix the EF/RPC
  - Path C: both
- Risk for each path
- Architect recommendation

Emit Hebrew line to Daniel: `🛑 אבחון הושלם — דורש החלטה אסטרטגית של הארכיטקט. קובץ: {path}`

Daniel goes to Cowork, Architect reads, returns Architect Decision template. Daniel pastes back. Pipeline resumes.

**Post-decision phase:**
- Apply fix at the chosen layer
- Trigger the template generation on demo tenant — capture the actual URL string produced — paste into TEST_REPORT.md
- Read-only check on Prizma — query the link generator's output without sending — paste produced URL into TEST_REPORT.md
- Verify: demo URL contains demo's domain (not opticalis); Prizma URL contains prizma-optic.co.il
- If demo fix succeeded AND Prizma regression-clean → CLOSE 🟢
- If Prizma URL changed unexpectedly → STOP + escalate (regression)

**Success Criteria (self-verifies):**
1. DIAGNOSIS.md exists with all required sections
2. Escalation file written + Hebrew line emitted to Daniel
3. After Daniel paste-back: fix applied
4. demo's event-link URL correct (paste in TEST_REPORT.md)
5. Prizma's link generator unchanged (read-only check, paste output)
6. No outbound message sent
7. No Prizma tenants row touched
8. `npm run verify:integrity` exit 0
9. `npm run smoke` 7/7 PASS
10. Working tree clean
11. Pushed to `origin/develop` (NOT main)
12. DECISIONS_LOG entry written

**Forbidden:**
- Speculative fix before diagnosis
- UPDATE on Prizma's tenants row
- Any outbound message (SMS / Email / WhatsApp) during the SPEC
- Schema changes
- Merge to main

**Closure:** Pipeline writes FOREMAN_REVIEW.md + 2 lessons each to opticup-strategic + opticup-executor. End with ONE Hebrew summary:

> ✅ Demo Health Check CLOSED 🟢 — קישור אירוע מתוקן. דמו מוכן לסבב טסטים ידני של דניאל. Prizma ללא רגרסיה. הבא: המשך CRM migration.

Begin with diagnosis. Do NOT skip the escalation.
