# SPEC — BROADCAST_1000_CAP_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-03
> **Module:** 4 — CRM
> **Phase (if applicable):** Cutover-parallel hot-fix (HIGH priority — customer-impacting)
> **Author signature:** Claude Code Windows desktop session, 2026-05-03 (post-CRM_PHONE_SEARCH_NORMALIZATION)
> **Source documents:**
> - Supervisor binding decision: `SUPERVISOR_DECISION.md` (this folder)
> - Supervisor brief / 3-options analysis: `SUPERVISOR_BRIEF.md` (this folder)
> - Overseer recommendation: `roles/campaign-overseer/DECISIONS_LOG.md` REC-010

---

## 1. Goal

Eliminate the silent PostgREST 1000-row truncation that drops customers from CRM "send to all" flows. Refactor `fetchAll` in `js/supabase-ops.js` to extract a builder-agnostic `paginateQuery(queryBuilder, pageSize=1000)` helper, then apply that helper to 9 unpaginated query sites across the 3 affected CRM files (recipient resolvers, broadcast filter, broadcast send). `fetchAll` becomes a thin wrapper over `paginateQuery` with bit-identical return values for every existing caller.

---

## 2. Background & Motivation

PostgREST default page cap of 1000 rows silently truncates every `.select()` that doesn't paginate. With Prizma now at 1166 active leads (per Overseer 2026-05-03), every "send to all leads" flow drops 165 customers. Two surfaces: the manual broadcast in CRM admin (active customer-impact today) and the 7 recipient-resolver types in `modules/crm/crm-automation-recipient-resolvers.js` that drive automated event invites + coupon dispatches + cross-event waitlist invites (future-leak today, customer-impact on the next event-open after cutover).

The Supervisor's binding decision is **Option A refined** (not Option A as originally framed, not Option B with RPCs, not Option C raising the global cap): refactor the existing `fetchAll` to extract its pagination loop into a builder-agnostic helper, then apply that helper to the 9 unpaginated sites. This is the single-engine-two-entry-points shape — `fetchAll(table, filters)` for high-level table reads with `enrichRow`, `paginateQuery(builder)` for CRM resolvers with custom select shapes that don't fit `fetchAll`'s signature (PostgREST joins like `crm_leads(...)`, post-fetch JS filtering, no `enrichRow`).

