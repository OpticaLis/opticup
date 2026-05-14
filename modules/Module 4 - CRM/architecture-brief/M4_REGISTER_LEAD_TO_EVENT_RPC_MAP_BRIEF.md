# M4_REGISTER_LEAD_TO_EVENT_RPC_MAP — Architecture Brief

**Type:** Read-only diagnostic SPEC. Phase 1 P1.4 of `roles/site-overseer/FUNNEL_ROADMAP.md`. First SPEC of Phase 1 per Architect decision 2026-05-14 — provides the foundational understanding required before P1.1 (UTM persistence) and P1.2 (broadcast_id propagation) can be safely authored.

**Purpose:** Produce a complete behavioral map of the `register_lead_to_event` Supabase RPC — every input, every row it creates/updates, every status flip, every side effect, every error path. Output is a state-transition diagram + a definitive mappings table that will be merged into both `roles/site-overseer/SITE_OVERSEER_SKILL.md` and `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` (Layer 4 expansion).

**Why this exists:** On 2026-05-14, three wrong diagnoses in one day (broadcasts-not-sent / 7.8% conversion / UTM event-24 attribution) all stemmed from inferring RPC behavior without reading it. This SPEC ends the inference era for `register_lead_to_event`. Pay 1-2 read-only hours now; avoid weeks of debugging Phase 1+2 SPECs built on assumptions.

---

## 1. Scope

**In scope:**
1. Read the full SQL body of `register_lead_to_event` from Supabase (latest version in `pg_proc`, not from old migration files which may have drifted).
2. For every code path inside the RPC (every IF/CASE/EXCEPTION branch), document:
   - Input parameters consumed and their effective defaults.
   - Tables read (with WHERE clauses).
   - Tables written — INSERT, UPDATE, soft-delete; including which columns, which conditions trigger which writes.
   - Status transitions on `crm_leads`, `crm_event_attendees`, and any other status-bearing row touched.
   - Side effects: trigger fires (per `crm_status_change_events` queue from `STATUS_CHANGE_TRIGGERS_FRAMEWORK`), automation rule evaluations, message queue enqueues.
   - Return value semantics and error/exception codes.
3. Identify every CALLER of the RPC in the codebase (ERP JS, storefront, Edge Functions, Make scenarios, cron jobs, manual SQL).
4. Identify every consumer of the RPC's return value (what does the caller do with the response?).
5. Produce three artifacts (see §3 Output).

**Out of scope:**
- Any code change. This SPEC is pure read.
- Any DB write or migration. This SPEC produces zero schema impact.
- Refactoring the RPC. Phase 3 (status-column split) may eventually rewrite it; this SPEC is the prerequisite, not the action.
- Mapping any other RPC (e.g. `next_box_number`, `apply_stock_count_delta`). Future SPECs can copy this template for other RPCs.
- Mapping `register_lead_to_event`'s historical commit history — only the *current* live behavior matters.

---

## 2. Method (read-only, no DB writes)

The executor should:

1. **Get the canonical RPC body.** Query `pg_proc` directly via Supabase MCP `execute_sql` (read-only):
   ```sql
   SELECT proname, pg_get_functiondef(p.oid) AS body
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public' AND p.proname = 'register_lead_to_event';
   ```
   Save the verbatim body to the SPEC folder as `RPC_BODY.sql`.

2. **Line-annotate the body.** Walk the SQL top-to-bottom. For each meaningful statement (variable assignment, condition, write), produce a line-keyed annotation in a Markdown table:
   - `Line | Statement summary | Reads from | Writes to | Side effects`

3. **Diagram the state transitions.** Mermaid `stateDiagram-v2` covering:
   - All entry conditions (existing lead vs new lead; existing attendee vs new attendee; event capacity full vs not; waitlist vs registered).
   - All terminal states (return values: `'registered'`, `'waitlist'`, `'already_registered'`, error codes — whatever the actual RPC returns).
   - Status flips along the way.

4. **Caller inventory.** Grep the entire monorepo + storefront repo for `register_lead_to_event` invocations:
   - ERP JS: `js/`, `modules/*/code/`, root `*.html` files
   - Edge Functions: `supabase/functions/*/index.ts`
   - Storefront: sibling repo `opticup-storefront/src/`
   - Make scenarios: list known scenarios touching `crm_event_attendees` via Make MCP (no need to read scenario bodies — just identify by name).
   - SQL: any `CALL` or `SELECT register_lead_to_event(...)` in migrations / archived scripts (informational only).

