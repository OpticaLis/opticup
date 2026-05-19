You are running a Full-Auto Pipeline SPEC for the Optic Up project. Read the Brief at:

`modules/Module 4 - CRM/architecture-brief/M4_STATUS_CHANGE_MODAL_GATE_FIX_BRIEF.md`

Author the SPEC (Foreman), then execute via Foreman → Executor → Reviewer → Localhost-Tester → Foreman close.

**Pre-conditions:**

1. `M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX` 🟢 closed (messages now actually send).
2. `git status` clean. Pipeline lock claimed.
3. Smoke 7/7 PASS.

**Touch points:**

- `modules/crm/crm-event-actions.js` — restructure `changeEventStatus`.
- `modules/crm/crm-lead-actions.js` — same pattern.
- `modules/crm/crm-attendee-move.js` — verify already correct (mirror pattern).
- `modules/crm/crm-automation-client.js` — add `rule_match_probe` mode.
- `modules/crm/crm-confirm-send-v2.js` — keep defensive auto-close.
- `supabase/functions/automation-engine/` — add `rule_match_probe` handler.

**Constraints:**

- Cancel must truly cancel — including the status change. No "commit-then-prompt."
- §4 Destructive Operations: `None.`
- Iron Rules 12/31/32 enforced.
- Demo smoke with Chrome MCP — capture screenshots showing modal-open-only-when-rule-matches.

**When done:**

> "M4_STATUS_CHANGE_MODAL_GATE_FIX 🟢 נסגר. [N] commits. המודאל פותח רק כשיש כלל תואם. cancel באמת מבטל. screenshots ב-_archive/. SPEC הבא: M4_DUAL_PATH_DEPRECATION_PHASE_1."

Read the Brief and start.
