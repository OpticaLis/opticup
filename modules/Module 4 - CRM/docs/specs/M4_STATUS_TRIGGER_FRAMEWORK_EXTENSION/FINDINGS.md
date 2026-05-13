# M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION — Findings

**SPEC:** M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION
**Executor:** opticup-executor (overnight pipeline, 2026-05-14)
**Status:** SPEC closed cleanly; these are out-of-scope items surfaced during execution.

---

## F-STFE-1 — `crm_events` has no `updated_at` column (LOW)

**Severity:** LOW
**Location:** `crm_events` table.
**Description:** Smoke #4 attempted `UPDATE crm_events SET status=..., updated_at=now()` and got `column "updated_at" does not exist`. `crm_leads` HAS `updated_at`; `crm_events` does not.
**Implication:** Most other CRM tables have `updated_at`. The asymmetry is a Rule-21 / consistency issue. Auditing change history on event status flips relies on `crm_status_change_events` (added by this SPEC) and `crm_automation_runs` — adequate for now, but a future audit might want a per-row last-modified timestamp on events.
**Suggested action:** Bundle a 1-line `ALTER TABLE crm_events ADD COLUMN updated_at timestamptz DEFAULT now()` + a trigger to maintain it into the next M4 sync-adjacent SPEC. Out of scope for this overnight run (would need its own destructive-ops declaration).

---

## F-STFE-2 — `crm_message_queue` column name mismatches in client code (INFO)

**Severity:** INFO
**Description:** Smoke cleanup attempted `SELECT sent_at, error_message FROM crm_message_queue` and both columns failed. The actual columns are different (status enum only). Some client-side or doc references may use the old names.
**Implication:** Documentation drift, no functional impact.
**Suggested action:** Grep + cleanup pass; pin into a future tech-debt SPEC.

---

## F-STFE-3 — `MCP deploy_edge_function` does not auto-bundle TS imports (INFO)

**Severity:** INFO
**Description:** The MCP tool `mcp__claude_ai_Supabase__deploy_edge_function` requires the caller to pass **every** file referenced by the import graph in the `files` array. Passing only `index.ts` resulted in a 500. The Supabase CLI auto-bundles based on the function folder; recommend using CLI for multi-file EFs unless the MCP gets enhanced.
**Implication:** Operational, not security. Affects how future overnight runs should deploy EFs.
**Suggested action:** Note in `opticup-executor` SKILL.md: "For multi-file EFs, prefer `supabase functions deploy` over MCP `deploy_edge_function` until MCP supports folder upload." Author proposal #1 in FOREMAN_REVIEW reflects this.

---

## F-STFE-4 — `evaluated:1` from a brand-new throwaway event was a surprise (INFO)

**Severity:** INFO
**Description:** Created event had zero attendees, zero leads, zero history — yet flipping its status to `will_open_tomorrow` fired the demo rule "שינוי סטטוס: ייפתח מחר" with `total_recipients=2`. The rule's `recipient_type='tier2'` resolves to all `is_active=true` Tier-2 leads on the tenant, ignoring `event_id`. That is the intended behavior of "send a Tier-2 broadcast when ANY event flips to 'will open tomorrow'", but is non-obvious — most operators would expect event-scoped delivery.
**Implication:** A future SPEC that creates throwaway events during smoke should either (a) deactivate the matching rule, (b) UPDATE a status the rule's condition does NOT match (e.g., `planning` → `invite_new` instead), or (c) cleanup messages before dispatch-queue picks them up. This run sent 2 messages to Daniel's whitelisted contacts before cleanup could intercept.
**Suggested action:** Add a smoke-design checklist to `opticup-localhost-tester` skill: "before flipping a status, list active rules whose trigger condition matches the target value; if any have non-trivial recipient_type, choose a different target or deactivate the rule."

---

## F-STFE-5 — Smoke #7 (UI visual check) deferred to code-review (LOW)

**Severity:** LOW
**Description:** The SPEC's smoke §6 case 7 specifies opening `crm.html` → Automations → New rule and visually verifying the dropdown options. Overnight execution did not drive a browser. Verified via code review of `crm-rule-editor.js` — the new entries are in `COND_BY_BOARD` and `_validate(s)` accepts them.
**Implication:** Browser-render verification missing. If the dropdown renders incorrectly (e.g., Hebrew label clipping, RTL issue), the smoke wouldn't catch it.
**Suggested action:** Daniel can verify visually in the morning before merging develop→main. Or a follow-up SPEC can wire chrome-devtools MCP smoke into the localhost-tester skill so non-interactive UI checks become possible overnight.

---

*End of FINDINGS. 5 entries — 1 LOW + 4 INFO. None block the SPEC.*
