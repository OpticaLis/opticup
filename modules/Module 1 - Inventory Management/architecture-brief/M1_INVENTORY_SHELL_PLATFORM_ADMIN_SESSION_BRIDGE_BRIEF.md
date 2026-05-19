---
brief_id: M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE
title: Bridge admin.html platform-admin session to inventory.html so the "🔧 קטלוג מערכת" button surfaces
authored_by: opticup-architect (Cowork session, 2026-05-18 night)
status: SEALED — ready for Module Strategist (opticup-strategic)
module: Module 1 - Inventory Management
plan_position: Stage 2A finishing-touch — must close 🟢 before Stage 2B can be authored
predecessors: M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A (🟡), M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS (🟡)
---

# Brief — Platform-Admin Session Bridge in inventory.html

## 1. Background

Both Stage 2A and the RLS bypass SPEC closed successfully — at the DB layer and the UI layer respectively. But the new Platform Catalog Admin screen is currently **unreachable** for Daniel even though he is a confirmed platform-super-admin:

- `admin.html` uses a Supabase Auth client with `storageKey: 'optic_admin_auth'` (`modules/lens-catalog-admin/catalog-auth.js:10`). Daniel's Google OAuth JWT lives there.
- `inventory.html` uses a Supabase Auth client without a custom `storageKey`, defaulting to `sb-tsxrrxzmdxaenlvocyit-auth-token`. This is the `window.sb` global.
- `inventory-shell-lens.js:296` calls `sb.rpc('is_platform_super_admin')` on the inventory.html client — which doesn't see the session stored under `optic_admin_auth`.
- Result: `auth.uid()` returns NULL → function returns false → button hidden at line 301 (`btn.style.display='none'`).

The code at lines 287-292 explicitly documents this as a known separation ("separate Supabase Auth ... distinct from the PIN-based tenant auth"), but the gate itself never bridges the gap. The Tester surfaced this as T-INFRA-1 in Stage 2A's report; deferred to "bundle with T-BLOCK-2." T-BLOCK-2 closed; T-INFRA-1 still open.

This Brief closes T-INFRA-1 + restores access to the Platform Catalog Admin screen for legitimate platform admins.

## 2. Goal

When Daniel (or any platform-super-admin) logs into `admin.html` and then navigates to `inventory.html?t=demo`, the "🔧 קטלוג מערכת" button appears in the lens-nav strip and clicking it opens the Stage 2A platform admin screen. Tenant users (PIN-authenticated, NOT platform admin) continue to see the button hidden — exactly as today. No regression for tenant flows.

## 3. Scope IN

### 3.1 The 5-8 line patch

Inside `gatePlatformAdminTabs()` in `js/inventory-shell-lens.js` (around line 290-302), before the existing `sb.rpc('is_platform_super_admin')` call:

1. Create a transient Supabase client with `storageKey: 'optic_admin_auth'` — same URL + anon key as the main `sb`, just a different storage namespace.
2. Try to read the session from that client.
3. If a session exists → call `is_platform_super_admin()` through THAT client. The RPC receives the authenticated `auth.uid()` and returns true for platform admins.
4. If no session → fallback to the existing behavior (button stays hidden).
5. If the RPC errors → button stays hidden (fail-safe).

The patch is localized to this one function. No other file should be touched.

### 3.2 Pattern reuse

Three nav strips have the same `data-{cat}-tab="catalog-admin"` button: lens-nav, contact-lens-nav, accessory-nav. The Stage 2A code (`gatePlatformAdminTabs()`) already iterates them. The session bridge applies once at the top of the function, then all three button-gates use the bridged result.

### 3.3 Reuse the storageKey constant

The string `'optic_admin_auth'` is duplicated between admin.html's auth setup and this new bridge. Module Strategist may either (a) accept the duplicate as a low-risk literal, or (b) extract into a shared constant in `shared/js/` if a clean home exists. Prefer (a) for SPEC simplicity unless (b) takes 1 minute extra.

## 4. Scope OUT

- **No changes to admin.html, catalog-auth.js, or any platform-admin login flow.**
- **No changes to tenant PIN auth.** The existing `js/auth-service.js` flow stays exactly as is.
- **No new permission keys.** The existing `is_platform_super_admin()` RPC is the single check.
- **No new RLS policies.** The RLS bypass SPEC already shipped the policies; this Brief is purely about routing the call through the correct authenticated client.
- **No SPEC 2B scope creep.** Excel import is a separate Brief.
- **No T-BLOCK-2 hook fix.** That's queued separately (`M1_5_IRON_RULE_32_HOOK_SQL_PATTERN_AUTHORIZATION`).

## 5. Locked decisions

