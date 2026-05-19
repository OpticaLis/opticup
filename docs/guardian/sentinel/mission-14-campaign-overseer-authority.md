# Sentinel Mission 14 — Campaign Overseer authority boundary

**Author:** M4_DUAL_PATH_CLEAN_FIX_2026_05_19 SPEC, Layer 3-KT.
**Iron Rule:** 35.
**Cadence:** Daily.

---

## Goal

Detect Campaign Overseer edits that cross the authority boundary defined in Iron Rule 35. Specifically: new `%var_name%` placeholders that aren't in the M4 infrastructure contract, or new `action_type` values not in the action contract.

The infrastructure contract is at `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`. The action contract is in the same file.

## Inputs

- `crm_message_templates` rows on demo (tenant_id=`8d8cfa7e-ef58-49af-9702-a862d459cccb`) updated in the last 24h.
- `crm_message_templates` rows on Prizma (tenant_id=`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`) updated in the last 24h.
- `crm_automation_rules` rows on both tenants updated in the last 24h.
- `crm_audit_log` entries for the same window.
- The documented variable contract — extracted by scanning `M4_INFRASTRUCTURE_CONTRACT.md` for `%var_name%` patterns.
- The documented action contract — extracted by scanning `M4_INFRASTRUCTURE_CONTRACT.md` for `action_type=...` patterns.

## Detection logic

### Step 1 — placeholder audit (templates)

For each template row updated in the last 24h, extract all `%var_name%` occurrences from `body` and `subject`. Compare against the documented variable list. For each undocumented placeholder:

```
- 🔴 CRITICAL — Template `<slug>` on tenant `<demo|prizma>` uses undocumented placeholder `%<var>%`.
  - row id: <uuid>
  - updated_at: <timestamp>
  - last 5 audit-log entries for this row (if available):
    - <action_user, action_at, change_summary>
  - resolution: open an Architect SPEC to extend the resolver
    (supabase/functions/automation-engine/prepare-plan.ts buildVariables +
    supabase/functions/send-message/<dispatch.ts or similar>) before next dispatch.
```

### Step 2 — action_type audit (rules)

For each rule row updated in the last 24h, check `action_type`. If it's not in `{send_message, queue_send}` (or whatever the contract currently lists), emit:

```
- 🔴 CRITICAL — Rule `<name>` on tenant `<demo|prizma>` uses unknown action_type `<value>`.
  - row id: <uuid>
  - resolution: open an Architect SPEC to extend the engine's action dispatcher.
```

### Step 3 — trigger registry audit

For each row in `crm_trigger_type_registry` added in the last 24h, emit:

```
- 🟡 HIGH — New trigger_type registry entry on tenant `<demo|prizma>`: entity=<x>, slug=<y>.
  - row id: <uuid>
  - resolution: confirm this was authored via an Architect SPEC; if not, revert.
```

## Output format

Findings appended to `docs/guardian/GUARDIAN_ALERTS.md` under `## Mission 14 — Iron Rule 35`. Clean run → `## Mission 14 — All clear` with the audited row counts.

## Severity calibration

- **CRITICAL (🔴)** — undocumented `%var_name%` or unknown `action_type`. These will silently fail at dispatch time, producing rejected message_log rows.
- **HIGH (🟡)** — new trigger_type registry entry. May be legitimate (Architect SPEC) but warrants confirmation.
- **INFO (🔵)** — template body edited but no new placeholders / known placeholders only. Normal Campaign Overseer work; logged for visibility.

## Acceptable bypasses

- If a Campaign Overseer change is followed within 48 hours by an Architect SPEC that documents the new placeholder, downgrade CRITICAL→INFO retroactively. The audit always reports the violation but the resolution is "SPEC merged on <date>".

## Cross-reference

When this mission fires on a template change that adds `%var_name%`, ALSO run a check that the resolver (`prepare-plan.ts buildVariables`) actually populates that variable. If `grep -r "%<var>%" supabase/functions/` returns no hits → the variable will resolve to empty string at dispatch and produce `unsubstituted_placeholder` rejections. Same rationale as the 2026-05-18→19 cascade.

## Test data

Run-once protocol: query both tenants for the current variable usage and emit a baseline report. Future runs compare against the baseline + the documented contract.

## Rationale

Established 2026-05-19 by `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` Layer 3-KT after the 3 placeholders added 2026-04-28 to Prizma templates by the Campaign Overseer (`event_day_of_week`, `event_deposit_amount`, `event_max_attendees`) triggered the entire repair cascade. Mission 14 catches the same failure mode before it gets to production dispatch.
