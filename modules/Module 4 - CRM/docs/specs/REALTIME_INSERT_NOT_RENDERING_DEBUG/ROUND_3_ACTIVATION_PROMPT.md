You are working in `C:\Users\User\opticup`. The user is Daniel.

This is **Round 3** of the existing SPEC `REALTIME_INSERT_NOT_RENDERING_DEBUG`. Round 1 (Option A — drop UUID filter) shipped + reverted (regression). Round 2 (Option D — Realtime as trigger) failed pre-flight: `subscribe SUBSCRIBED` but no `[Realtime DEBUG] INSERT received` after a real form submission. Root cause confirmed: the `lead-intake` EF inserts via `service_role`, which bypasses Supabase Realtime's `postgres_changes` broadcast.

Per Supervisor Round-3 verdict (`SUPERVISOR_DECISION_ROUND_3.md` in this folder, if present): **Option B — Postgres trigger with `realtime.broadcast_changes`.** Hybrid pattern: INSERT path moves to broadcast_changes; UPDATE path stays on existing `postgres_changes` (works today, don't touch).

## ⛔ HARD GATE — MUST CHECK BEFORE WRITING ANY SPEC

**Daniel's Round-3 directive (verbatim, non-negotiable):**

> "המיגרציה (השינוי במסד הנתונים) חייבת להיכנס לבקרת גרסאות מהרגע הראשון. אסור להוסיף ל-31 המיגרציות הקיימות שלא נמצאות במערכת (חוב טכני M4-DEBT-01). אם בודקים ומגלים שאין תיקייה מסודרת לזה — עוצרים ופונים אלי לפני שכותבים בכלל את ה-SPEC."

**Step ZERO of Stage 1 (Foreman) — VERIFY MIGRATIONS FOLDER STATE:**

Before authoring SPEC.md, the Foreman MUST:

1. Run `ls supabase/migrations/` (or wherever the project's migrations live).
2. Verify a proper structure exists (timestamped .sql files, tracked in git, follows project convention).
3. Run `git log --oneline supabase/migrations/ | head -10` to confirm migrations have been committed historically.
4. Cross-check against M4-DEBT-01 status:
   - Read `__LAUNCH_PLAN_DRAFT__/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` references to M4-DEBT-01.
   - Read auto-memory `project_migrations_git_drift.md` if accessible.
5. **If proper folder + tracking exists** → proceed to SPEC authoring.
6. **If proper folder is missing OR migrations aren't actually tracked in git** → HALT. Do NOT write the SPEC. Surface to Daniel: "The migrations folder isn't set up properly. M4-DEBT-01 is still open. Need direction before authoring this SPEC."

This is non-negotiable. Adding another untracked migration to the existing 31 is a hard violation.

## Clean-repo discipline (non-negotiable)

- **At session start:** First Action Protocol per CLAUDE.md §1. Working tree must be clean. Stash any pre-existing WIP if present (`git stash push -u -m "pre-REALTIME_ROUND3 wip"`).
- **At session end:** `git status` must show "working tree clean". Pop the stash AFTER push.

## What the SPEC must include (4 critical points from Daniel)

Per Daniel's Round-3 directive — these 4 points are SPEC-mandatory:

### Point 1 — Migration version control from day one (see Hard Gate above)

Already covered above. Migration .sql lives in the project's proper migrations folder, committed in the same commit as the code change. Does NOT pile onto M4-DEBT-01.

### Point 2 — Hybrid pattern (INSERT-only → broadcast_changes; UPDATE stays on postgres_changes)

Only the INSERT path moves to the new mechanism. UPDATEs continue working with existing `postgres_changes` (verified working today, don't break it). The hybrid MUST be documented in a code comment so future maintainers don't "clean it up" by mistake. Suggested comment placement: above `startRealtime()` in `crm-incoming-tab.js`, with the rationale: "INSERT events from `service_role` (the `lead-intake` EF) don't broadcast via postgres_changes, so we use a per-tenant `realtime.broadcast_changes` channel for INSERTs. UPDATEs stay on postgres_changes — they work because CRM admin uses anon-key with JWT context."

### Point 3 — Channel name embeds tenant_id

Channel name format: `crm_leads_<tenant_uuid>` (e.g., `crm_leads_6ad0781b-37f0-47a9-92e3-be9ed1477e1c`). Security via channel topology — not just filtering. Different tenants = different channels = no cross-tenant traffic possible at the broadcast layer.

### Point 4 — Defense-in-depth tenant_id check in handler

Even with channel-level isolation, the handler MUST still check `if (row.tenant_id !== getTenantId()) return;` before processing. Iron Rule 22 — belt AND suspenders. Document this comment as well.

## Implementation outline (Foreman fills in details)

### Migration (new .sql file in migrations folder)

```sql
-- AFTER INSERT trigger on crm_leads → broadcast to per-tenant channel
CREATE OR REPLACE FUNCTION crm_leads_broadcast_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'crm_leads_' || NEW.tenant_id::text,  -- per-tenant channel
    'INSERT',                              -- event name
    'INSERT',                              -- operation
    'crm_leads',                           -- table
    'public',                              -- schema
    NEW,                                   -- new row
    NULL                                   -- old row (none for INSERT)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_leads_broadcast_insert_trigger
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION crm_leads_broadcast_insert();
```

(Foreman: confirm `realtime.broadcast_changes` signature against current Supabase docs; the args may differ slightly. Test on a non-production tenant first.)

### Client-side change (`modules/crm/crm-incoming-tab.js`)

```js
// HYBRID PATTERN — DO NOT "CLEAN UP":
// INSERTs from service_role (lead-intake EF) bypass postgres_changes broadcast,
// so we listen on a per-tenant Broadcast channel for INSERTs.
// UPDATEs work fine on postgres_changes — they stay there.
function startRealtime() {
  if (_rtChannel) return;
  var tid = getTenantId();
  if (!tid) return;

  _rtChannel = sb.channel('crm_leads_' + tid)
    // INSERTs via Broadcast (Option B — driven by Postgres trigger)
    .on('broadcast', { event: 'INSERT' }, function (payload) {
      var row = payload && payload.payload && payload.payload.record;
      if (!row || row.tenant_id !== tid) return; // defense-in-depth (Rule 22)
      reloadIncomingFromRealtime(row.id, 'bg-indigo-100');
    })
    // UPDATEs stay on postgres_changes (work today)
    .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'crm_leads', filter: 'tenant_id=eq.' + tid },
        function (payload) {
          var newRow = payload && payload.new;
          if (!newRow || newRow.tenant_id !== tid) return;
          reloadIncomingFromRealtime(newRow.id, 'bg-amber-100');
        })
    .subscribe(function (status, err) {
      console.log('[Realtime] subscribe status:', status, err); // ONE diagnostic line, kept production-grade
    });
}

async function reloadIncomingFromRealtime(highlightLeadId, flashClass) {
  try {
    _allLeads = await loadIncomingLeads(true);
    if (window.CrmLeadFilters) _lastNotesMap = await CrmLeadFilters.loadLastNotesMap();
    applyIncomingFilters();
    if (highlightLeadId && flashClass) flashIncomingRow(highlightLeadId, flashClass);
  } catch (e) {
    console.warn('[Realtime] reload failed:', e && e.message);
  }
}
```

### Phase-1 diagnostic logs cleanup

Remove all 10 `[Realtime DEBUG]` lines from `13ae24d`. Keep ONE production-grade `console.log('[Realtime] subscribe status:', status, err)` in `.subscribe()` callback for ops visibility.

## Iron Rules

- **Rule 7** (API abstraction).
- **Rule 11** (sequential numbers via RPC — N/A here, but the trigger pattern is consistent with the project's preference for atomic Postgres-side primitives).
- **Rule 12** (file-size — net-neutral after diagnostic cleanup).
- **Rule 14/15** (RLS still enforced via channel namespace + handler check).
- **Rule 21** (no orphan — reuses `loadIncomingLeads`).
- **Rule 22** (defense-in-depth — channel + handler check).
- **Rule 31** (integrity gate before commit).
- **Rule 9 #7** (no merge to main; Daniel-only).

## Acceptance criteria (after Foreman + Executor + migration land)

1. **PRIMARY:** Real form submission via `prizma-optic.co.il/supersale/` → new lead appears in Incoming tab in <2s with indigo pulse, no F5.
2. **UPDATE regression:** Status change on existing lead → list re-renders, amber pulse.
3. **Cross-tenant safety:** Insert into demo tenant via SQL → does NOT appear on prizma admin screen (different channel name = different broadcast topology).
4. **No diagnostic spam:** Console shows ZERO `[Realtime DEBUG]` lines (only production `[Realtime] subscribe status:`).
5. **Soak (5 min):** Multiple INSERTs, all reflected within 2s.
6. **Migration tracked in git:** `git log --oneline supabase/migrations/ | head -3` shows the new migration as a recent commit.
7. **DB verification:** `SELECT tgname FROM pg_trigger WHERE tgrelid='crm_leads'::regclass;` shows the new trigger.

## Out of scope

- Other tabs Realtime expansion.
- Migrating UPDATEs to broadcast_changes (works today, don't touch).
- Resolving M4-DEBT-01 here (separate post-cutover SPEC).

## Stop triggers

- **Step ZERO HARD GATE:** Migrations folder doesn't exist or isn't tracked in git → HALT, do NOT proceed, escalate to Daniel.
- Trigger creation fails on Supabase → halt + escalate.
- Migration applied but trigger doesn't fire on test INSERT → halt, debug, do not ship code.
- Cross-tenant rows appear on prizma admin → halt; channel namespace is broken.
- Any change required outside the migration .sql + `crm-incoming-tab.js` → halt + escalate.

## Stage 1 — opticup-strategic authors the SPEC

1. Switch to `opticup-strategic` skill.
2. **STEP ZERO HARD GATE** — verify migrations folder per directive above. If fails → HALT.
3. If pass → author SPEC.md (or SPEC_ROUND_3.md) with all 4 critical points integrated.
4. Author the migration .sql file in the proper migrations folder.
5. Hand off to executor.

## Stage 2 — opticup-executor

1. Switch to `opticup-executor` skill.
2. First Action Protocol — clean repo + integrity gate.
3. Apply migration via Supabase MCP `apply_migration` AND ensure the .sql is git-tracked in the same commit.
4. Implement client-side changes in `crm-incoming-tab.js`.
5. Test on localhost: real form submission → INSERT received → lead appears.
6. Single commit: `feat(crm): realtime INSERT via broadcast_changes trigger (Option B)`. Push to develop. Migration .sql IS PART OF THE SAME COMMIT.
7. Append closure to EXECUTION_REPORT.md (Round 3 section).
8. End-of-session: clean repo, no untracked drift.

## Convention seed (per Supervisor Round 3)

After this SPEC closes, the following lesson lands in `docs/CONVENTIONS.md`:

> **Realtime feature where the writer is a server-side role (not a logged-in user):** MUST use `realtime.broadcast_changes` from day one — NOT `postgres_changes`. Service-role inserts bypass `postgres_changes` broadcast. Saves 3 quarters of debug for future maintainers.

This convention update happens during FOREMAN_REVIEW after merge.

## References

- Phase 1 SPEC + diagnostic logs: this folder
- Round 1 (Option A, REVERTED): `SUPERVISOR_DECISION.md`
- Round 2 (Option D, pre-flight failed): `SUPERVISOR_DECISION_ROUND_2.md` (if present)
- Round 3 (Option B, current): `SUPERVISOR_DECISION_ROUND_3.md` (Supervisor noted possible mount issue — verify file exists; if absent, reconstruct from `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md` REC-015 entry)
- Overseer recommendation: REC-015 in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/DECISIONS_LOG.md`
- Iron Rules: `CLAUDE.md` §4–§6