| # | Decision | Why |
|---|---|---|
| D1 | Patch lives inside `gatePlatformAdminTabs()` in `js/inventory-shell-lens.js`. No new file. | Smallest possible change. Function already owns this responsibility. |
| D2 | Use a transient client (created and used inside the function, no global). | Avoids polluting `window.*`. The function fires once on page load + on category swap. The transient lifespan is acceptable. |
| D3 | Fail-safe: any error path keeps the button hidden. | Defense in depth — if the bridge ever breaks, the worst case is "platform admin can't access via inventory.html" (they can still use admin.html). Never the other direction. |
| D4 | NO polish-by-validation. If Module Strategist finds the bridge already exists, STOP and escalate. | Pre-flight verified by Architect: line 296 still calls `sb.rpc(...)` directly, no bridge code. |
| D5 | Verify on demo with Daniel's actual `dannylis669@gmail.com` session. | The negative test is automatic (the screenshot in OPEN_TASKS earlier today showed the button hidden under a non-admin tenant PIN session). |

## 6. Dependencies

- **Upstream:** Stage 2A closed (button code exists, gate function exists, RPC exists). RLS bypass closed (writes succeed once button is reachable).
- **Downstream:** Stage 2B (Excel import) doesn't strictly depend on this — admin.html has its own routes — but Daniel asked to verify Stage 2A modals visually before authoring 2B, and that requires reaching the screen via inventory.html. So this Brief is the gate to Daniel's visual confirmation of Stage 2A.

## 7. Cross-module contracts to honor

- **Iron Rule 7:** the transient client uses the same `@supabase/supabase-js` library and the same canonical pattern as `js/shared.js:4`. Just a different storageKey.
- **Iron Rule 8:** no user input rendering in this patch (it's an auth path). Not applicable.
- **Iron Rule 12:** the patch is 5-8 lines. `inventory-shell-lens.js` current LOC count + the patch must stay under 350.
- **Iron Rule 21:** Module Strategist greps `optic_admin_auth` in the codebase before the patch — if there's already a helper that returns "is current user a platform admin?" anywhere, reuse it; don't create a parallel.
- **Iron Rule 22:** defense-in-depth — server-side RLS is the real gate. This patch only controls UI visibility.
- **Iron Rule 32:** no destructive operations. Pure code change.

## 8. Open questions for the Module Strategist

None at the strategic level. Module Strategist owns:
- Exact patch placement (top of function vs replace existing RPC call).
- Tier C VFV protocol: (a) Daniel logged in via admin.html → button visible on inventory.html; (b) tenant PIN user → button hidden; (c) anon (no auth) → button hidden.

## 9. Anti-patterns to avoid

1. **Touching admin.html or catalog-auth.js.** Out of scope.
2. **Removing or modifying the existing tenant PIN auth.** That's an independent system.
3. **Promoting the transient client to a global window.* property.** Stays scoped to the function.
4. **Adding a new permission key or RLS policy.** Both already exist.
5. **Self-certifying the fix without Chrome MCP verification of all 3 paths** (admin-logged-in / tenant PIN / anon).

## 10. Deliverables

1. SPEC.md by Module Strategist.
2. ACTIVATION_PROMPT.md sibling.
3. 1 commit with the patch.
4. EXECUTION_REPORT.md + FINDINGS.md.
5. Tier C VFV: 3 Chrome MCP cases (admin / tenant / anon). Optionally a 4th case for verifying that clicking the now-visible button actually opens the Stage 2A screen.
6. FOREMAN_REVIEW.md within 24h.

## 11. Position in plan

| Stage | Description | Status |
|---|---|---|
| 1 | Mockup-faithful screens | ✅ |
| 2A | Platform Catalog Admin full build | 🟡 (UI complete, RLS done, button unreachable from inventory.html) |
| RLS UNBLOCKER | RLS write bypass | ✅ (via 🟡 closure) |
| **SESSION BRIDGE** | **This Brief — surface the button for platform admins** | **next** |
| 2B | Excel import dialog (gated on Daniel's visual confirmation of 2A flows) | queued |
| 3 | Daniel loads actual Excel | queued |
| 4 | Tenant-side inventory screen — proper two sub-tabs | queued |
| 5 | Demo tests + M1 phase close | queued |

## 12. Stop triggers

- Pre-flight finds the bridge already exists → STOP, escalate.
- Patch grows beyond 15 lines → STOP, scope creep.
- Module Strategist proposes refactoring auth-service or catalog-auth → STOP, out of scope.
- Tier C VFV: tenant user can now reach the platform admin screen (negative test fails) → STOP, the patch is too permissive.

---

**End of Brief.** Module Strategist (`opticup-strategic`) authors the SPEC from here.
