# Module Brief — M1_HOTFIX_PERMISSIONS_HOT_RELOAD (Phase 2 #1)

> **🟡 DRAFT — NOT DISPATCHED.** Authored 2026-05-15 in haste before M1 Module Close
> Ceremony. Withheld pending strategic conversation with Daniel about M1 Phase 2 priorities.
> May be rewritten or superseded after Close Ceremony lessons surface.

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Foreman review
**Pipeline:** Full Auto Pipeline (single chat, end-to-end)
**Branch:** `develop`. Daniel-only merge to main via PR after Pipeline closes 🟢.

---

## 1. Purpose

Every SPEC that adds a new permission key has required Daniel to logout + login to refresh his session. Verified live (2026-05-15) — `hasPermission(key)` in `js/auth-service.js:286` reads only from `sessionStorage[SK.PERMS]`, which is populated once at login and never refreshed.

This Brief commissions the fix. After this SPEC closes, adding new permissions in any future SPEC will Just Work — no logout cycle required.

**This is the highest-leverage Phase 2 SPEC** because it eliminates a recurring papercut that has bitten 3 SPECs in a row (M1B_FOUNDATION_PERMISSIONS_HOTFIX, M1_LENS_PHASE_1B_PROCUREMENT, and this one would have been #4).

---

## 2. Scope — In

The SPEC adds a refresh mechanism. The Module Strategist picks the implementation path based on §6 probes.

### Two viable paths (Module Strategist picks ONE):

**Path A — Refresh on every page-load.**

Before `applyUIPermissions()` runs (currently called at page-load by all screens), inject a call to `refreshPermissions()`. The new function:
1. Calls `is_user_authorized_for_all(p_user_id)` or equivalent RPC that returns the user's full permission map.
2. Writes fresh result to `sessionStorage[SK.PERMS]`.
3. `applyUIPermissions()` runs against fresh cache.

Cost: 1 extra RPC call per page load (~30-80ms on production).
Benefit: zero stale-cache windows.

**Path B — Supabase realtime subscription on `role_permissions` / `employee_roles`.**

At login time, subscribe via Supabase Realtime to changes on `role_permissions` (for the user's assigned role IDs) and `employee_roles` (for the user's employee_id). When a change event fires:
1. Re-fetch permissions.
2. Update `sessionStorage[SK.PERMS]`.
3. Show toast: "ההרשאות שלך עודכנו" (optional UX courtesy).

Cost: 1 websocket subscription per active session.
Benefit: real-time reflect — admin changes permissions, user sees effect instantly.

**Architect recommendation:** **Path A.** Lower complexity, no realtime infrastructure, no edge case around dropped websockets, no per-session resource cost. The 30-80ms per page-load is invisible in practice. Path B is over-engineering for the actual problem.

**Module Strategist may override** with evidence — e.g., if probes reveal that an `is_user_authorized_for_all` RPC doesn't exist and adding one costs more than wiring Supabase Realtime.

### Required deliverables (regardless of path):

1. **A new helper** `refreshPermissions()` in `js/auth-service.js` that re-loads permissions from DB.
2. **Page-load hook** that calls it. Either:
   - Modify each `applyUIPermissions()` call site to await refresh first, OR
   - Add a single hook in `init.js` / wherever current session-init runs, that fires before screen logic boots.
   *Architect recommendation: single hook in `auth-service.js` init flow*. Avoids touching N screen JS files.
3. **An RPC** (if not already present) — Path A needs `is_user_authorized_for_all(p_tenant_id, p_user_id)` returning a JSON object `{permission_key: true/false}` for every key the user has. Apply M1A discipline (SECURITY DEFINER + search_path + JWT guard + REVOKE/GRANT).
4. **UI feedback when permissions change** — when `refreshPermissions()` returns a result different from cache, optionally show a toast notifying the user. Module Strategist decides if Day-1 or Phase 2+.

### Functional smoke (mandatory before close)

On demo, via real Chrome MCP (not JWT-direct):

1. Login as demo CEO. Note current permission set in sessionStorage.
2. Via MCP, REVOKE one of the lens permissions from the CEO role (e.g. `lens.po.create`).
3. Reload the lens-purchase-order page in Chrome.
4. Confirm the page now shows "אין הרשאה (lens.po.create)" — i.e. refresh detected the revocation.
5. Via MCP, re-GRANT the permission.
6. Reload the page again.
7. Confirm the page now renders the PO UI — refresh detected the grant.
8. Cross-tenant: confirm refresh respects tenant boundary (no leaks from other tenants' role_permissions changes).
9. No console errors at any step.
10. Performance: page-load time on a representative screen ≤ pre-fix + 150ms.

Capture in TEST_REPORT.md. **No 🟢 verdict without 10/10.**

---

## 3. Scope — Out (anti-creep)

- **No new permission keys** beyond what's strictly required for the refresh mechanism itself (probably zero).
- **No re-architecting** of `permissions` / `role_permissions` / `employee_roles` tables.
- **No changes to the existing screens** beyond removing any `requirePermission()` calls that become redundant.
- **No new UI screens.**
- **No retroactive backfill** — the fix applies to all users on next page-load after this SPEC merges.
- **No real-time WebSocket plumbing** unless Module Strategist picks Path B with strong justification.
- **No Server-Sent Events alternative.** If Path A is too slow, Module Strategist documents in FINDINGS for future evaluation.
- **No JWT refresh logic** — that's auth-service's own concern; this SPEC operates on permission-cache freshness only.
- **No M2 Platform Admin changes** — admins are already power-users; they live with logout on permission edits today.

---

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Hot-reload permissions before page logic boots | Daniel 2026-05-15 (this Brief's authorization) |
| 2 | Path A (refresh on page-load) is Architect's recommendation; Module Strategist may switch with evidence | Architect |
| 3 | Single hook in auth-service.js, not per-screen | Architect — reuse, no scatter |
| 4 | Functional smoke via Chrome MCP, not JWT-direct only | Pattern from Foundation_Permissions_Hotfix lesson |
| 5 | All new RPCs inherit M1A_OPERATIONS_RPCS_FIX discipline | Project policy |
| 6 | Iron Rule 32 §7 = None | Project policy |

---

## 5. Success Criteria

1. **`refreshPermissions()` helper exists** in `js/auth-service.js`. Verified by `grep`.
2. **Page-load hook calls refresh** before `applyUIPermissions()`. Verified by sequence trace in DevTools OR by code inspection.
3. **New RPC (if any) deployed** with full M1A discipline. Verified by `pg_proc.prosecdef=true`, `proconfig=[search_path=public]`, `aclexplode` shows REVOKE on anon + GRANT to authenticated.
4. **No regression on existing screens** — every Phase 1A/1B/M4 screen still loads correctly. Verified by smoke on representative screens.
5. **Functional smoke 10/10 PASS on demo** (see §2). Captured in TEST_REPORT.md.
6. **Page-load performance delta ≤ 150ms** under realistic conditions. Captured in TEST_REPORT.md.
7. **No new console errors anywhere.**
8. **Iron Rules** — no new violations. Verified by `npm run verify --full`.
9. **No new HIGH/ERROR advisor lints** — run `scripts/audit/advisors-for-objects.mjs` if new RPC added.
10. **No Prizma data written** — only on demo for smoke.
11. **Iron Rule 32 §7 = None.**
12. **Commit count: 3-6, single-concern, on `develop`.**
13. **MIGRATION.md Applied Log** (per harvested E1) if any DDL.
14. **EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW** inside the SPEC folder.
15. **`docs/GLOBAL_MAP.md` updated** (additive) — new RPC if added + new helper function name.

---

## 6. Pre-Flight (mandatory before authoring the SPEC)

Inherits MANDATORY §0 audits per harvested patterns (Inner-call arity + Smoke-touched schema + Concurrent-Pipeline envelope).

```sql
-- Probe 1: confirm hasPermission's actual source (sessionStorage)
-- Already verified via code reading (js/auth-service.js:286-289)

-- Probe 2: does an "all permissions for user" RPC already exist?
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc
WHERE proname LIKE '%authorized%' OR proname LIKE '%permission%' OR proname LIKE '%user_perms%'
ORDER BY proname;

-- Probe 3: current SK.PERMS sessionStorage key shape (read js/auth-service.js for SK constants)

-- Probe 4: where does the initial permission load happen (search for "fetch permissions" / "load perms" patterns at login)

-- Probe 5: count of pages calling applyUIPermissions vs requirePermission
-- via shell: grep -rn "applyUIPermissions\|requirePermission\|hasPermission" --include="*.js" --include="*.html" .
```

Pin each result. The probe results determine Path A vs Path B choice.

---

## 7. Iron Rules in Sharp Focus

- **Rule 7** — DB wrapper only (new RPC called via `sb.rpc(...)` through the shared client, not direct).
- **Rule 14, 15, 18, 22** — tenant_id correctness in any new RPC.
- **Rule 21** — extend existing patterns; don't fork.
- **Rule 22** — defense-in-depth (RPC checks JWT tenant_id first).
- **Rule 23** — no secrets.
- **Rule 31** — integrity gate clean.
- **Rule 32** — None.

---

## 8. Anti-Patterns (Things to Avoid)

- **Authoring blind.** Run §6 probes first.
- **Adding `refreshPermissions()` calls to every screen JS file.** Single hook in auth-service.
- **Building Path B as default.** Path A is the recommendation; Path B only with evidence.
- **Adding a UI for "force-refresh permissions"** (a button). Refresh happens automatically; no user action needed.
- **Caching the refreshed result beyond sessionStorage.** Don't introduce IndexedDB / localStorage for permission state.
- **Modifying CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT** beyond standard docs-only effect.
- **Touching Phase 1A / M1B0 / 1B screen code** beyond removing redundant `requirePermission()` calls if any.

---

## 9. Open Questions for the Module Strategist

1. **Path A or Path B?**
*Recommendation: A.* Path B only if probe #2 reveals no usable `*authorized_for*` RPC and adding one is heavier than wiring Realtime.

2. **`is_user_authorized_for_all` signature — return JSON `{key: true}` or array of granted keys?**
*Recommendation: JSON map.* Matches the sessionStorage shape; zero conversion overhead.

3. **What about screens that don't currently call `applyUIPermissions()` explicitly?**
*Recommendation: trace via probe #5; if any screen relies on the cache without calling apply, hook into a lower-level place like `init.js` or `auth-service.js`'s session-validate path.*

4. **Toast on permission change — Day-1 or Phase 2+?**
*Recommendation: Phase 2+.* Day-1 just silently re-renders. Toast UX is polish.

5. **Does `refreshPermissions()` block page-load (await) or fire-and-forget?**
*Recommendation: await (block).* Otherwise screens may briefly render with stale cache. The 30-80ms cost is acceptable.

---

## 10. Relevant Reference Files

| File | Why |
|---|---|
| `js/auth-service.js:286-289` | The bug location (hasPermission cache) |
| `js/auth-service.js` | SK constants, session init, applyUIPermissions chain |
| `modules/Module 1 - Inventory Management/docs/specs/M1B_FOUNDATION_PERMISSIONS_HOTFIX/EXECUTION_REPORT.md` | The lesson that drove this SPEC |
| `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_PROCUREMENT/FOREMAN_REVIEW.md` | "Existing prizma users will need logout/login as well to refresh their permissions cache" — the explicit pain |
| `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/SPEC.md` | RPC discipline reference |
| `CLAUDE.md` §4-§6 | Iron Rules |

---

## 11. Hand-off Note

Full Auto Pipeline. Activation Prompt to be delivered after Brief seals.

Pipeline order:
1. `opticup-strategic` reads Brief + runs §6 probes + decides Path A/B.
2. Authors `SPEC.md` inside `modules/Module 1 - Inventory Management/docs/specs/M1_HOTFIX_PERMISSIONS_HOT_RELOAD/`.
3. Hands off to `opticup-executor`.
4. Executor implements + functional smoke via Chrome MCP.
5. Reports written.
6. Reviewer + Foreman seal.
7. ONE Hebrew status line to Daniel.

After 🟢: Daniel merges to main. Next SPEC (`M1_K2_RECEIPT_COMPLETION`) dispatched.

---

*End of Brief. Permission cache hot-reload. Zero logout cycles after this lands.*
