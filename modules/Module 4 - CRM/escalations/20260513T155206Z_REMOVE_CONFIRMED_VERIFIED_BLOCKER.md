# Escalation — M4 Remove confirmed_verified — Brief premise contradicted

**ISO timestamp:** 2026-05-13T15:52:06Z
**SPEC slug:** M4_REMOVE_CONFIRMED_VERIFIED
**Brief:** `modules/Module 4 - CRM/architecture-brief/M4_REMOVE_CONFIRMED_VERIFIED_BRIEF.md` (v1, 2026-05-14)
**Executor:** opticup-executor (Full Auto Pipeline, Sonnet)
**Foreman to read:** opticup-strategic
**Trigger:** Brief §4.7 stop trigger — "any lead carries status='confirmed_verified' → STOP"
**Status:** Halted at end of pre-flight. Zero commits made beyond the safety tag.

---

## 1. What happened

Per Brief §3 pre-flight ("confirm 0 leads at status='confirmed_verified' on BOTH tenants. If any → STOP, assumption is wrong."), I queried `crm_leads` on Prizma + Demo. The Brief's premise breaks in three independent ways:

### 1.1 Demo has 2 leads at `status='confirmed_verified'` (Brief said 0)

```
SELECT t.slug, COUNT(*) FILTER (WHERE l.status='confirmed_verified')
  FROM tenants t LEFT JOIN crm_leads l ON l.tenant_id=t.id
 WHERE t.slug IN ('demo','prizma') GROUP BY t.slug;

→ demo    : 2
→ prizma  : 0
```

The 2 leads:
| lead_id | full_name | updated_at | created_at |
|---|---|---|---|
| a7f5e308-878c-4431-90af-0200595dce4a | איליה טסט | 2026-05-13 08:19:38 UTC | 2026-05-11 16:16:27 UTC |
| 152e6188-2af6-413e-86b1-a44f15e71e66 | דניאל טסט | 2026-05-13 08:19:38 UTC | 2026-05-11 18:34:31 UTC |

Both look like test data ("טסט" = "test" in Hebrew), so this is likely not a production correctness issue — but the Brief's stated assumption is still wrong, which means the cleanup scope is wrong.

### 1.2 Demo has 1 attendee at `status='purchased'` (Brief said no code writes this)

Brief §1: "the `sync_lead_status_from_attendee` RPC maps `attendee.status='purchased'` → `lead.status='confirmed_verified'`, but **no code actually writes `purchased` to attendee.status today**."

Reality:
```
SELECT t.slug, a.status, COUNT(*) FROM crm_event_attendees a
  JOIN tenants t ON t.id=a.tenant_id
 WHERE t.slug IN ('demo','prizma') AND a.is_deleted=false
 GROUP BY t.slug, a.status;

→ demo  / purchased : 1   ← contradicts the Brief
→ demo  / attended  : 3
→ prizma/ purchased : 0   ← matches the Brief
→ prizma/ attended  : 89
```

The single demo `purchased` attendee maps via the live RPC to `confirmed_verified` and explains 1 of the 2 confirmed_verified demo leads.

### 1.3 The RPC also maps `attended` → `confirmed_verified` (Brief addresses only `purchased`)

I captured the original RPC body. Relevant CASE block:

```sql
v_target_status := CASE v_active_status
    WHEN 'confirmed'           THEN 'confirmed'
    WHEN 'registered'          THEN 'confirmed'
    WHEN 'manual_registration' THEN 'confirmed'
    WHEN 'quick_registration'  THEN 'confirmed'
    WHEN 'attended'            THEN 'confirmed_verified'   ← also dead-status target
    WHEN 'purchased'           THEN 'confirmed_verified'   ← Brief §3.2 target
    WHEN 'no_show'             THEN 'confirmed'
    ...
```

Cross-referenced with attendee→lead status combinations:

