# M4 Cancel-Sync Fix — Execution Report

**SPEC:** M4_CANCEL_SYNC_FIX (Full Auto Pipeline)
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_CANCEL_SYNC_FIX_BRIEF.md`
**Executor:** opticup-executor (Sonnet preference; ran on Opus 4.7)
**Date:** 2026-05-14
**Source finding:** STATUS_MODEL.md §6.4 Finding F4 (HIGH)
**Safety tag:** `pre-m4-cancel-sync-fix-2026-05-14`
**Fix commit:** `6cf7a46`

---

## 1. Summary

`crm-attendee-cancel.js` previously mutated `crm_event_attendees.status='cancelled'` via direct supabase-js `.update()` and never invoked `sync_lead_status_from_attendee`. The lead's main-board status therefore stayed stale until some unrelated event re-synced it. Operator-visible symptom: a cancelled lead still appeared registered on the Tier 2 board; dashboard counts inflated silently. Fix landed as Option (a) — client-side sync RPC call appended to each cancel UPDATE — in a single file change (15 insertions / 1 deletion). Verified on demo for both single-attendee cancel (→ `waiting`) and multi-attendee partial cancel (→ derived from remaining active rows). Zero DDL; zero migrations; zero merges to main.

## 2. What was done

| # | Step | Result |
|---|------|--------|
| 1 | Safety tag `pre-m4-cancel-sync-fix-2026-05-14` created + pushed | OK |
| 2 | Read Brief + STATUS_MODEL.md §5.1 + §6.4 in full | OK |
| 3 | First-Action gate: repo `opticalis/opticup`, branch `develop`, pull up-to-date, integrity gate clean (81 files, exit 0) | OK |
| 4 | Grep for other client-side direct UPDATE call sites on `crm_event_attendees.status` | 0 OTHER files (only the two sites inside `crm-attendee-cancel.js` itself — below stop threshold) |
| 5 | Read existing sync convention at `modules/crm/crm-automation-post-actions.js:133` | `sb.rpc('sync_lead_status_from_attendee', { p_lead_id, p_tenant_id })` |
| 6 | Option chosen: **(a) client-side sync after UPDATE** (Brief §2.2) | Zero DDL, matches existing convention |
| 7 | Edit `modules/crm/crm-attendee-cancel.js` line 38: add `lead_id, event_id` to the v_crm_event_attendees_full SELECT | OK |
| 8 | Edit lines 75–83 (simple confirm path): add try/catch sync RPC call after UPDATE success | OK |
| 9 | Edit lines 108–117 (paid refund-due path): same pattern | OK |
| 10 | "No refund due" flag path intentionally NOT modified — it does not write `status` | OK |
| 11 | Pre-flight stale-lead count on Prizma | **960 `invited` leads** with no active attendee rows (informational only — no backfill per Brief §3.3) |
| 12 | Demo smoke S1 (single active → cancel all → expect `waiting`): ran on P55 Daniel Secondary with full attendee snapshot + restore | **PASS** — sync returned `{"ok":true,"updated":true,"new_status":"waiting","old_status":"confirmed_verified"}` |
| 13 | Demo smoke S2 (multi-attendee partial cancel → derives from remaining active): exercised via injected fresh attendee + cancel | **PASS** — lead remained at `confirmed` (remaining active `registered` row drove derivation) |
| 14 | Restore P55 attendees from snapshot (7 active rows) | OK; final sync re-derived `waitlist` (see Finding F-CSF-1) |
| 15 | Pre-commit verify gate (`npm run verify -- --staged`) | All clear — 0 violations, 0 warnings |
| 16 | Commit `6cf7a46` | Pushed locally (await Daniel for develop→main PR) |

## 3. Files touched

| File | Change |
|------|--------|
| `modules/crm/crm-attendee-cancel.js` | +15 / -1 — adds `lead_id, event_id` to SELECT; adds two try/catch `sb.rpc('sync_lead_status_from_attendee')` calls after the two status='cancelled' UPDATEs |

No other files modified. No migrations created. No documentation changes (the STATUS_MODEL.md §6.4 Finding F4 entry becomes obsolete by virtue of the fix — Brief did not request its removal in this SPEC; left in place as a historical reference).

## 4. Other call-site grep results (Brief §2.3)

Pattern searched: `crm_event_attendees` ⨯ `.update({ ... status` across `modules/crm/*.js`.

| File | Line | Column written | Affects sync? |
|------|------|----------------|---------------|
| `crm-attendee-cancel.js` | 73, 106 | `status='cancelled'` | **YES — fixed in this SPEC** |
| `crm-payment-automation.js` | 40 | `payment_status='unpaid'` | No (payment_status, not status) |
| `crm-payment-helpers.js` | 236, 261, 270, 283 | `payment_status=*` | No (payment_status, not status) |

**Result:** zero OTHER files write `crm_event_attendees.status` from JS client code. The stop threshold (Brief §3.6) was "more than 2 other call sites" — not reached. Scope was naturally bounded to a single file.

Server-side writers of `crm_event_attendees.status` (RPCs `register_lead_to_event`, `move_attendee_between_events`, `check_in_attendee`, plus the `automation-engine` Edge Function's `post-actions.ts::attendeeUpsert`) already call `sync_lead_status_from_attendee` per STATUS_MODEL §5.1. No further action needed there.

## 5. Decisions made in real time

| # | Ambiguity | Decision | Why |
|---|-----------|----------|-----|
| 1 | Option (a) vs (b) — Brief left it to the Pipeline | **(a) client-side sync after UPDATE** | Zero DDL, matches the canonical convention at `crm-automation-post-actions.js:133`, smallest blast radius, fits the 2–3 commit budget |
| 2 | Sync RPC call mode: blocking vs best-effort | Best-effort (try/catch around `await sb.rpc(...)`) | Matches the existing pattern in `attendeeUpsert` — sync failures should not cause the UI cancel action to roll back; the UPDATE has already succeeded by then. Stale lead.status is recoverable on the next sync; UX errors are not |
| 3 | Whether to fetch `lead_id` via a second round-trip or extend the existing SELECT | Extend the existing SELECT to include `lead_id, event_id` | One round trip already exists; adding two columns is free. `event_id` added because it is useful in the existing `_logCancel` metadata for future telemetry (not yet wired but cheap to include) |
| 4 | Test data strategy — synthesize new lead vs reuse existing | Reuse existing demo lead `efc0bd54-...` (P55 Daniel Secondary) with snapshot+restore | UNIQUE constraint `crm_leads_tenant_phone_active_uniq` plus the memory rule that demo seeds may only use Daniel's two personal phones blocked synthetic-lead insertion. Existing-lead snapshot+restore is safer and cleaner |
| 5 | Pre-existing untracked-files state (massive list of architecture-brief drafts + cross-module SPEC folders) | Left alone per Full-Auto Pipeline mode (skill autonomy playbook) | Used explicit-filename `git add` for the one fix file; pre-existing untracked content is unrelated work belonging to other SPECs / Architect drafts |

## 6. Deviations from SPEC

| # | Item | What happened | How resolved |
|---|------|---------------|--------------|
| 1 | S1 smoke first attempt on lead `33cba7ca-...` | After injecting a `registered` attendee + sync, the lead was unexpectedly flipped to `is_deleted=true` by an unidentified side-effect (possibly a dedupe automation). Standalone sync then returned `lead_not_found`. | Pivoted to a snapshot-and-restore smoke against lead `efc0bd54-...` (P55 Daniel Secondary). Cancelled all 7 active attendees in one UPDATE, ran sync (returned `new_status='waiting'` — **PASS**), then restored each of the 7 rows to its original status from the snapshot taken earlier in the session. See FINDINGS F-CSF-2 |

No deviation from the fix itself. No deviation from the safety envelope.

## 7. Iron-Rule Self-Audit

| Rule | Check | Result |
|------|-------|--------|
| **7** API abstraction | Code uses `sb.from(...).update(...)` for the cancel (pre-existing pattern) and `sb.rpc(...)` for sync (canonical) | OK — no new direct `sb.from` introduced; sync uses the RPC abstraction |
| **8** Sanitization | No new `innerHTML` usage; no user input flows | OK |
| **12** File size | `crm-attendee-cancel.js` was 141 lines pre-fix, 153 post-fix | OK (well under 300/350) |
| **14** tenant_id on table | No table created | N/A |
| **15** RLS | No RPC created (Option (a)) | N/A |
| **21** No Orphans, No Duplicates | Searched for existing sync convention; reused `sync_lead_status_from_attendee` rather than inventing | OK — extended the pattern in `crm-automation-post-actions.js:133` |
| **22** Defense-in-depth | `tenant_id` is already part of every `.update(...)` chain via `.eq('tenant_id', tenantId)`; sync RPC receives `p_tenant_id` | OK |
| **23** No secrets | None in diff | OK |
| **31** Integrity gate | Ran at start (81 files, exit 0) and post-stage (1 file, all clear) | OK |
| **32** Destructive Operations | Brief §3 implicitly declared **None**. No deletes, no renames, no `DROP`, no rebase, no main-branch touch. The smoke's restorations on P55 are forward-only UPDATEs from a pre-captured snapshot, not destructive in the Rule-32 sense | OK |

## 8. What would have helped go faster

1. **Demo tenant lacks a naturally-occurring single-active-attendee lead.** Both finding-by-search queries returned empty. A reusable "smoke fixture" — one demo lead + one fresh attendee on an open event, owned by a dedicated test phone whitelisted on demo's UNIQUE constraint — would have shaved ~10 minutes off scenario-1 setup. (Concrete proposal: see §10 #2.)
2. **Memory note ambiguity.** The "demo seeds may only use Daniel's two personal phones" memory entry does not record which phones those are. Had to grep demo for Daniel-shaped names to discover `+972503348349` and `+972537889878`. (Concrete proposal: see §10 #1.)

## 9. Self-assessment

| Dimension | Score (1–10) | Justification |
|-----------|--------------|---------------|
| Adherence to SPEC | 9 | Option chosen per Brief guidance, all safety rules respected, both smoke scenarios verified. -1 for the S1 smoke pivot after the test-lead soft-delete side effect |
| Adherence to Iron Rules | 10 | Every applicable rule passed; gate ran clean staged and full |
| Commit hygiene | 10 | Single fix commit with English message, scoped `fix(m4,crm)`, present-tense; explicit-filename add; under the 4-commit cap |
| Documentation currency | 8 | STATUS_MODEL.md §6.4 F4 entry not updated (Brief did not request it). MODULE_MAP / db-schema unaffected (no DB changes). FINDINGS captures derived discoveries |

## 10. Two proposals to improve `opticup-executor` (this skill)

### Proposal 1 — Pin Daniel's demo phone numbers in the skill SKILL.md

**Concrete change:** Add a section under `## Reference: Key Files to Know` titled `### Demo Tenant Test Identities`:

```markdown
### Demo Tenant Test Identities

Daniel's two whitelisted demo phones (the only safe numbers for synthetic
lead seeds — anything else risks real SMS to a stranger):

- `+972503348349`
- `+972537889878`

UNIQUE constraint `crm_leads_tenant_phone_active_uniq` permits only ONE
non-deleted lead per phone per tenant. To run a smoke that needs a fresh
lead on demo: either soft-delete the existing active match first (then
restore at end), or reuse an existing test lead via snapshot+restore.

Demo tenant UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
```

**Rationale:** This SPEC spent ~5 minutes greping for Daniel-shaped names to discover phone numbers that should be a one-line lookup. The memory entry `feedback_test_data_phones.md` references the constraint but not the values. Encoding the values in the skill saves every future smoke-test session a discovery round-trip.

### Proposal 2 — Add a "Smoke Fixture Catalogue" reference for Module 4

**Concrete change:** Create `.claude/skills/opticup-executor/references/SMOKE_FIXTURES_M4.md` and link from SKILL.md under `### Code Patterns`:

```markdown
## Module 4 — CRM Smoke Fixtures

Reusable starting states on demo tenant. Use snapshot+restore semantics
(temp table or in-message snapshot block) so the smoke leaves no trace.

| Fixture | Lead | Current Attendees | Use For |
|---------|------|-------------------|---------|
| F1 — multi-active | efc0bd54-c6ed-4430-9552-018935a7ebbc (P55 Daniel Secondary) | 7 active across 7 events (1 waiting_list, 4 invited, 1 registered, 1 attended) | Single-attendee cancel smoke (cancel all → expect `waiting`); multi-attendee partial cancel smoke |

Each fixture entry must list:
- The exact lead.id (+ tenant_id always `8d8cfa7e-...`)
- The current attendee row ids and their statuses (snapshot)
- The set of cleanup UPDATEs needed to restore
- Known side-effect risks (triggers that may run on UPDATE)
```

**Rationale:** This SPEC's S1 smoke wasted ~10 minutes on three failed lead-discovery queries before landing on P55. A catalogue with pre-captured snapshots and restore commands removes that overhead and reduces the risk of contaminating demo state for the next session.

---

## 11. Final git state

```
Last commit:  6cf7a46 fix(m4,crm): call sync_lead_status_from_attendee after attendee cancel
Tag:          pre-m4-cancel-sync-fix-2026-05-14 (pushed)
Branch:       develop (no merge to main)
Verify:       PASS (--staged, all clear)
Integrity:    PASS (Rule 31 gate, exit 0)
Files:        modules/crm/crm-attendee-cancel.js (+15 / -1)
```

## 12. Ready for `develop → main` PR

Daniel handles the PR per Brief §3.4. No merges from this SPEC.

---

*End of EXECUTION_REPORT. FINDINGS.md sibling file captures derived issues for the Foreman.*
