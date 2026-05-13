# SPEC — M4_STALE_INVITED_LEADS_SWEEP

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_STALE_INVITED_LEADS_SWEEP/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Full Auto Pipeline (Sonnet)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM
> **Phase:** post-MVP hardening
> **Brief:** `modules/Module 4 - CRM/architecture-brief/M4_STALE_INVITED_LEADS_SWEEP_BRIEF.md` (v1)
> **Source finding:** `M4_CANCEL_SYNC_FIX/FINDINGS.md` → F-CSF-1 (INFO, ~960 stale invited leads on Prizma)

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-14.
- Source finding F-CSF-1 read; it asserts ~960 Prizma leads carry `status='invited'` with no active attendee rows.
- The `sync_lead_status_from_attendee` RPC exists and is the canonical recompute path (used by `M4_CANCEL_SYNC_FIX` and `M4_WAITLIST_SYNC_PRIORITY_FIX`).
- The Brief's expected post-status whitelist is `[waiting, invited, waitlist, confirmed, confirmed_verified, attended]`. This matches the active slugs in `crm_statuses`.
- Pre-existing untracked files surveyed at SPEC-authoring time: numerous `.md` brief/activation artifacts exist under `modules/Module 1.5 - Shared Components/architecture-brief/` and similar. The Executor will leave them alone — selective `git add` by filename throughout.
- Lessons applied from prior `FOREMAN_REVIEW.md` files in this module:
  - **From `M4_WAITLIST_SYNC_PRIORITY_FIX/FOREMAN_REVIEW.md` Author Proposal 1** (ordering as stop-trigger): the Brief's "Demo first → then Prizma" ordering is codified as §5 stop-trigger #1 (post-Demo verification must be green before Prizma begins).
  - **From `M4_WAITLIST_SYNC_PRIORITY_FIX/FOREMAN_REVIEW.md` Author Proposal 2** (capture-and-modify CTE): the per-lead RPC call is wrapped in a CTE that joins pre-state + post-state per row, written to `PRE_POST_SNAPSHOT.md` as the rollback artifact (Brief §3.3).
  - **From `M4_DEAD_WAITLIST_SLUG_CLEANUP/FOREMAN_REVIEW.md` skill harvest 1** (don't delete what may be a target of an unfired flow): N/A — this SPEC does not delete any config; it re-derives lead status via an existing RPC.
- Cross-Reference Check (Rule 21 / Step 1.5): this SPEC introduces NO new DB objects, NO new files in code paths, NO new T-constants, NO new FIELD_MAP entries, NO new config keys. Only writes are RPC-derived UPDATEs on `crm_leads.status`. 0 collisions.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | Captured at | Description |
|---|---|---|
| `BASE_PRIZMA_STALE_PRE` | Step 0 of execution | Count of Prizma leads where `status='invited'` AND no `crm_event_attendees` row with `is_deleted=false` on an event whose status is NOT in (`closed`, `completed`). Brief expects 800–1200. |
| `BASE_DEMO_STALE_PRE` | Step 0 of execution | Same query on demo tenant. Likely 0; sweep them anyway if > 0. |

(Baselines are runtime-captured, not pinned at SPEC-authoring time, because the count drifts as new attendee activity happens. The 800–1200 acceptance band is the SPEC-authoring-time bound; the actual `BASE_*` is recorded in `EXECUTION_REPORT.md` §2.)

---

## 1. Goal

Retroactively recompute `crm_leads.status` for ~960 Prizma leads that are stuck at `status='invited'` despite having no active attendee rows, using the existing `sync_lead_status_from_attendee` RPC. Demo first (smoke), Prizma after. Zero DDL, zero code changes — data sweep only.

---

## 2. Background & Motivation

Finding F-CSF-1 from `M4_CANCEL_SYNC_FIX` (closed 2026-05-14) identified that ~960 Prizma leads carry `status='invited'` despite having no `crm_event_attendees` rows on non-closed/non-completed events. These leads accumulated over time from cancel paths that historically bypassed sync (now fixed in `M4_CANCEL_SYNC_FIX`) AND from the `WAITLIST_SYNC_PRIORITY_FIX` migration (2026-05-13) that changed the sync's derivation logic without a backfill. The current sync RPC, re-run on each, will derive the correct status (`waiting` for most, since they have no active attendee).

Until they are swept, Daniel's Tier 2 board misrepresents their actual lifecycle, and any automation targeting `status='waiting'` misses them.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean at end | `git status` → "nothing to commit, working tree clean" |
| 2 | Safety tag pushed | `pre-m4-stale-invited-leads-sweep-2026-05-14` exists on origin | `git ls-remote --tags origin \| grep pre-m4-stale-invited-leads-sweep-2026-05-14` → 1 row |
| 3 | `BASE_PRIZMA_STALE_PRE` (pre-sweep stale count, Prizma) | integer in `[800, 1200]` | Supabase MCP execute_sql — predicate query in §8 |
| 4 | `BASE_DEMO_STALE_PRE` (pre-sweep stale count, demo) | integer ≥ 0 (any value acceptable, expected ~0) | Supabase MCP execute_sql — same predicate, demo tenant |
| 5 | Demo sweep post-state | 0 demo leads remain matching the predicate | Same predicate, demo tenant → 0 |
| 6 | Pre-sweep snapshot captured (Prizma) | `PRE_POST_SNAPSHOT.md` exists in SPEC folder; row count = `BASE_PRIZMA_STALE_PRE` | `wc -l PRE_POST_SNAPSHOT.md` ≈ `BASE_PRIZMA_STALE_PRE` + header |
| 7 | Prizma sweep post-state | 0 Prizma leads remain matching the predicate | Same predicate, prizma tenant → 0 |
| 8 | Post-sweep status whitelist | Every swept lead's new `status` ∈ `{waiting, invited, waitlist, confirmed, confirmed_verified, attended}` | DISTINCT status from snapshot post-column → all values inside whitelist |
| 9 | Commits produced | 1–2 commits (cap 3) on `develop` ahead of origin/develop at SPEC start | `git log <start>..HEAD --oneline \| wc -l` ≤ 3 |
| 10 | Closure retrospective files exist | `EXECUTION_REPORT.md`, `PRE_POST_SNAPSHOT.md`, optional `FINDINGS.md` in SPEC folder | `ls modules/Module\ 4\ -\ CRM/docs/specs/M4_STALE_INVITED_LEADS_SWEEP/` |
| 11 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 12 | No unauthorized DDL or non-RPC writes | 0 schema changes; 0 direct UPDATE statements against `crm_leads` outside the RPC | Code review of EXECUTION_REPORT §3 — only RPC invocations |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo.
- Run Level-1 (read-only) SQL on demo + prizma.
- Run Level-2 (RPC-mediated UPDATE) SQL invoking `sync_lead_status_from_attendee` on the leads identified by the predicate, in batches of 50–100, against demo first and then Prizma. The Brief AUTHORIZES these writes explicitly.
- Write SPEC retrospective files (`EXECUTION_REPORT.md`, `PRE_POST_SNAPSHOT.md`, optional `FINDINGS.md`) inside this SPEC folder.
- Append a one-line entry to `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` and `modules/Module 4 - CRM/docs/CHANGELOG.md` describing the sweep.
- Commit + push to `develop`. 1–2 commits expected, cap at 3.
- Create + push the safety tag `pre-m4-stale-invited-leads-sweep-2026-05-14`.

### What REQUIRES stopping and reporting (escalation)
- `BASE_PRIZMA_STALE_PRE` outside the `[800, 1200]` range → STOP, write escalation file.
- Any swept lead lands at a status NOT in the §3 #8 whitelist → STOP, escalation.
- Post-sweep count of stale invited leads on Prizma is NOT exactly 0 → STOP, escalation.
- Any DDL temptation (DROP, ALTER, new view, new RPC) → STOP, this SPEC forbids it.
- Any merge to `main` → STOP, NEVER permitted under this SPEC.
- Any direct `UPDATE crm_leads SET status=...` statement (i.e. NOT going through the RPC) → STOP.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. **Ordering trigger** (lifted from Brief §2.2): if demo sweep post-state count is not 0, do NOT proceed to Prizma. STOP, escalate.
2. **Range trigger** (Brief §3.7): `BASE_PRIZMA_STALE_PRE ∉ [800, 1200]`. STOP.
3. **Slug trigger** (Brief §3.7): any post-state status outside the 6-status whitelist. STOP.
4. **Residue trigger** (Brief §3.7): post-sweep Prizma stale count ≠ 0. STOP.
5. **Snapshot trigger**: if the pre-sweep `PRE_POST_SNAPSHOT.md` cannot be written before the sweep begins, STOP — no rollback artifact = no sweep.
6. **Commit-budget trigger**: if the run is about to exceed 3 commits, STOP and consolidate; do not absorb scope drift into a 4th commit.

---

## 6. Rollback Plan

Two independent rollback layers:

1. **Code/repo rollback** — `git reset --hard pre-m4-stale-invited-leads-sweep-2026-05-14` and `git push --force-with-lease origin develop`. Reverts SPEC commits only. Requires Daniel's explicit go-ahead (force-push is non-overridable per CLAUDE.md §7).
2. **Data rollback** — the `PRE_POST_SNAPSHOT.md` artifact contains every swept `lead_id` with its pre-sweep status. Reconstruct rollback UPDATEs from that file:
   ```sql
   UPDATE crm_leads SET status='<old_status>' WHERE id='<lead_id>' AND tenant_id='<prizma_uuid>';
   ```
   These UPDATEs would NOT go through the RPC because the goal is to literally restore prior state, not re-derive it. Direct UPDATE is acceptable in rollback context only and only with Daniel's explicit authorization. The snapshot is the source of truth.

The safety tag is the single rollback point for the SPEC's repo state; the snapshot is the single rollback artifact for the data.

---

## Destructive Operations

Required by Iron Rule 32. List every destructive operation this SPEC authorizes.

1. **~960 lead-row UPDATEs on Prizma `crm_leads.status`** via repeated invocations of `sync_lead_status_from_attendee(p_lead_id, p_tenant_id)` RPC. The RPC's internal logic produces the new status; the Pipeline does NOT write direct UPDATE statements against `crm_leads`. Authorized by Brief §3.3 ("explicitly authorized") and bounded by §3 Success Criteria #3 ([800, 1200]) and #8 (status whitelist).
2. **0–N lead-row UPDATEs on demo `crm_leads.status`** via the same RPC for any demo leads matching the predicate (smoke; expected ~0).
3. **Push of one annotated git tag** (`pre-m4-stale-invited-leads-sweep-2026-05-14`). Not strictly destructive but listed for transparency.

**Explicitly NOT authorized** (would trigger STOP under §5):
- Any DDL (DROP, ALTER, CREATE TABLE, CREATE VIEW, CREATE FUNCTION).
- Any direct UPDATE/DELETE/INSERT against `crm_leads`, `crm_event_attendees`, `crm_statuses`, or any other CRM table outside of the RPC invocations above.
- Any `TRUNCATE`, `git reset --hard`, `git push --force`, file delete, file rename ≥5 files.
- Any merge or push to `main`.

---

## 7. Out of Scope (explicit)

- **Re-syncing non-`invited` leads.** Other staleness slices exist (F-CSF-1 notes: `confirmed_verified` leads with mixed-status attendees, etc.). They are out of scope for this Brief.
- **Code changes.** No new RPC. No new view. No edits to JS/HTML/CSS. No changes to `sync_lead_status_from_attendee`.
- **Demo synthetic data.** The Brief explicitly excludes backfilling demo with synthetic stale leads to broaden the smoke. We sweep whatever exists.
- **Doc edits beyond CHANGELOG + SESSION_CONTEXT.** No edits to `STATUS_MODEL.md`, `MODULE_SPEC.md`, `MODULE_MAP.md`, `GLOBAL_MAP.md`, `GLOBAL_SCHEMA.sql`. (F-CSF-4 from `M4_CANCEL_SYNC_FIX` is its own concern.)
- **Merges to main.** Daniel handles PR.

---

## 8. Expected Final State

### New files (SPEC folder)
- `modules/Module 4 - CRM/docs/specs/M4_STALE_INVITED_LEADS_SWEEP/SPEC.md` (this file)
- `modules/Module 4 - CRM/docs/specs/M4_STALE_INVITED_LEADS_SWEEP/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_STALE_INVITED_LEADS_SWEEP/PRE_POST_SNAPSHOT.md`
- `modules/Module 4 - CRM/docs/specs/M4_STALE_INVITED_LEADS_SWEEP/FINDINGS.md` (only if findings surface)
- `modules/Module 4 - CRM/docs/specs/M4_STALE_INVITED_LEADS_SWEEP/FOREMAN_REVIEW.md` (written by Foreman after Executor closes)

### Modified files
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — one-line entry at top noting the sweep
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — section "Stale Invited Leads Sweep, 2026-05-14" with commit hash + count

### Deleted files
- None.

### DB state
- Prizma: 0 leads matching the predicate `status='invited' AND NOT EXISTS (active attendee on non-closed/non-completed event)`.
- Demo: 0 leads matching the same predicate.
- Distribution: ~960 leads previously at `invited` are now distributed across the whitelist statuses, expected majority at `waiting`.

### Predicate (canonical query — both pre-state and post-state checks)

```sql
SELECT count(*) AS stale_invited
FROM crm_leads l
WHERE l.tenant_id = '<TENANT_UUID>'
  AND l.status = 'invited'
  AND l.is_deleted = false
  AND NOT EXISTS (
    SELECT 1
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id
    WHERE a.lead_id = l.id
      AND a.is_deleted = false
      AND e.status NOT IN ('closed', 'completed')
  );
```

Tenant UUIDs:
- Demo: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Prizma: looked up by slug `prizma` at execution time (do NOT hardcode in this SPEC; the Executor resolves at runtime).

### Capture-and-modify pattern for the sweep

Per the FOREMAN_REVIEW author proposal recipe — execute the sweep in batches of 50–100 like:

```sql
WITH targets AS (
  SELECT l.id AS lead_id, l.status AS old_status
  FROM crm_leads l
  WHERE l.tenant_id = '<PRIZMA_UUID>'
    AND l.status = 'invited'
    AND l.is_deleted = false
    AND NOT EXISTS (
      SELECT 1 FROM crm_event_attendees a
      JOIN crm_events e ON e.id = a.event_id
      WHERE a.lead_id = l.id
        AND a.is_deleted = false
        AND e.status NOT IN ('closed', 'completed')
    )
  ORDER BY l.id
  LIMIT 100 OFFSET <N>
),
synced AS (
  SELECT t.lead_id, t.old_status,
         public.sync_lead_status_from_attendee(t.lead_id, '<PRIZMA_UUID>'::uuid) AS sync_result
  FROM targets t
)
SELECT s.lead_id, s.old_status, l_new.status AS new_status, s.sync_result
FROM synced s
JOIN crm_leads l_new ON l_new.id = s.lead_id;
```

The returned rows are appended to `PRE_POST_SNAPSHOT.md`. The full snapshot covers every swept lead.

### Docs updated (MUST include)
- Module's `SESSION_CONTEXT.md` ✓
- Module's `CHANGELOG.md` ✓
- `MASTER_ROADMAP.md` — NOT updated (Module 4 administratively closed 2026-05-06; post-MVP hardening SPECs do not bump roadmap state, per `M4_WAITLIST_SYNC_PRIORITY_FIX/FOREMAN_REVIEW.md` §8)
- `docs/GLOBAL_MAP.md` — NOT updated (no new functions/contracts)
- `docs/GLOBAL_SCHEMA.sql` — NOT updated (zero DDL)

---

## 9. Commit Plan

Target: 1 commit. Cap: 3.

- **Commit 1 (mandatory):** `chore(m4,spec): close M4_STALE_INVITED_LEADS_SWEEP — sweep ~960 stale invited leads via sync RPC`
  - Adds: `SPEC.md`, `EXECUTION_REPORT.md`, `PRE_POST_SNAPSHOT.md`, optional `FINDINGS.md`
  - Modifies: `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`, `modules/Module 4 - CRM/docs/CHANGELOG.md`
- **Commit 2 (optional):** if the snapshot file is unusually large (>500KB), separate it: `chore(m4,spec): split PRE_POST_SNAPSHOT for M4_STALE_INVITED_LEADS_SWEEP`.
- **Commit 3 (optional, only if Foreman writes review in-band):** `chore(m4,spec): add FOREMAN_REVIEW for M4_STALE_INVITED_LEADS_SWEEP`.

The actual data sweep happens via Supabase MCP `execute_sql` — no DB code lands in the repo.

The safety tag is created and pushed BEFORE Commit 1 (as the first action of execution per Brief §3.1).

---

## 10. Dependencies / Preconditions

- The `sync_lead_status_from_attendee(p_lead_id, p_tenant_id)` RPC must exist and be invocable. Verified via prior SPECs (`M4_WAITLIST_SYNC_PRIORITY_FIX`, `M4_CANCEL_SYNC_FIX`). Executor confirms in Step 0.
- Supabase MCP available (read + write).
- Prizma tenant UUID resolvable via `SELECT id FROM tenants WHERE slug='prizma'`.
- `pre-m4-stale-invited-leads-sweep-2026-05-14` tag must NOT already exist (otherwise increment date or escalate).

---

## 11. Lessons Already Incorporated

- **FROM `M4_WAITLIST_SYNC_PRIORITY_FIX/FOREMAN_REVIEW.md` Author Proposal 1** ("ordering as stop-trigger") → **APPLIED in §5 stop-trigger #1** (demo must hit 0 before Prizma sweep starts).
- **FROM `M4_WAITLIST_SYNC_PRIORITY_FIX/FOREMAN_REVIEW.md` Author Proposal 2** ("capture-and-modify CTE recipe") → **APPLIED in §8** (the canonical CTE pattern is given verbatim for the Executor to use).
- **FROM `M4_DEAD_WAITLIST_SLUG_CLEANUP/FOREMAN_REVIEW.md` skill harvest 1** ("don't delete what may be a target of an unfired flow") → **NOT APPLICABLE** (this SPEC deletes nothing; it re-derives via existing RPC).
- **FROM `M4_DEAD_WAITLIST_SLUG_CLEANUP/FOREMAN_REVIEW.md` skill harvest 2** ("0-count is symptom, not proof") → **PARTIALLY APPLICABLE** (acknowledged: post-sweep, leads moved to `waiting` will be a meaningful, populated state, not an empty-set hide).

---

## 12. Pre-Merge Checklist

- [ ] §3 #1: `git status` clean.
- [ ] §3 #2: Safety tag pushed.
- [ ] §3 #3: `BASE_PRIZMA_STALE_PRE` ∈ [800, 1200] (else STOP, escalate).
- [ ] §3 #4: `BASE_DEMO_STALE_PRE` captured.
- [ ] §3 #5: Demo post-state = 0.
- [ ] §3 #6: `PRE_POST_SNAPSHOT.md` written with row count ≈ `BASE_PRIZMA_STALE_PRE`.
- [ ] §3 #7: Prizma post-state = 0.
- [ ] §3 #8: All post-sweep statuses in whitelist.
- [ ] §3 #9: 1–3 commits.
- [ ] §3 #10: SPEC folder contains required retrospective files.
- [ ] §3 #11: Integrity Gate exit 0 or 2.
- [ ] §3 #12: 0 direct UPDATEs against `crm_leads` (RPC-only).
- [ ] HEAD pushed to `origin/develop`.

---

*End of SPEC. Dispatched to opticup-executor under Full Auto Pipeline (Sonnet).*
