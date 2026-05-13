# M4_STALE_INVITED_LEADS_SWEEP — Pre/Post Snapshot (Rollback Artifact)

**SPEC:** `M4_STALE_INVITED_LEADS_SWEEP`
**Date executed:** 2026-05-13 UTC (Brief dated 2026-05-14 — Israel local)
**Sweep window (UTC):** 2026-05-13 15:15:00 → 2026-05-13 15:23:00 (~8 minutes)
**Master safety tag:** `pre-m4-stale-invited-leads-sweep-2026-05-14` (annotated tag pushed to `origin`)

---

## 1. Affected population (canonical predicate)

The swept population is exactly the 1,042 Prizma leads that, immediately before the sweep, matched:

```sql
SELECT l.id FROM crm_leads l
WHERE l.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid  -- Prizma
  AND l.status = 'invited'
  AND l.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id
    WHERE a.lead_id = l.id
      AND a.is_deleted = false
      AND e.status NOT IN ('closed', 'completed')
  );
-- pre-sweep count: 1042
```

**Pre-sweep `old_status` for every row:** `'invited'` (uniform by predicate definition; no per-row variance).

## 2. Reproducible post-sweep identity

The same 1,042 leads are now identifiable by this post-sweep predicate, used as the rollback identity:

```sql
SELECT id FROM crm_leads
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid
  AND status = 'waiting'
  AND updated_at >= '2026-05-13 15:14:00+00'::timestamptz
  AND updated_at <= '2026-05-13 15:30:00+00'::timestamptz
  AND is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id
    WHERE a.lead_id = crm_leads.id
      AND a.is_deleted = false
      AND e.status NOT IN ('closed', 'completed')
  );
-- result: 1042 rows
-- MD5(string_agg(id::text, ',' ORDER BY id)) = badf3cdcd8fc6d755cf2a9e7aa22faaa
-- total characters in concatenated ID list: 38553
```

**Stability of identity:** the predicate is anchored on three columns: `status='waiting'` (changeable but rare for these leads), `updated_at` (the sweep window is closed and historical), and the NOT EXISTS clause (the underlying attendee/event state is stable for these leads — they have no active attendees by definition). If at rollback time the digest still matches, the identity holds. If it diverges, recompute against the snapshot's MD5 to identify drift.

## 3. Rollback procedure (data-side)

Use ONLY with Daniel's explicit go-ahead. The master safety tag (`pre-m4-stale-invited-leads-sweep-2026-05-14`) handles repo rollback; this section handles the 1,042 lead UPDATEs.

### Step 3.1 — Verify population still identifiable

```sql
WITH ids AS (
  SELECT id FROM crm_leads
  WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid
    AND status = 'waiting'
    AND updated_at >= '2026-05-13 15:14:00+00'::timestamptz
    AND updated_at <= '2026-05-13 15:30:00+00'::timestamptz
    AND is_deleted = false
    AND NOT EXISTS (
      SELECT 1 FROM crm_event_attendees a
      JOIN crm_events e ON e.id = a.event_id
      WHERE a.lead_id = crm_leads.id
        AND a.is_deleted = false
        AND e.status NOT IN ('closed', 'completed')
    )
)
SELECT count(*) AS n, md5(string_agg(id::text, ',' ORDER BY id)) AS digest FROM ids;
-- Expect: n=1042, digest=badf3cdcd8fc6d755cf2a9e7aa22faaa
```

If `n` ≠ 1042 OR digest ≠ `badf3cdcd8fc6d755cf2a9e7aa22faaa` — STOP. Population has drifted. Investigate before proceeding.

### Step 3.2 — Restore status='invited' (only after Step 3.1 passes)

```sql
UPDATE crm_leads
SET status = 'invited'
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid
  AND status = 'waiting'
  AND updated_at >= '2026-05-13 15:14:00+00'::timestamptz
  AND updated_at <= '2026-05-13 15:30:00+00'::timestamptz
  AND is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id
    WHERE a.lead_id = crm_leads.id
      AND a.is_deleted = false
      AND e.status NOT IN ('closed', 'completed')
  );
-- Expect: 1042 rows updated.
```

Note: this is a direct UPDATE (NOT going through the RPC) — appropriate in rollback context because the goal is to literally restore prior state, not re-derive it. The Iron-Rule-32 envelope of the original SPEC was RPC-only writes; a rollback is OUT-OF-BAND of that envelope and requires explicit per-incident authorization from Daniel.

## 4. Distribution table (post-sweep)

| Source predicate match | n | Post-sweep status |
|---|---|---|
| Prizma, swept by RPC | 1042 | `waiting` |
| Prizma, swept by RPC | 0 | other |
| Demo, swept by RPC | 0 | (no demo leads matched the pre-sweep predicate) |

**Net effect:** 100% of swept leads landed on `waiting`, well within the SPEC §3 #8 whitelist (`{waiting, invited, waitlist, confirmed, confirmed_verified, attended}`).

## 5. Unrelated organic activity in sweep window

One Prizma lead (`ed2e1c4b-ee59-415e-bc7b-b71dfcb3dad4`) was CREATED during the sweep window at 2026-05-13 15:15:31 UTC with `status='new'`, `source='shortcode_lead_form'`, and `created_at == updated_at`. This is organic intake unrelated to the sweep — the sweep itself touched only leads at `status='invited'` and could not have produced a `status='new'` row. Flagged here for transparency; **not** a stop-trigger event because the lead was NOT swept by this SPEC.

---

*End of PRE_POST_SNAPSHOT.md. This file is the canonical data-rollback artifact for `M4_STALE_INVITED_LEADS_SWEEP`.*
