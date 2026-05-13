# FINDINGS — M4_UPDATED_AT_BACKFILL

**SPEC:** `M4_UPDATED_AT_BACKFILL` (2026-05-14)
**Author:** Executor (Full Auto Pipeline, Sonnet)
**Audience:** Foreman (`opticup-strategic`), future SPEC authors, Architect.

This document captures findings whose value extends BEYOND the immediate SPEC. Each finding is actionable or informational for a future change.

---

## Finding 1 — `crm_automation_rules` was already done before the SPEC ran

**Status:** Surprising. Brief §1 said "Closes that debt (M4-DEBT-CRM-AUTO-RULES-UPDATED-AT)", implying the column was missing. Pre-flight introspection on the live DB found:

- Column `updated_at timestamptz NOT NULL DEFAULT now()` present.
- Trigger `crm_automation_rules_set_updated_at_trg BEFORE UPDATE ... EXECUTE FUNCTION update_updated_at()` attached.
- Zero NULL rows in `updated_at`.

In other words, the debt was silently closed before this SPEC, but the debt register was not updated to reflect it. Likely candidate: it landed as a side effect of a prior CRM SPEC and was never tracked back to the originating debt ticket.

**Recommendation for Architect:** before authoring future "close debt X" Briefs, the Architect should run a 30-second introspection against `pg_proc` / `pg_trigger` / `information_schema.columns` to confirm the debt is actually still open. Saves a round-trip when reality has moved ahead of the register.

**Recommendation for tooling:** a Sentinel mission (or extension of `MISSION_06_PROGRESS_TRACKING`) that diffs the open-debt register against live-DB state would catch silently-closed debt automatically.

## Finding 2 — Pattern divergence: trigger naming has split across two eras

In the project today, BEFORE UPDATE updated_at triggers using `public.update_updated_at()` fall into two naming families:

- **Old (pre-2026 CRM):** `trg_{table}_updated` — `trg_brands_updated`, `trg_inventory_updated`, `trg_po_updated`, `trg_suppliers_updated`.
- **New (recent CRM):** `{table}_set_updated_at_trg` — `crm_automation_rules_set_updated_at_trg`.

This SPEC follows the new convention for both new triggers. The old triggers continue to exist under their legacy names — no rename, because rename is destructive and outside scope.

**Recommendation for Architect:** if you want a uniform convention, schedule a small `TRIGGER_NAME_CONSOLIDATION` SPEC that renames the four legacy triggers to the new convention. Low-risk DDL, single transaction, no app code touches trigger names. Not urgent — purely cosmetic.

## Finding 3 — `crm_leads` has `updated_at` but no auto-stamp trigger

While verifying the canonical pattern (Brief §2 says "Mirror the canonical pattern from crm_leads"), I discovered that `crm_leads` itself has the `updated_at` column but NO `BEFORE UPDATE` trigger keeping it fresh. The only triggers on `crm_leads` are domain-specific (`cascade_attendee_soft_delete_trg`).

This means `crm_leads.updated_at` is currently only stamped by app-code paths (e.g., RPCs and explicit JS `.update({updated_at: new Date()})` calls) — any other UPDATE leaves it stale.

**This is NOT in scope for this SPEC.** Fixing it would be a separate Brief decision and a separate destructive-ops declaration. Flagging it here so the Architect can decide.

**Recommendation:** propose a one-line addendum SPEC (`CRM_LEADS_UPDATED_AT_TRIGGER`) that attaches `crm_leads_set_updated_at_trg` to `crm_leads`. Same pattern as this SPEC. ~5 min execution.

## Finding 4 — Pipeline-decided: shared function over per-table functions

Brief §2.1 left the choice between "shared function" and "per-table function" to the Pipeline. Pipeline chose **shared function reuse** because:

- `public.update_updated_at()` already exists, project-wide, in production use.
- Rule 21 (No Duplicates) forbids creating a per-CRM-table copy of the same body.
- A single shared function reduces the project's trigger-function surface area by 3 (would have been crm_lead_notes_set_updated_at(), etc.) and makes future audits trivial: `SELECT … WHERE p.proname = 'update_updated_at'` lists every table using the pattern.

**Generalizable lesson:** when a Brief offers a fork ("shared X vs per-Y X"), default to **shared** unless a per-Y need is documented (e.g., per-table conditional logic).

## Finding 5 — Smoke design: deterministic-row UPDATE is cleaner than insert+delete

The Brief §5 example smoke ("Insert a test row in each of the 3 tables") would have required:
- A real `lead_id` for `crm_lead_notes`.
- A real `(lead_id, event_id)` pair NOT violating any unique constraint for `crm_event_attendees`.
- A unique `name` + valid jsonb structures for `crm_automation_rules`.
- Clean-up DELETEs at the end.

Replacing this with **"pick an existing demo row deterministically (`ORDER BY id LIMIT 1`), no-op UPDATE it, observe `updated_at` advance"** removes all the foreign-key plumbing and the cleanup risk. The trigger's only behavior under test is "does `updated_at = now()` happen on every UPDATE", which a no-op UPDATE (`SET col = col`) exercises perfectly.

**Cost:** one demo row per table has `updated_at` ≈ 15s ahead of `created_at`. That is the correct production semantics — the trigger is doing what it's supposed to do — so it's not pollution.

**Recommendation for Foreman:** for purely additive `updated_at`-style SPECs, prefer the "deterministic existing-row, no-op UPDATE" smoke pattern over insert+delete. Less smoke-scaffolding, same coverage.

## Finding 6 — `transaction_timestamp()` semantics break naïve smoke designs

The trigger uses `NEW.updated_at = NOW()`. `NOW()` in Postgres = `transaction_timestamp()`, which is FIXED for the whole transaction. Naïve smoke designs that do two UPDATEs in one statement (or one `BEGIN/COMMIT` block) will produce two identical `updated_at` values and falsely report "trigger doesn't advance on second UPDATE."

This SPEC's smoke uses **two separate MCP calls** (= two separate transactions) to force `now()` to advance between updates.

**Recommendation:** if a future SPEC needs to verify "trigger advances `updated_at` on each UPDATE within one transaction", the trigger function would need to use `clock_timestamp()` instead of `now()`. Not changing this for the project today — `transaction_timestamp()` is the right default — but the constraint is worth documenting.

---

*End of FINDINGS.*
