# Cowork Session Context — P5 Message Content SPEC

> Paste this into a new Cowork session to give it full context for writing the P5 SPEC.

---

## Who I Am

Daniel, project owner of Optic Up — multi-tenant SaaS ERP for Israeli optical stores.
I communicate in Hebrew. I am NOT a developer. I make strategic decisions only.

## Project State

**Repo:** `opticalis/opticup` on branch `develop`.
**Module:** 4 — CRM (Go-Live initiative: migrating from Monday.com to Supabase-based CRM).

### Completed Phases
- P1: Internal lead intake (Edge Function `lead-intake`) ✅
- P2a: Lead management ✅
- P2b: Event management ✅
- P3a: Manual lead entry ✅
- P3b: Make message dispatcher (superseded by v3) ✅
- P3c+P4: Messaging pipeline rebuild — Architecture v3 ✅ (commit `e8dad2c`, Foreman Review `43567bb`)

### Architecture v3 (decided 2026-04-22)
Make has ZERO access to Supabase. It's a send-only pipe: 4 modules (Webhook → Router → SMS | Email).
All logic lives in the `send-message` Supabase Edge Function: template fetch, variable substitution,
log write, Make webhook call. Make scenario ID: 9104395, webhook URL in Edge Function env.

### What P5 Needs to Deliver
P5 is about **message content** — the templates and HTML emails that the pipeline (already built)
will send. The pipeline is wired and working. P5 fills it with real content.

Key areas:
1. **Template content authoring** — all message templates in `crm_message_templates` table
2. **HTML email templates** — professional Hebrew RTL emails stored in template body field
3. **Template management UI** — the Messaging Hub "templates" sub-tab already has UI skeleton (B5),
   needs to be wired to real CRUD on `crm_message_templates`
4. **Variable documentation** — 10 variables (`%name%`, `%phone%`, `%email%`, `%event_name%`,
   `%event_date%`, `%event_time%`, `%event_location%`, `%coupon_code%`, `%registration_url%`,
   `%unsubscribe_url%`) need to be visible/copyable in the template editor

### What Already Exists
- 4 demo templates: `lead_intake_new_sms_he`, `lead_intake_new_email_he`,
  `lead_intake_duplicate_sms_he`, `lead_intake_duplicate_email_he`
- Template table: `crm_message_templates` with columns for slug, channel, language, subject, body
- UI skeleton: `crm-messaging-templates.js` (304 lines) has split layout with sidebar + editor +
  3-panel preview (WhatsApp/SMS/Email)
- Full message content map: `campaigns/supersale/FLOW.md` — 13 event statuses with all message content
- 10 HTML email templates: `campaigns/supersale/messages/*.html`
- Variable format: `%name%` (not `{{}}` which conflicts with Make)

### Documentation Follow-ups (from P3c+P4 Foreman Review)
Before writing the P5 SPEC, there's a Claude Code doc-fix task ready at:
`modules/Module 4 - CRM/go-live/specs/P3C_P4_MESSAGING_PIPELINE/DOC_FIX_PROMPT.md`
This fixes MASTER_ROADMAP, MODULE_MAP, GLOBAL_MAP, and TROUBLESHOOTING.
Run this first (or in parallel) — it's a single commit with zero code changes.

## Files to Read (in order)

Load the `opticup-strategic` skill, then read these files for full context:

1. `/mnt/.auto-memory/MEMORY.md` — project memory index
2. `/mnt/.auto-memory/project_crm_golive.md` — CRM Go-Live state with all phase details
3. `/mnt/.auto-memory/project_messaging_architecture_v2.md` — Architecture v3 full details
4. `CLAUDE.md` — project constitution (30 Iron Rules)
5. `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — current module state
6. `modules/Module 4 - CRM/go-live/ROADMAP.md` — Go-Live roadmap with P5 placeholder
7. `modules/Module 4 - CRM/go-live/specs/P3C_P4_MESSAGING_PIPELINE/FOREMAN_REVIEW.md` — lessons from last SPEC
8. `modules/Module 4 - CRM/go-live/specs/P3C_P4_MESSAGING_PIPELINE/SPEC.md` — P3c+P4 SPEC (§12 has template variable list and Edge Function design)
9. `campaigns/supersale/FLOW.md` — complete trigger map with 13 event statuses and ALL message content
10. `campaigns/supersale/messages/` — HTML email templates (10 files)
11. `modules/crm/crm-messaging-templates.js` — existing UI skeleton for template management

## What I Want

Write the P5 SPEC using the `opticup-strategic` skill's SPEC authoring protocol (folder-per-SPEC).
The SPEC folder goes at: `modules/Module 4 - CRM/go-live/specs/P5_MESSAGE_CONTENT/`

After the SPEC, write an Activation Prompt for Claude Code to execute it.

**My priorities:**
- Zero technical knowledge needed for end users to manage templates
- Professional Hebrew RTL HTML emails
- Copy-paste variable list visible in the template editor UI
- All message content from `campaigns/supersale/FLOW.md` converted to real templates
- Template CRUD in the Messaging Hub (the UI skeleton already exists)

**WhatsApp:** Still deferred — no WhatsApp channel until I switch from Green API to Meta official API.
