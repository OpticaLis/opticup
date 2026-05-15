# Activation Prompt — M4 Status Model Documentation

> Paste the block below into a fresh Claude Code chat. Sonnet model.

---

```
You are running the Full Auto Pipeline on a documentation Brief. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_STATUS_MODEL_DOC_BRIEF.md

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §3.5:
   git tag -a pre-m4-status-model-doc-2026-05-14 -m "Pre-status-model-doc baseline"
   git push origin pre-m4-status-model-doc-2026-05-14

2. DELIVERABLE: ONE new doc file at modules/Module 4 - CRM/docs/STATUS_MODEL.md per Brief §2.4 structure (Overview + Lead Status + Attendee Status + Event Status + Cross-Machine Coordination + Open Issues + How to extend). Three Mermaid stateDiagram-v2 diagrams (one per machine) plus narrative tables and explanations.

3. INVESTIGATION SCOPE per Brief §3.1: READ-ONLY across DDL, crm_statuses rows, pg_proc bodies that mention status slugs, crm_automation_rules on both tenants, modules/crm/*.js, supabase/functions/*/. No DB writes. No code changes.

4. TRUTH-FROM-CODE RULE per Brief §3.3: every transition documented must be verifiable in code or DB. If a Brief or SPEC implies a transition the Pipeline cannot find in code → mark it ⚠️ unwired in the diagram + flag in section 6. Do NOT invent transitions that "should exist".

5. NO SPEC AUTHORING per Brief §3.4: surface bugs/gaps in section 6 + FINDINGS.md. Future fix SPECs come from Daniel+Architect after reading.

6. SAFETY RULES per Brief §3:
   - No file changes outside STATUS_MODEL.md + the standard SPEC retrospective files.
   - No DB writes.
   - No merges to main.
   - Iron Rule 31 + 32 enforced.

7. COMMIT BUDGET per Brief §3.6: 2 commits, cap at 3.

8. MERMAID COMPATIBILITY per Brief §3.2: stateDiagram-v2 syntax (GitHub-native). Split diagrams into sub-diagrams if any one has more than ~12-15 states.

9. ESCALATION: if a machine is too complex to document in one diagram OR if a critical contradiction surfaces, write modules/Module 4 - CRM/escalations/{ISO_TS}_STATUS_MODEL_BLOCKER.md.

10. COMMUNICATION: English status updates between phases. ONE concise English summary at end: file path, state count, transition count, unwired/ambiguous count, top 3 surprises.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