```
SELECT t.slug, a.status AS att, l.status AS lead, COUNT(*) FROM crm_event_attendees a
  JOIN crm_leads l ON l.id=a.lead_id JOIN tenants t ON t.id=a.tenant_id
 WHERE t.slug IN ('demo','prizma') AND a.is_deleted=false
   AND a.status IN ('attended','purchased') GROUP BY 1,2,3;

→ demo  / attended  / confirmed_verified : 2
→ demo  / attended  / waitlist           : 1
→ demo  / purchased / confirmed_verified : 1
→ prizma/ attended  / unsubscribed       : 3
→ prizma/ attended  / waiting            : 86
```

So both demo confirmed_verified leads are produced by the live RPC — one via `purchased`, one via `attended`. Prizma's 89 attended attendees don't currently land on `confirmed_verified` (probably because the leads transitioned out via other paths after the RPC ran), but the mapping is live and could produce new ones at any time.

### 1.4 Why the partial cleanup in the Brief would leave the system broken

If I execute the Brief as written:
- Drop `purchased → confirmed_verified` from the RPC ✅
- Leave `attended → confirmed_verified` live ✅ (still writes the dead slug to crm_leads.status)
- Set `crm_statuses.confirmed_verified.is_active=false` ✅ (UI dropdown hides it)
- Remove from TIER2_STATUSES ✅ (UI dropdown hides it)

Result: the next time any attendee transitions to `attended` (which happens routinely on Prizma — 89 such today), the RPC will write `'confirmed_verified'` into `crm_leads.status` as a free-text string, but the UI will refuse to display it. Lead becomes invisible in the dropdown until manually re-classified. This is worse than the current state.

---

## 2. What I did before stopping

| # | Action | Result |
|---|---|---|
| 1 | `git remote -v`, `git branch`, `git pull origin develop` | opticalis/opticup, develop, up to date |
| 2 | `npm run verify:integrity` | exit 0, 87 files clean |
| 3 | `git tag -a pre-m4-remove-confirmed-verified-2026-05-14` + push | tag created and pushed |
| 4 | Pre-flight queries (1.1–1.3 above) | premise contradicted — STOP |
| 5 | Captured original RPC body (Brief §4.4 rollback requirement) | saved in this escalation §3 |

**Zero DDL applied. Zero data writes. Zero file edits. Zero commits beyond the safety tag.**

The safety tag remains in place at HEAD on develop and is the rollback point for any later recovery work.

---

## 3. Captured original RPC body (for rollback reference)

```sql
CREATE OR REPLACE FUNCTION public.sync_lead_status_from_attendee(p_lead_id uuid, p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_lead          crm_leads%ROWTYPE;
  v_active_status text;
  v_target_status text;
BEGIN
  SELECT * INTO v_lead FROM crm_leads
   WHERE id = p_lead_id AND tenant_id = p_tenant_id AND is_deleted = false;
  IF v_lead IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;

  IF v_lead.status IN ('not_interested','unsubscribed') THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'reason', 'terminal_status');
  END IF;

  SELECT a.status
    INTO v_active_status
    FROM crm_event_attendees a
    JOIN crm_events e ON e.id = a.event_id AND e.tenant_id = a.tenant_id
   WHERE a.lead_id = p_lead_id
     AND a.tenant_id = p_tenant_id
     AND a.is_deleted = false
     AND a.status NOT IN ('cancelled')
     AND e.status NOT IN ('completed','cancelled')
     AND e.is_deleted = false
   ORDER BY (CASE WHEN a.status = 'waiting_list' THEN 0 ELSE 1 END),
            COALESCE(a.confirmed_at, a.checked_in_at, a.purchased_at, a.registered_at, a.created_at) DESC
   LIMIT 1;

  v_target_status := CASE v_active_status
    WHEN 'confirmed'           THEN 'confirmed'
    WHEN 'registered'          THEN 'confirmed'
    WHEN 'manual_registration' THEN 'confirmed'
    WHEN 'quick_registration'  THEN 'confirmed'
    WHEN 'attended'            THEN 'confirmed_verified'
    WHEN 'purchased'           THEN 'confirmed_verified'
    WHEN 'no_show'             THEN 'confirmed'
    WHEN 'invited'             THEN 'invited'
    WHEN 'waiting_list'        THEN 'waitlist'
    WHEN 'event_closed'        THEN 'waiting'
    WHEN 'duplicate'           THEN 'waiting'
    ELSE 'waiting'
  END;

  IF v_lead.status = v_target_status THEN
    RETURN jsonb_build_object('ok', true, 'updated', false, 'old_status', v_lead.status, 'new_status', v_target_status);
  END IF;

  UPDATE crm_leads
     SET status = v_target_status, updated_at = now()
   WHERE id = p_lead_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('ok', true, 'updated', true, 'old_status', v_lead.status, 'new_status', v_target_status);
END$function$
```

