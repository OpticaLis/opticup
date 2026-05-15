# M4 Status Model Documentation — Brief

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~1.5-2 hours)
**Model preference:** Sonnet (read + write documentation, no code or DDL)
**Owning module:** Module 4 — CRM
**Mode:** READ-ONLY investigation + ONE new doc file.

---

## 1. Purpose

Audit Rec 9. The CRM has three rich state machines — Lead status, Attendee status, Event status — and a recently-shipped framework (`STATUS_CHANGE_TRIGGERS_FRAMEWORK`) that coordinates transitions. None of it is documented. Every architectural decision this past week (the `invited` ghost-slot bug, waitlist priority, event-close recycle) required hours of code reading to reconstruct the state machine.

This Brief produces `modules/Module 4 - CRM/docs/STATUS_MODEL.md` — a single comprehensive document with 3 Mermaid state diagrams plus narrative explanations. Future SPECs and architectural decisions consult this doc instead of re-discovering the model from code.

---

## 2. Scope

### 2.1 Three state machines to document

**(a) Lead status** — `crm_leads.status` field. Slugs live in `crm_statuses` table where `entity_type='lead'`. Examples: `new`, `invited`, `waiting`, `waitlist`, `confirmed`, `confirmed_verified`, `attended`, `unsubscribed`, `not_interested`, `rejected`, `lost`, `blacklist`, `duplicate`.

**(b) Attendee status** — `crm_event_attendees.status` field. Slugs live in `crm_statuses` where `entity_type='attendee'`. Examples: `invited`, `registered`, `confirmed`, `attended`, `waiting_list`, `cancelled`, `no_show`, `event_closed`, `manual_registration`, `quick_registration`, `duplicate`.

**(c) Event status** — `crm_events.status` field. Slugs live in `crm_statuses` where `entity_type='event'`. Examples: `draft`, `scheduled`, `registration_open`, `event_day`, `closed`, `completed`, `cancelled`.

### 2.2 What each state diagram must include

- All states (slugs) and whether each is `is_active=true` or `is_active=false`.
- All transitions: arrows from source state → target state, labeled with the WHAT triggered them (RPC name, automation rule, manual UI action, DB trigger).
- For transitions driven by `crm_automation_rules`: include the rule's trigger event + condition. For DB-trigger-driven: include the trigger name.
- Distinguish AUTOMATIC transitions (sync, automation, event-close recycle) from MANUAL transitions (operator dropdown change).
- Mark TERMINAL states (states a lead/attendee/event can land in and not leave) — useful for understanding lifecycle dead-ends.

### 2.3 Cross-machine coordination

The three machines are coupled:
- Attendee status changes can cascade to lead status via `sync_lead_status_from_attendee` RPC.
- Event status changes (to `closed`/`completed`) trigger lead status recycle for `invited`/`attended` attendees.
- The recently-shipped `crm_status_change_events` framework is a generic queue/consumer pattern documented in its own SPEC, but the user-facing semantics need pointing-out here.

Document these cross-machine relationships in a fourth narrative section after the three diagrams.

### 2.4 Doc structure (target)

```
# Module 4 — Status Model

## 1. Overview
   - 3 state machines, why they exist, how they relate
   - Reading this doc: how to look up "what status means X"

## 2. Lead Status (crm_leads.status)
   - List of all slugs + their meaning + is_active state
   - Mermaid state diagram
   - Transitions: detailed table — source → target — trigger → automation
   - Terminal states + their meaning

## 3. Attendee Status (crm_event_attendees.status)
   - Same structure as §2

## 4. Event Status (crm_events.status)
   - Same structure as §2

## 5. Cross-Machine Coordination
   - Attendee → Lead sync (sync_lead_status_from_attendee)
   - Event close → Lead recycle (event-close trigger / automation)
   - Waitlist priority rules
   - The crm_status_change_events framework (reference to its SPEC, NOT a duplicate of it)

## 6. Open Issues + Anti-Patterns
   - Statuses that exist but have no transition wired (dead slugs)
   - Statuses with ambiguous semantics (confirmed vs confirmed_verified)
   - Statuses with overlapping coverage (waiting vs waitlist)
   - Each item: 1-2 sentences flagging the issue, pointer to relevant audit finding or open SPEC if any

## 7. How to extend
   - Adding a new status: where it goes (crm_statuses), how to wire transitions, RLS implications
   - Adding a new transition: SQL + automation rule path
   - Adding a new entity to the framework: registry + DB trigger pattern
```

---

## 3. Constraints

### 3.1 READ-ONLY for code and data
- No file changes outside the new doc file.
- No DB writes.
- No commits other than the one creating the doc + the closing retrospective.
- Investigation reads:
  - All `crm_*` tables' DDL.
  - `crm_statuses` row data on Prizma (for ground-truth slug list + is_active state).
  - All RPCs whose body references the status slugs (use `pg_proc` ILIKE search).
  - All `crm_automation_rules` rows on both tenants.
  - The relevant code in `modules/crm/*.js` and `supabase/functions/*/`.

### 3.2 Mermaid syntax compatibility
- Use Mermaid `stateDiagram-v2` syntax (renders on GitHub).
- Each diagram should fit on a single screen (max ~12-15 states + their arrows).
- If a machine has too many transitions to fit, split into "happy path" + "exceptions" sub-diagrams.

### 3.3 Truth-from-code rule
- Every transition documented MUST be verifiable in code or DB at the time of writing.
- If the Pipeline finds a documented-intent transition in a Brief or SPEC but cannot find the code that fires it → mark the transition with `⚠️ unwired` in the diagram + section 6.
- Do NOT invent transitions that "should exist". Document reality first; section 6 surfaces gaps.

### 3.4 No SPEC authoring
- If the investigation surfaces a clear bug or missing flow, log it in section 6 of the doc and as a finding in FINDINGS.md. Do NOT author a fix SPEC from this Brief.

### 3.5 Safety tag
First action:
```
git tag -a pre-m4-status-model-doc-2026-05-14 -m "Pre-status-model-doc baseline"
git push origin pre-m4-status-model-doc-2026-05-14
```

### 3.6 Commit budget
- 2 commits expected. Cap at 3.

### 3.7 No merges to main
- Daniel handles PR.

---

## 4. Pipeline Selection

Standard Full Auto Pipeline. Sonnet model. No `opticup-executor` code-change work in this run — documentation only. `opticup-strategic` Foreman authors the doc; `opticup-reviewer` audits accuracy against code/DB; `opticup-localhost-tester` confirms Mermaid renders in a GitHub preview.

---

## 5. Communication

English status updates between phases. ONE concise English summary at end:
- File path of the doc.
- Count of states documented across the 3 machines.
- Count of transitions documented.
- Count of "unwired" or "ambiguous" items in section 6.
- Top 3 surprises (things that were not obvious from a-priori reading of the codebase).

---

*End of Brief. Activation prompt at `M4_STATUS_MODEL_DOC_ACTIVATION_PROMPT.md`.*