5. **For each caller, document:**
   - File:line of the invocation.
   - Input parameter values being passed (literal or computed).
   - Return value handling: what does the caller do with each possible response?

6. **Discrepancy check.** Compare what callers EXPECT vs what the RPC actually returns. Any mismatch is a Finding (FIND-NN) for the SPEC's FINDINGS.md.

7. **Forward-compat cross-check.** For each E1-E7 capability in FUNNEL_ROADMAP §Phase 4, note whether the current RPC structure blocks it (Finding) or supports it (note). Specifically:
   - E1 (MTA Engine) — does the RPC log every touchpoint or only the registration?
   - E6 (cross-channel orchestration) — does it support `chain_id` / `parent_message_id` patterns?
   - E7 (Customer Journey Analytics) — does it write structured events to a log table or only mutate state?

---

## 3. Output

Three artifacts in `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/`:

1. **`RPC_BODY.sql`** — verbatim live RPC body from `pg_proc`.
2. **`STATE_TRANSITIONS.md`** — Mermaid diagram + line-annotation table + return-value semantics table + caller inventory table.
3. **`FINDINGS.md`** — every discrepancy between caller expectations and RPC behavior, every forward-compat block for E1-E7, every gap or inconsistency. Severity HIGH / MEDIUM / LOW / INFO.

Plus the standard SPEC-folder outputs per Iron Rule discipline:
4. **`SPEC.md`** — authored by Foreman (opticup-strategic of M4) from this Brief.
5. **`EXECUTION_REPORT.md`** + **`FOREMAN_REVIEW.md`** at close.

---

## 4. Destructive Operations

**None.** This SPEC is pure read. Zero DB writes (no INSERT/UPDATE/DELETE — only `SELECT`). Zero file deletions. Zero git destructive ops. Zero deploys.

If any step would require a write — STOP, write escalation, do NOT proceed.

---

## 5. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | `RPC_BODY.sql` present + matches live `pg_proc` body byte-for-byte | re-query `pg_proc` at end, diff |
| 2 | Every IF/CASE/EXCEPTION branch in RPC body documented in `STATE_TRANSITIONS.md` annotation table | manual count vs SQL parse |
| 3 | Mermaid diagram renders cleanly (no syntax errors) | paste into mermaid.live or `mmdc` |
| 4 | Caller inventory ≥ 1 row per known caller surface (ERP / Edge Function / storefront / Make / SQL) | grep results vs table |
| 5 | Each return value documented with: what triggers it, who consumes it, what they do with it | manual review |
| 6 | Forward-compat cross-check covers all 7 of E1-E7 (block / support / N/A) | table review |
| 7 | At least one Finding logged OR explicit "zero gaps found" statement in FINDINGS.md | review |
| 8 | Zero DB writes occurred (verify via `audit_log` or similar — should be empty for executor's session) | post-run audit |
| 9 | Site Overseer SKILL update queued (P1.4 closure should produce 1-line entry in skill's Layer 4 section + KNOWLEDGE_MAP.md Layer 4 expansion) — deferred to closure step, not blocking SPEC | tracking |

---

## 6. Notes for the Foreman (opticup-strategic of M4)

- **You're authoring a SPEC from this Brief.** Use the standard SPEC_TEMPLATE.md from `.claude/skills/opticup-strategic/references/`.
- **The SPEC is read-only — declare `## Destructive Operations` as `None.`** This activates Iron Rule 32's gate that blocks any destructive op mid-run.
- **Probe `pg_proc` BEFORE sealing the SPEC.** Confirm the RPC name and that you can read its body. Don't author against assumed behavior.
- **Mermaid syntax check.** Include a "render-locally" step (or a programmatic syntax-check via `mmdc --input`) in the SPEC's Phase 3 verification.
- **The KNOWLEDGE_MAP update at the end is deferred** — Foreman closure will queue it as a follow-up SPEC if substantive new layer 4 content emerges. Don't try to bundle the SKILL.md edit into this SPEC.

---

## 7. Bounded Autonomy Notes

- This SPEC runs end-to-end in ONE Claude Code chat via Full-Auto Pipeline (Foreman → Executor → Reviewer → Localhost-Tester → Foreman closure).
- Localhost-Tester smoke is **not strictly required** (no code/UI changed) but the pipeline runs it anyway as a control — must be 7/7 PASS on demo as proof nothing accidentally regressed.
- Escalation triggers: if `register_lead_to_event` does not exist in `pg_proc` (renamed? dropped?), or if it returns a shape that breaks any caller — STOP and write escalation. Do NOT speculate about renames.

End of Brief.