---

## 4. Options for the Foreman / Architect

The right decision depends on Daniel's intent for the `attended` → `?` mapping. Three coherent options:

### Option A — Drop both `attended` AND `purchased` branches, backfill the 2 demo leads
Replace both CASE lines with no entry (falls through to `ELSE 'waiting'`), or insert an explicit "no change" branch. Backfill demo's 2 `confirmed_verified` leads to whatever the new mapping says (likely `confirmed` if they should remain in the active funnel, or `waiting` for the default fallback). Then the cleanup in §3.1–§3.3 of the Brief works correctly.
**Best fit if:** Daniel wants the dead-status surgery to be complete and is fine with attendee.status='attended' producing the same lead.status as `confirmed` (active-funnel) until the future "purchaser" status arrives.

### Option B — Drop only `purchased`, keep `attended → confirmed_verified`, do NOT deactivate the status
Run §3.2 of the Brief alone (RPC body rewrite removing only `purchased`). Skip §3.1 (don't deactivate crm_statuses) and §3.3 (don't remove from TIER2_STATUSES) because the slug is still actively produced by the `attended` branch. Re-Brief the deactivation as a separate future SPEC after the "purchaser" status arrives.
**Best fit if:** Daniel still wants `attended` to land on `confirmed_verified` (verified-arrival semantics) and the cleanup of the slug from the dropdown has to wait until the replacement status exists.

### Option C — Re-Brief everything together with the "purchaser" status design
The Brief itself acknowledges (§1) that "Daniel's future intent — a dedicated 'purchaser' status — is NOT in scope here. Architect+Daniel will design that separately." But the data shows the `attended` and `purchased` attendee branches are doing the work today, so cleaning up `confirmed_verified` cleanly likely requires deciding the destination of those two branches at the same time. This option folds the cleanup into the next Architect+Daniel design pass.
**Best fit if:** Daniel wants one coherent design instead of two surgeries.

---

## 5. Recommendation

**Option C, then a re-scoped Brief.** The cleanup as written cannot leave the system in a non-broken state because the `attended` branch is the larger producer of `confirmed_verified` (89 prizma + 3 demo attendees today). Removing the slug from the UI without removing its sole producer is a hidden footgun. I recommend the Architect pair this cleanup with the "purchaser" status design Daniel mentioned, so the RPC's `attended`/`purchased` branches both get a coherent new destination in one pass.

If Daniel wants to move now: **Option B** is the smallest safe step — fix the genuinely dead `purchased` mapping ('purchased' has 1 demo attendee but 0 prizma, and Brief §1 says no code path produces it intentionally), keep the active `attended` mapping in place, defer dropdown deactivation. That partial step is still useful and doesn't break anything.

**Option A** would also work but requires Daniel to authorize a 2-row UPDATE on `crm_leads` (the demo backfill), which the Brief §4.3 explicitly forbids. That's a Foreman/Architect-level call, not Executor.

---

## 6. State of the safety tag

```
tag       : pre-m4-remove-confirmed-verified-2026-05-14
sha       : (HEAD of develop at 2026-05-13 ~15:52 UTC)
pushed    : yes
rollback  : `git reset --hard pre-m4-remove-confirmed-verified-2026-05-14` (after Daniel auth)
```

Nothing has changed since the tag — DB and repo are at the same state. The tag may be left in place for the eventual re-Briefed SPEC, or `git tag -d pre-m4-remove-confirmed-verified-2026-05-14 && git push --delete origin pre-m4-remove-confirmed-verified-2026-05-14` if the Architect closes the Brief without follow-up.

---

*End of escalation. Awaiting Foreman / Architect direction. No further action will be taken by this executor session.*
