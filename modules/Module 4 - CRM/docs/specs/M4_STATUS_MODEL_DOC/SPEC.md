# SPEC — M4_STATUS_MODEL_DOC

**Status:** Closed
**Authored by:** Full Auto Pipeline (Sonnet) executing
`modules/Module 4 - CRM/architecture-brief/M4_STATUS_MODEL_DOC_BRIEF.md`
**Date:** 2026-05-14
**Mode:** READ-ONLY investigation + ONE new doc file
**Safety tag:** `pre-m4-status-model-doc-2026-05-14`

## 1. Purpose

Documentation-only SPEC. Audit Rec 9 — the three CRM state machines (lead / attendee / event) and the `crm_status_change_events` framework that coordinates them had no consolidated reference. Every recent architectural decision (the `invited` ghost-slot bug, waitlist priority, event-close recycle) required hours of code reconstruction. This SPEC produces one comprehensive doc with three Mermaid stateDiagram-v2 diagrams plus narrative tables that map every transition to its trigger surface (RPC body, DB trigger, automation rule, cron job, or client-side code).

## 2. Scope

- One new file: `modules/Module 4 - CRM/docs/STATUS_MODEL.md`.
- Three Mermaid diagrams (one per machine).
- Seven sections per Brief §2.4: Overview / Lead / Attendee / Event / Cross-Machine / Open Issues / How to Extend.
- READ-ONLY across DDL, `crm_statuses`, `pg_proc` bodies, `crm_automation_rules`, `cron.job`, `modules/crm/*.js`, `supabase/functions/*`.
- No DB writes. No code changes. No SPEC authoring for the gaps found.

## 3. Constraints applied

- Truth-from-code rule: every transition documented is verifiable in code or DB at the time of writing. Gaps marked `⚠️ unwired`.
- Mermaid `stateDiagram-v2` syntax (GitHub-native render). Each diagram fits one screen.
- Commit budget: 2 (file + retrospective). Cap 3.
- Iron Rule 31 (integrity gate) honored at commit time.
- Iron Rule 32: no destructive operations. None declared, none performed.

## 4. Destructive Operations

None.

## 5. Deliverables

1. `modules/Module 4 - CRM/docs/STATUS_MODEL.md` — the doc.
2. `modules/Module 4 - CRM/docs/specs/M4_STATUS_MODEL_DOC/SPEC.md` — this file.
3. `modules/Module 4 - CRM/docs/specs/M4_STATUS_MODEL_DOC/EXECUTION_REPORT.md` — execution log.
4. `modules/Module 4 - CRM/docs/specs/M4_STATUS_MODEL_DOC/FINDINGS.md` — surprises + gaps surfaced by writing the doc, to feed Daniel + Architect for follow-up SPECs.
