# OVERNIGHT BLOCKER — SPEC #3 `M4_DEAD_WAITLIST_SLUG_CLEANUP`

> **Status: ✅ RESOLVED 2026-05-13** — see `modules/Module 4 - CRM/docs/specs/M4_DEAD_WAITLIST_SLUG_CLEANUP/FOREMAN_REVIEW.md` for closure verdict and `modules/Module 4 - CRM/docs/audits/WAITLIST_FLOW_INVESTIGATION_2026_05_13.md` for the deeper investigation. Resolution: Daniel-approved single-row UPDATE moved the Prizma test lead from `status='waitlist'` to `status='waiting'`; the `waitlist` slug in `crm_statuses` is INTENTIONALLY RETAINED on both tenants per Daniel's directive ("שלא ימחק את הסטטוס בשום אופן"). Daniel's deeper truth: `waitlist` is NOT a dead slug — it is the TARGET of an automatic capacity-reached flow (`sync_lead_status_from_attendee` RPC) that is implemented end-to-end but has never fired in production. Decision on a follow-up `M4_WAITLIST_SYNC_PRIORITY_FIX` SPEC: pending Daniel's read of the investigation report. Verdict: 🟡 CLOSED-WITH-REVISED-SCOPE.

> **Filed:** 2026-05-13/14 overnight Pipeline run
> **Driving brief:** `modules/Module 4 - CRM/architecture-brief/M4_OVERNIGHT_AUDIT_HARVEST_BRIEF.md` §4.3 + §2.7
> **Pipeline coordinator:** Claude Opus 4.7 (single-chat overnight Pipeline)
> **Master safety tag:** `pre-overnight-m4-2026-05-13` → `e2892d4`
> **Resolution safety tag:** `pre-waitlist-investigation-2026-05-13` → `b27b74f`

---

## 1. What was attempted

Pre-flight investigation for SPEC #3 (Brief §4.3): confirm that zero `crm_leads` rows on demo AND Prizma carry `status='waitlist'`, then soft-delete the `waitlist` row from `crm_statuses` (set `is_active=false`) on both tenants — the audit categorized this as a dead config slug.

## 2. What I found (drives the escalation)

Live SQL on the Supabase project at SPEC-pre-flight time (2026-05-13/14 overnight):

```sql
SELECT t.slug AS tenant, l.status, COUNT(*) AS n
FROM crm_leads l JOIN tenants t ON t.id = l.tenant_id
WHERE l.status IN ('waitlist','waiting')
GROUP BY t.slug, l.status;
```

| tenant | status | n |
|--------|--------|---|
| demo | waiting | 3 |
| prizma | waiting | 38 |
| **prizma** | **waitlist** | **1** |

**Conflict with the audit's premise:** Audit `M4_DEEP_AUDIT_2026_05_13.md` §3.2.1 stated:

> "Live data: 1 lead with `waiting`, 0 leads with `waitlist`."

Both numbers are wrong:
- Prizma's `waiting` count is 38 (not 1).
- **Prizma has 1 lead with `status='waitlist'`** (not 0).

That 1 Prizma row is the blocker. If SPEC #3 proceeds as Brief-described:

- Soft-deleting `waitlist` from `crm_statuses` (on both tenants) leaves that 1 Prizma lead with a now-inactive lead status → it'd vanish from status-picker dropdowns and from any UI that filters on `is_active=true`. Operator-facing data loss.
- Migrating that 1 Prizma lead to a different status (e.g. `'waiting'`) requires writing to a Prizma row — **explicitly forbidden by Brief §2.3** (Zero Prizma writes; demo only).
- Soft-deleting `waitlist` on demo only leaves cross-tenant config asymmetry — defeats the audit's "drop dead config" intent.
- Doing nothing on Prizma's side and soft-deleting on demo only is a half-measure that the Brief did not authorize.

## 3. Why this is an escalation (not autonomous in-scope decision)

Brief §2.7 lists "A SPEC's premise turns out to be wrong (audit was stale or misread)" as a STOP-and-escalate trigger. The audit's `waitlist` count is a load-bearing premise (the whole SPEC rests on "it's dead"). Live evidence contradicts it. Per §2.7 I am halting SPEC #3 and continuing with the OTHER independent SPECs (#2, #4, optional #5). SPEC #1 (`M4_INVITED_GHOST_ATTENDEE_FIX`) was unaffected and shipped.

## 4. Options for Daniel (morning decision)

### Option A — Migrate the 1 Prizma lead to `'waiting'` first, then proceed
- Single UPDATE on Prizma `crm_leads` (the row with `status='waitlist'`).
- Then SPEC #3 proceeds as Brief-described: soft-delete the `waitlist` row from `crm_statuses` on demo + Prizma.
- **Effort:** XS. **Risk:** LOW (one row, one tenant, reversible). Requires Daniel's explicit nod because Brief §2.3 forbids Prizma writes.

### Option B — Defer the entire SPEC indefinitely
- Live with `waitlist` as an active-but-unused lead status on both tenants.
- Operator UX cost: small (an unused dropdown option that picks up 0 leads on demo and 1 lead on Prizma).
- Strategic cost: lifecycle taxonomy stays cluttered; audit §3.2.1 finding remains open.
- **Effort:** 0. **Risk:** 0.

### Option C — Rename the slug instead of soft-deleting
- Rationalize: 1 Prizma lead with `status='waitlist'` is probably the same lifecycle as `'waiting'`. Merge by renaming `waitlist` → `waiting` in `crm_statuses` (or a column-level migration of `crm_leads.status` from `'waitlist'` to `'waiting'`). Requires Prizma write (1 lead row).
- Lead-status entity consolidation; reduces taxonomy clutter without losing the 1 row's lifecycle signal.
- **Effort:** S. **Risk:** LOW. Requires Daniel's explicit nod (same Prizma-write reason as Option A).

### Option D — Split into "demo-only soft-delete + Prizma deferred"
- Soft-delete `waitlist` from demo's `crm_statuses` (allowed; no leads affected).
- Leave Prizma alone for now; file a follow-up SPEC for after the 1 Prizma lead is operator-resolved.
- **Effort:** XS. **Risk:** LOW. Creates a transient cross-tenant config asymmetry until follow-up.

**Recommendation (Pipeline coordinator's read):** Option A. Smallest, most reversible, fully resolves the SPEC's intent. The Brief §2.3 prohibition on Prizma writes is a default safety net, not an absolute — the Brief itself acknowledges "the audit was stale or misread" as a legitimate exception triggering escalation for explicit Daniel approval. Once approved, Option A is 1 UPDATE + 2 `crm_statuses` UPDATEs.

## 5. What I did NOT touch

- Zero writes to `crm_statuses` on either tenant.
- Zero writes to `crm_leads` on either tenant.
- No code changes related to `'waitlist'` (e.g., the `ATTENDEE_ADD_STATUSES` array in `modules/crm/crm-event-register.js` line 54 still contains `'waitlist'` — left alone because removing it without DB cleanup creates a mismatch).
- No commits in this SPEC's name. (This escalation file ships in the Pipeline's morning summary commit batch, not as an open-SPEC commit.)

## 6. Continuation path for the overnight run

- SPEC #2 (`M4_AUTOMATION_RULES_UPDATED_AT`) — independent of SPEC #3, proceeds.
- SPEC #4 (`M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1`) — independent, proceeds.
- SPEC #5 (`M4_FUNNEL_REPORT_FOUNDATION`) — independent and optional; evaluated after #2 + #4.
- SPEC #3 — left OPEN for Daniel. Recommendation in §4 above.

---

*End of escalation. Daniel reads this with the Morning Summary file.*