This SPEC is HIGH priority but cutover-parallel. The fix can ship before or after the cutover-day flip; it MUST land before the next event-open after cutover (operational deadline). It does NOT depend on M4-DEBT-01 (the un-audited migration backlog) and does NOT add migrations.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC start | On `develop`, pulled | `git branch --show-current` → `develop` |
| 2 | `paginateQuery` exists in `js/supabase-ops.js` | function declared at top level | `grep -n "^async function paginateQuery" js/supabase-ops.js` → 1 hit |
| 3 | `fetchAll` refactored to call `paginateQuery` internally | `paginateQuery(` appears inside `fetchAll` body | `grep -nA1 "^async function fetchAll" js/supabase-ops.js` shows the function still declared at top level; `grep -c "paginateQuery(" js/supabase-ops.js` → exactly 2 (1 declaration line, 1 call inside `fetchAll`) |
| 4 | Files modified — exact list | 4 files | `git diff --name-only origin/develop...HEAD` → `js/supabase-ops.js`, `modules/crm/crm-automation-recipient-resolvers.js`, `modules/crm/crm-broadcast-filters.js`, `modules/crm/crm-messaging-broadcast.js` (4 lines) |
| 5 | `crm-automation-recipient-resolvers.js` paginate sites | 6 calls | `grep -c "paginateQuery(" modules/crm/crm-automation-recipient-resolvers.js` → 6 |
| 6 | `crm-broadcast-filters.js` paginate sites | 2 calls | `grep -c "paginateQuery(" modules/crm/crm-broadcast-filters.js` → 2 |
| 7 | `crm-messaging-broadcast.js` paginate sites | 1 call | `grep -c "paginateQuery(" modules/crm/crm-messaging-broadcast.js` → 1 |
| 8 | Total `paginateQuery` references repo-wide | 11 | `grep -rn "paginateQuery(" js/ modules/crm/ \| wc -l` → 11 (2 from supabase-ops.js + 6 + 2 + 1 = 11) |
| 9 | Iron Rule 12 (file-size, hard cap 350) | every modified file ≤ 350 lines | `wc -l js/supabase-ops.js modules/crm/crm-automation-recipient-resolvers.js modules/crm/crm-broadcast-filters.js modules/crm/crm-messaging-broadcast.js` → all 4 ≤ 350 |
| 10 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 11 | Single commit produced | exactly 1 commit ahead of origin (before push) | `git rev-list --count origin/develop..HEAD` → 1 |
| 12 | Pushed to origin | `develop` HEAD matches local | `git fetch && git rev-parse HEAD` == `git rev-parse origin/develop` |
| 13 | Working tree clean (in-scope paths) | no uncommitted changes in scope | `git status --short js/ modules/crm/ "modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/"` → empty |
| 14 | Smoke test — fetchAll regression (executor-runnable) | inventory + frames + suppliers fetchAll calls return arrays equal length to pre-fix values | Recorded in EXECUTION_REPORT §4 — see §8 below for protocol. Executor opens the inventory page in a headless test if available; otherwise documents pre/post counts via direct SQL `count(*)` from Supabase against the same tenant/filters. |
| 15 | Smoke test — >1000-row recipient resolution (Daniel-runnable) | `CrmBroadcastFilters.buildLeadIds(state)` resolves to ALL active prizma leads (≈1166), not 1000 | Daniel verifies in browser console (see §8 manual-QA section) — does NOT click "send" |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo.
- Apply the surgical edits in §8 verbatim.
- Stage only the 4 source files in scope + the 5 SPEC retrospective/handoff files (`SUPERVISOR_BRIEF.md`, `SUPERVISOR_DECISION.md`, `ACTIVATION_PROMPT.md`, this `SPEC.md`, `EXECUTION_PROMPT.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`).
- Commit and push to `develop` per §9 (Commit Plan).
- Run `npm run verify:integrity`.
- Run `git diff --stat` and `wc -l` for criterion verification.
- Add a `paginateQuery`-internal regression test stub in `EXECUTION_REPORT.md` (text-only, no new test infra in this commit).

### What REQUIRES stopping and reporting
- Manual-broadcast file structure differs from §8's expectation (e.g., `buildLeadRows` not at line 192, or no `await q` at line 228) — **drift > ±5 lines means the file changed since Foreman survey**.
- Same drift check on the resolver file (lines 53/59/75/94/109/118).
- `paginateQuery` regression test on existing fetchAll callers shows ANY behavior delta (different row count, different row order, different field shape).
- File-size criterion #9 fails for any file.
- Integrity gate exit 1 (null-byte ERROR).
- A 5th file in `git diff --name-only` that wasn't named in §8 — STOP, scope creep.
- Any merge-to-main attempt, by any caller — NEVER do this.
- Any RPC / migration / EF change request inside this SPEC — STOP, scope creep (Out of Scope §7).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Manual-broadcast file no longer has the structure assumed in §8.** The Foreman has surveyed `crm-broadcast-filters.js:196` and `crm-messaging-broadcast.js:296` for this SPEC; if executor's pre-edit grep finds them at substantially different lines (>±5), the survey is stale → STOP.
- **A `paginateQuery` regression test produces a different row count for an existing fetchAll caller.** That means the refactor changed semantics → STOP, do NOT commit.
- **Smoke test on >1000-row dataset still returns a 1000-row cap** in the broadcast wizard → STOP, the fix is wrong, escalate to Supervisor.
- **A new untracked file appears in `git status` from `npm run verify:integrity` or from any other tool** that was not produced by an explicit edit in this SPEC → STOP, investigate.

---

## 6. Rollback Plan

