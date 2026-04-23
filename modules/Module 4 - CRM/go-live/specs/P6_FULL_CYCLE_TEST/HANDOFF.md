# Handoff — P6 Full Cycle Test SPEC

> Paste this into a new Cowork session to pick up where the previous session left off.

---

## Context

Module 4 CRM Go-Live is at P5.5 CLOSED. All 3 client-side CRM triggers are now wired to the `send-message` Edge Function:

1. **Event status change** → bulk message dispatch to relevant recipients (8 statuses × 4 recipient types)
2. **Attendee registration** → confirmation message (registered / waiting list)
3. **Broadcast wizard** → per-lead dispatch via Edge Function (template or raw body)

P6 is the **full cycle end-to-end test on demo tenant** — exercising the entire CRM pipeline from lead intake through messaging through unsubscribe. The Go-Live ROADMAP describes P6 as "מחזור מלא על דמו".

## What the SPEC Author Needs to Know

### Demo tenant state (post-P5.5):
- 2 leads (approved phones: `+972537889878`, `+972503348349`)
- 1 event
- 24 message templates
- `crm_message_log`, `crm_broadcasts`, `crm_event_attendees`, `crm_lead_notes` all wiped clean
- Ready for full-cycle testing

### P5.5 Findings that affect P6 scope:
- **M4-BUG-P55-03 (HIGH):** `send-message` EF requires `variables.phone/email` in all modes — undocumented. P6 should include documenting this in `crm-messaging-send.js` JSDoc (Foreman Review followup #2).
- **M4-OPS-P55-05 (CRITICAL):** Approved-phone rule now in CLAUDE.md §9 + both skills. P6 must strictly follow this.

### Skill improvements already applied (2026-04-22):
- **opticup-strategic:** Cross-Reference Check now has bullets 6 (constant-value verification) and 7 (precondition verification against live DB/SESSION_CONTEXT)
- **opticup-executor:** Step 4.5 (approved-phone pre-flight check) and bullet 10 (existing-INSERT audit) added
- **CLAUDE.md §9 QA:** Approved test phone numbers rule added

### Files to read before writing the SPEC:
1. `CLAUDE.md` — Iron Rules, QA section with phone rule
2. `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — current M4 state
3. `modules/Module 4 - CRM/go-live/ROADMAP.md` — Go-Live architecture v3, execution order, trigger checklist
4. `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/FOREMAN_REVIEW.md` — most recent review with 8 followups
5. `modules/Module 4 - CRM/go-live/specs/P5_5_EVENT_TRIGGER_WIRING/EXECUTION_REPORT.md` — executor's lessons and pain points
6. `modules/Module 4 - CRM/go-live/specs/P5/FOREMAN_REVIEW.md` — P5 review (also has pending proposals)
7. `.claude/skills/opticup-strategic/SKILL.md` — the strategic skill with updated Cross-Reference Check
8. `docs/GLOBAL_MAP.md` + `docs/GLOBAL_SCHEMA.sql` — Rule 21 cross-reference
9. `docs/guardian/GUARDIAN_ALERTS.md` — active Sentinel alerts

### P6 scope (from Go-Live ROADMAP + SESSION_CONTEXT):
Full cycle test covering:
- Lead intake (storefront form → Edge Function → `crm_leads`)
- Lead appears in CRM dashboard
- Event creation + status changes → message dispatch
- Registration → confirmation
- Broadcast wizard → per-lead dispatch
- Message log verification (all channels, all templates)
- Template variable substitution correctness
- Error handling (missing phone, missing email, bad channel)

### Out of scope for P6 (separate SPECs):
- Reminders scheduler (timer-based, needs different architecture)
- Unsubscribe endpoint (needs new Edge Function)
- WhatsApp channel (awaiting Meta API)
- Demo-tenant phone whitelist in `send-message` EF (P7 hardening)

## Instruction

Load `opticup-strategic` skill. Follow the SPEC Authoring Protocol from Step 1 (Pre-SPEC Preparation). The SPEC folder is already created at `modules/Module 4 - CRM/go-live/specs/P6_FULL_CYCLE_TEST/`. Write `SPEC.md` + `ACTIVATION_PROMPT.md`.