Single commit, JS-only refactor, no DB / migration / EF / config changes:
- `git revert <commit_hash>` then `git push origin develop` reverts the SPEC entirely.
- No schema state to restore.
- No EF redeploy needed.
- The only side effect of the revert: the 1000-row cap returns. Pre-existing bug, accepted state.

---

## 7. Out of Scope (explicit)

- Moving any resolver to an RPC (revisit post-launch if scale demands; SUPERVISOR_DECISION.md §Q2).
- Touching `M4-DEBT-01` (the un-audited 31 MCP-applied migrations) — separate post-cutover SPEC.
- Adding any new DB migration, RLS policy, RPC, view, or column.
- Touching `enrichRow` or any inventory lookup logic.
- Renaming or repositioning `fetchAll`. Only its **internals** change.
- Any UI changes (broadcast wizard layout, recipient-preview rendering, etc.).
- Any other CRM file outside the 3 named in §8.
- The Edge Function `lead-intake`, `send-message`, etc.
- Adding `paginateQuery` to `js/shared.js` instead of `js/supabase-ops.js` — supervisor decision is supabase-ops.js (alongside `fetchAll`).
- Adding Rule 7 full-compliance refactor (resolvers still call `sb.from()` directly inside the paginate wrapper; that's the documented "specialized join" exception).
- Test infrastructure (no new files under `tests/`, no Vitest/Jest setup). Smoke tests are documented procedures, not automated tests.

---

## 8. Expected Final State

### New files (in SPEC folder, written by executor at end)
- `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/FINDINGS.md` (1+ findings expected)

### Modified files (4)

#### A. `js/supabase-ops.js` (currently 214 lines; expected ≤ 230)

**Edit A1 — Insert `paginateQuery` immediately above `fetchAll`** (between current line 32 `}` of `enrichRow` and current line 33 comment `// --- Supabase-backed fetchAll ---`):

Insert this block (canonical implementation per Supervisor decision):

```javascript
// --- Pagination engine (Iron Rule 21: single source of pagination) ---
// Wraps a Supabase PostgREST query builder with .range() pagination so any
// "select all" query can transparently exceed the PostgREST 1000-row cap.
// Caller passes a fully-configured builder (table + select + filters); we
// only set .range() per page and accumulate. Errors throw with the original
// PostgREST message. Stops when a page returns fewer than pageSize rows.
async function paginateQuery(queryBuilder, pageSize) {
  pageSize = pageSize || 1000;
  let all = [], from = 0;
  while (true) {
    const { data, error } = await queryBuilder.range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
```

**Edit A2 — Replace the body of `fetchAll`** (currently lines 33–62; the new fetchAll uses `paginateQuery` internally):

Before (current implementation is the entire `fetchAll` body — the `while (true)` cursor loop):

```javascript
// --- Supabase-backed fetchAll ---
async function fetchAll(tableName, filters) {
  const PAGE = 1000;
  let all = [], from = 0;
  while (true) {
    const tid = getTenantId();
    let query = sb.from(tableName).select(tableName === 'inventory' ? '*, inventory_images(*)' : '*');
    if (tid) query = query.eq('tenant_id', tid);
    if (filters) {
      for (const [col, op, val] of filters) {
        if (op === 'eq') query = query.eq(col, val);
        else if (op === 'in') query = query.in(col, val);
        else if (op === 'ilike') query = query.ilike(col, val);
        else if (op === 'neq') query = query.neq(col, val);
        else if (op === 'gt') query = query.gt(col, val);
        else if (op === 'gte') query = query.gte(col, val);
        else if (op === 'lt') query = query.lt(col, val);
        else if (op === 'lte') query = query.lte(col, val);
      }
    }
    query = query.range(from, from + PAGE - 1);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all.map(enrichRow);
}
```

After (thin wrapper — builds the query once, delegates pagination to `paginateQuery`, maps `enrichRow`):

```javascript
// --- Supabase-backed fetchAll ---
async function fetchAll(tableName, filters) {
  const tid = getTenantId();
  let query = sb.from(tableName).select(tableName === 'inventory' ? '*, inventory_images(*)' : '*');
  if (tid) query = query.eq('tenant_id', tid);
  if (filters) {
    for (const [col, op, val] of filters) {
      if (op === 'eq') query = query.eq(col, val);
      else if (op === 'in') query = query.in(col, val);
      else if (op === 'ilike') query = query.ilike(col, val);
      else if (op === 'neq') query = query.neq(col, val);
      else if (op === 'gt') query = query.gt(col, val);
      else if (op === 'gte') query = query.gte(col, val);
      else if (op === 'lt') query = query.lt(col, val);
      else if (op === 'lte') query = query.lte(col, val);
    }
  }
  const all = await paginateQuery(query);
  return all.map(enrichRow);
}
```

**Behavior delta vs. current `fetchAll`:** `getTenantId()` is now resolved ONCE before pagination starts (was per-iteration). In practice tenant_id is stable for the life of a logged-in session (changes only via re-auth which triggers a page reload), so this is a no-op for every existing call site. Documented as a deliberate refactor in EXECUTION_REPORT.

#### B. `modules/crm/crm-automation-recipient-resolvers.js` (currently 145 lines; expected ≤ 165)

**6 paginate-call sites.** For each site, the pattern is: replace the existing `var X = await sb.from(...)...query...;` + `if (X.error) throw new Error('...: ' + X.error.message);` + `var Y = X.data || [];` 3-line idiom with a single `try`-wrapped call to `paginateQuery`.

**Edit B1 — Line 53 area (tier2 cluster outer query):**

Before (lines 53–57):
```javascript
      var lRes = await sb.from('crm_leads').select('id, full_name, phone, email')
        .eq('tenant_id', tenantId).eq('is_deleted', false).is('unsubscribed_at', null)
        .in('status', statusList);
      if (lRes.error) throw new Error('recipients tier2: ' + lRes.error.message);
      var leads = lRes.data || [];
```

After:
```javascript
      var leads;
      try {
        leads = await paginateQuery(
          sb.from('crm_leads').select('id, full_name, phone, email')
            .eq('tenant_id', tenantId).eq('is_deleted', false).is('unsubscribed_at', null)
            .in('status', statusList)
        );
      } catch (e) { throw new Error('recipients tier2: ' + e.message); }
```

**Edit B2 — Line 59 area (tier2_excl_registered inner exclude query):**

Before (lines 59–63):
```javascript
        var xRes = await sb.from('crm_event_attendees').select('lead_id')
          .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false);
        if (xRes.error) throw new Error('recipients exclude: ' + xRes.error.message);
        var excluded = {};
        (xRes.data || []).forEach(function (r) { if (r.lead_id) excluded[r.lead_id] = true; });
```

After:
```javascript
        var excludeRows;
        try {
          excludeRows = await paginateQuery(
            sb.from('crm_event_attendees').select('lead_id')
              .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false)
          );
        } catch (e) { throw new Error('recipients exclude: ' + e.message); }
        var excluded = {};
        excludeRows.forEach(function (r) { if (r.lead_id) excluded[r.lead_id] = true; });
```

**Edit B3 — Line 75 area (attendees cluster query):**

Before (lines 75–80):
```javascript
      var q = sb.from('crm_event_attendees')
        .select('crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
        .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false);
      if (attStatus) q = q.in('status', attStatus);
      var aRes = await q;
      if (aRes.error) throw new Error('recipients attendees: ' + aRes.error.message);
      return (aRes.data || [])
        .map(function (r) { return r.crm_leads; })
        .filter(function (l) { return l && !l.unsubscribed_at && !l.is_deleted; });
```

After:
```javascript
      var q = sb.from('crm_event_attendees')
        .select('crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
        .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false);
      if (attStatus) q = q.in('status', attStatus);
      var aRows;
      try { aRows = await paginateQuery(q); }
      catch (e) { throw new Error('recipients attendees: ' + e.message); }
      return aRows
        .map(function (r) { return r.crm_leads; })
        .filter(function (l) { return l && !l.unsubscribed_at && !l.is_deleted; });
```

**Edit B4 — Line 94 area (attendees_with_active_coupon):**

Before (lines 94–101):
```javascript
      var cRes = await sb.from('crm_event_attendees')
        .select('status, coupon_sent, crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
        .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false)
        .eq('coupon_sent', true).neq('status', 'cancelled');
      if (cRes.error) throw new Error('recipients attendees_with_active_coupon: ' + cRes.error.message);
      return (cRes.data || [])
        .map(function (r) { return r.crm_leads; })
        .filter(function (l) { return l && !l.unsubscribed_at && !l.is_deleted; });
```

After:
```javascript
      var cRows;
      try {
        cRows = await paginateQuery(
          sb.from('crm_event_attendees')
            .select('status, coupon_sent, crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
            .eq('tenant_id', tenantId).eq('event_id', eventId).eq('is_deleted', false)
            .eq('coupon_sent', true).neq('status', 'cancelled')
        );
      } catch (e) { throw new Error('recipients attendees_with_active_coupon: ' + e.message); }
      return cRows
        .map(function (r) { return r.crm_leads; })
        .filter(function (l) { return l && !l.unsubscribed_at && !l.is_deleted; });
```

**Edit B5 — Line 109 area (cross_event_active_waitlist outer):**

Before (lines 109–115):
```javascript
      var attRes = await sb.from('crm_event_attendees')
        .select('event_id, lead_id, status, crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
        .eq('tenant_id', tenantId)
        .in('status', ['waiting_list', 'invited'])
        .eq('is_deleted', false);
      if (attRes.error) throw new Error('recipients cross_event: ' + attRes.error.message);
      var rows = (attRes.data || []).filter(function (r) { return r.event_id !== eventId; });
```

After:
```javascript
      var attRows;
      try {
        attRows = await paginateQuery(
          sb.from('crm_event_attendees')
            .select('event_id, lead_id, status, crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)')
            .eq('tenant_id', tenantId)
            .in('status', ['waiting_list', 'invited'])
            .eq('is_deleted', false)
        );
      } catch (e) { throw new Error('recipients cross_event: ' + e.message); }
      var rows = attRows.filter(function (r) { return r.event_id !== eventId; });
```

**Edit B6 — Line 118 area (cross_event_active_waitlist inner crm_events):**

Before (lines 118–123):
```javascript
      var evRes = await sb.from('crm_events').select('id, status, is_deleted')
        .eq('tenant_id', tenantId).in('id', otherEventIds);
      if (evRes.error) throw new Error('recipients cross_event events: ' + evRes.error.message);
      var activeEvents = {};
      (evRes.data || []).forEach(function (e) {
        if (!e.is_deleted && (e.status === 'registration_open' || e.status === 'waiting_list')) {
```

After:
```javascript
      var evRows;
      try {
        evRows = await paginateQuery(
          sb.from('crm_events').select('id, status, is_deleted')
            .eq('tenant_id', tenantId).in('id', otherEventIds)
        );
      } catch (e) { throw new Error('recipients cross_event events: ' + e.message); }
      var activeEvents = {};
      evRows.forEach(function (e) {
        if (!e.is_deleted && (e.status === 'registration_open' || e.status === 'waiting_list')) {
```

#### C. `modules/crm/crm-broadcast-filters.js` (currently 286 lines; expected ≤ 295)

**Edit C1 — `buildLeadRows` outer query (the `q` builder built up across lines 196–227, awaited at line 228):**

The structure: `q = sb.from('crm_leads').select(...)...` is mutated through several conditional `q = q.X(...)` lines, then `var res = await q;` at line 228. Replace `var res = await q;` + the `if (res.error) throw new Error(res.error.message); return res.data || [];` 3 lines with a `paginateQuery` call.

Before (lines 228–230):
```javascript
    var res = await q;
    if (res.error) throw new Error(res.error.message);
    return res.data || [];
```

After:
```javascript
    return await paginateQuery(q);
```

**Edit C2 — `buildLeadRows` inner attendee→lead_id query (line 209 area):**

Before (lines 204–215):
```javascript
      var att = sb.from('crm_event_attendees')
        .select('lead_id')
        .in('event_id', state.events)
        .eq('is_deleted', false);
      if (tid) att = att.eq('tenant_id', tid);
      var r = await att;
      if (r.error) throw new Error(r.error.message);
      var ids = [];
      var seen = {};
      (r.data || []).forEach(function (x) {
        if (x.lead_id && !seen[x.lead_id]) { seen[x.lead_id] = 1; ids.push(x.lead_id); }
      });
```

After:
```javascript
      var att = sb.from('crm_event_attendees')
        .select('lead_id')
        .in('event_id', state.events)
        .eq('is_deleted', false);
      if (tid) att = att.eq('tenant_id', tid);
      var attRows = await paginateQuery(att);
      var ids = [];
      var seen = {};
      attRows.forEach(function (x) {
        if (x.lead_id && !seen[x.lead_id]) { seen[x.lead_id] = 1; ids.push(x.lead_id); }
      });
```

#### D. `modules/crm/crm-messaging-broadcast.js` (currently 323 lines; expected ≤ 330)

**Edit D1 — `doWizardSend` lead-detail lookup (line 296):**

Before (lines 296–297):
```javascript
      var leadsRes = await sb.from('crm_leads').select('id, full_name, phone, email').eq('tenant_id', tid).in('id', leadIds);
      if (leadsRes.error) throw new Error(leadsRes.error.message); var leadRows = leadsRes.data || [];
```

After:
```javascript
      var leadRows = await paginateQuery(
        sb.from('crm_leads').select('id, full_name, phone, email').eq('tenant_id', tid).in('id', leadIds)
      );
```

### Deleted files
None.

### DB state
Unchanged.

### Docs updated (in same commit)
- This SPEC's folder (`SPEC.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`, `EXECUTION_PROMPT.md`) — written/already-present.
- **`docs/GLOBAL_MAP.md`** — add `paginateQuery` to the function registry section (alongside `fetchAll`). Single-line entry like: `paginateQuery(builder, pageSize=1000) — js/supabase-ops.js — pagination engine; fetchAll wraps it; CRM resolvers call directly.`. The executor checks if there's a "global functions" or "shared helpers" section and appends accordingly. **NOTE:** this is the only master-doc update; if the file's structure makes the entry placement ambiguous, log a finding and skip — Foreman handles in FOREMAN_REVIEW.

### SESSION_CONTEXT
Touched only if Daniel asks for a one-line note after manual-QA passes. Not part of executor's mandatory work.

### Manual QA — Daniel runs after push (5 acceptance cases, all browser-side)

The executor MUST print this exact section to Daniel at hand-off:

1. **Recipient-count smoke (PRIMARY):** Open `/crm/` on **prizma** in browser → "מסר חדש" / Broadcast wizard → set filter "all leads, all statuses" → recipient count in preview shows **≈1166** (NOT 1000). Do NOT click send.
2. **Regression — inventory page:** Open `/inventory.html` (or whatever loads `fetchAll('inventory', ...)`) → page loads, all expected items appear, no console errors. Compare visible row count against pre-fix expectation if known.
3. **Regression — frame list:** Whatever screen lists frames via `fetchAll('frames', ...)` (or equivalent) → loads, expected count, no console errors.
4. **Regression — suppliers / brands list:** Any `fetchAll`-driven supplier or brand selector → populated, no console errors.
5. **(Optional, if Daniel wants belt-and-suspenders) Tier2 event-invite resolution:** Open browser console on `/crm/` → run `await window.CrmAutomationRecipients.resolve('tier2', '<prizma-tenant-uuid>', null, {})` → returned array length **≈1166**, NOT 1000. Do NOT trigger any actual send.

If all 5 pass → trigger PR-merge to main yourself. **Executor does NOT merge.**
If any fails → `git revert <commit_hash> && git push origin develop` reverses the SPEC entirely.

---

## 9. Commit Plan

Exactly **1 commit**. All 4 source files + the 4 doc files (`SUPERVISOR_BRIEF.md`, `SUPERVISOR_DECISION.md`, `ACTIVATION_PROMPT.md`, this `SPEC.md`) plus `EXECUTION_PROMPT.md` (written by Foreman) + `EXECUTION_REPORT.md` + `FINDINGS.md` (written by Executor at end) — same single commit.

Commit message:
```
fix(crm): paginate all recipient queries to remove silent 1000-row cap
```

Files in commit:
- `js/supabase-ops.js`
- `modules/crm/crm-automation-recipient-resolvers.js`
- `modules/crm/crm-broadcast-filters.js`
- `modules/crm/crm-messaging-broadcast.js`
- `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/SUPERVISOR_BRIEF.md` (new tracked)
- `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/SUPERVISOR_DECISION.md` (new tracked)
- `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/ACTIVATION_PROMPT.md` (new tracked)
- `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/SPEC.md` (this file, new tracked)
- `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/EXECUTION_PROMPT.md` (new tracked, written by Foreman before handoff)
- `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/EXECUTION_REPORT.md` (new tracked, executor-end)
- `modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/FINDINGS.md` (new tracked, executor-end)
- (optional) `docs/GLOBAL_MAP.md` if the registry append is unambiguous

Push to `origin/develop`. **Do NOT merge to main.** Daniel handles PR-merge himself per `feedback_main_merge_via_pr.md`.

---

## 10. Dependencies / Preconditions

- On `develop`, repo has the just-shipped `CRM_PHONE_SEARCH_NORMALIZATION` SPEC merged (commit `732aacf`). Pre-existing untracked planning files outside the SPEC scope are explicitly fine — executor uses **selective `git add` by exact filename**, never `git add -A`.
- `getTenantId()`, `sb`, `enrichRow` global helpers stable in `js/supabase-ops.js` and `js/shared.js` (verified by Foreman survey).
- Supabase JS client supports awaiting a PostgREST builder twice with mutated `.range()` between awaits (verified design assumption per Supervisor decision; smoke test confirms in practice).
- No prior in-flight CRM edits — `git status` of `modules/crm/` and `js/supabase-ops.js` is clean before starting.

---

## 11. Lessons Already Incorporated

Cross-Reference Check (Step 1.5) completed 2026-05-03 against authoritative sources:
- `grep -rn "paginateQuery" js/ modules/ shared/` → **0 hits before edit** (no prior pagination helper exists; Iron Rule 21 satisfied — single new engine, not a parallel one).
- `grep -rn "function fetchAll" js/ shared/` → 1 hit (`js/supabase-ops.js:34`), the function this SPEC refactors. Rule 21 collision check: zero parallel implementations.
- `grep -rn "\.range(" js/ modules/crm/` → only the call inside the existing `fetchAll` body. After this SPEC: only inside `paginateQuery`. Single source of pagination.
- Manual-broadcast file located by the Foreman survey (per ACTIVATION_PROMPT.md instruction): `crm-broadcast-filters.js:196` (outer `buildLeadRows`) + `crm-broadcast-filters.js:204` (inner `att`) + `crm-messaging-broadcast.js:296` (`doWizardSend` lead-details). The supervisor's brief listed candidate filenames; the actual locations were verified by direct read before SPEC authoring.

FOREMAN_REVIEW proposals applied from the 3 most-recent M4 reviews:
- **FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` → SA proposal #2 ("don't invent parallel mechanism — extend existing infra, Iron Rule 21")** → APPLIED. The SPEC explicitly says `fetchAll` becomes a thin wrapper; no parallel pagination implementation. §7 Out of Scope forbids placing `paginateQuery` outside `js/supabase-ops.js`.
- **FROM `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/FOREMAN_REVIEW.md` → Proposal B ("don't trust comment-described inventories — grep the code")** → APPLIED. Foreman re-counted paginate sites by reading the actual source, not by trusting the brief's "7 hits + 2 inner = 9 total" arithmetic. The brief's count was decompositionally off (it counted recipient-type slugs, not query-builder call sites). Actual count: **6 in resolvers + 2 in broadcast-filters + 1 in messaging-broadcast = 9 outside-fetchAll wraps + 1 inside-fetchAll wrap + 1 declaration = 11 grep hits repo-wide.** The SPEC §3 criteria reflect the corrected math.
- **FROM `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md` → SA-1 (tenant-scope verification)** → PARTIALLY APPLIED. The bug is global-cap (PostgREST), not tenant-scoped. But the §8 manual-QA explicitly anchors the smoke test against **prizma's 1166 active leads**, so the executor and Daniel measure cap-removal on the tenant where the bug is biting today. Demo tenant has too few leads to trigger the cap and is therefore not a useful test subject.
- **FROM `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md` → SA-2 (Make/EF blueprint snapshots)** → NOT APPLICABLE (no Make / EF / webhook contract changes).
- **FROM `M4_AUTOMATION_ENGINE_SERVER_SIDE/FOREMAN_REVIEW.md` → SA-1 (verify cited finding ID)** → NOT APPLICABLE (no cross-SPEC finding citation).
- **FROM `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/FOREMAN_REVIEW.md` → Proposal A (verify cross-SPEC dependency claims against live state)** → NOT APPLICABLE (this SPEC has no cross-SPEC dependency claims).

**Inherited from prior in-session SPEC `CRM_PHONE_SEARCH_NORMALIZATION/EXECUTION_REPORT.md`** (just-closed 2026-05-03):
- Executor proposal X-1 ("batch all Edit calls when SPEC §8 specifies char-exact before/after"): the executor will batch all 9 Edit calls (1 in supabase-ops.js A1 insert, 1 in supabase-ops.js A2 fetchAll body, 6 in resolvers, 2 in broadcast-filters, 1 in messaging-broadcast) where `old_string` is unique within its file. Pre-condition: every `old_string` must appear exactly once per file (verified by Foreman in §8 — each before-block is multi-line and structurally unique).
- Executor proposal X-2 ("in-scope paths in EXECUTION_REPORT §0"): executor MUST list the 4 source files + 7 SPEC-folder files at the top of EXECUTION_REPORT.md and verify cleanliness against THAT list, ignoring out-of-scope pre-existing untracked files at the global level.

**Iron Rule 7 nuance:** Resolvers call `sb.from(...)` directly inside `paginateQuery(...)` after this fix. That's still direct `sb.from()` usage, not full Rule 7 compliance. Per Rule 7's documented exception ("specialized joins impossible through helpers"), PostgREST joins like `crm_leads(id, full_name, phone, email, unsubscribed_at, is_deleted)` qualify. The SPEC does NOT promise full Rule 7 compliance — only cap-removal. A future refactor could thread these through a typed wrapper, but that's not this SPEC.

**Iron Rule 12 budget:** Net adds per file: supabase-ops.js +~12 lines (paginateQuery body + JSDoc - pagination removed from fetchAll), resolvers +~15 lines (6 paginate wraps each adding 2-3 lines), broadcast-filters +~5 lines (2 wraps), messaging-broadcast +~2 lines (1 wrap). All 4 files comfortably under 350 hard cap (largest: messaging-broadcast 323+2=325).

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md` §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty (clean tree, in-scope paths).
- [ ] HEAD pushed to `origin/develop`.
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` written in the SPEC folder.
- [ ] 5 manual-QA acceptance cases printed to Daniel for his verification on the live app (against **prizma**, not demo).
- [ ] **NO merge to main** — that step belongs to Daniel via PR with branch protection.
- [ ] Smoke test: at least 1 `fetchAll`-driven page loads without console errors post-fix (executor records which page in EXECUTION_REPORT §4).
