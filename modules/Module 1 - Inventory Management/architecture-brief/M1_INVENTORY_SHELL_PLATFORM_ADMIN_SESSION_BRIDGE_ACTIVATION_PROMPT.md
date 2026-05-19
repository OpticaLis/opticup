You are the opticup-strategic Module Strategist for Module 1. Load the opticup-strategic skill.

Read the Brief in full at:
modules/Module 1 - Inventory Management/architecture-brief/M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE_BRIEF.md

This is a tight ~30-minute SPEC that closes T-INFRA-1 from Stage 2A: gatePlatformAdminTabs() in js/inventory-shell-lens.js queries is_platform_super_admin() via the default Supabase Auth client (storageKey: sb-tsxrrxzmdxaenlvocyit-auth-token), but the admin.html session is stored under storageKey 'optic_admin_auth' (set in modules/lens-catalog-admin/catalog-auth.js:10). The two clients don't share a session, so the platform-admin button is always hidden from inventory.html. The fix is a 5-8 line bridge inside gatePlatformAdminTabs() that reads the optic_admin_auth session via a transient client and routes the RPC through it.

Author a SPEC inside modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE/ per folder-per-SPEC protocol. Then run the Full-Auto Pipeline end-to-end.

Hard rules enforced:
1. NO polish-by-validation closure. Pre-flight verified line 296 still uses the default sb client — no bridge code exists. If Executor finds it already in place, STOP and escalate.
2. Tier C VFV mandatory. 3 cases minimum: (a) Daniel logged into admin.html → button VISIBLE on inventory.html?t=demo; (b) tenant PIN user → button HIDDEN; (c) anon (no session at all) → button HIDDEN.
3. FOREMAN_REVIEW.md mandatory within 24h.
4. Patch stays inside gatePlatformAdminTabs() in js/inventory-shell-lens.js. No new files. No changes to admin.html / catalog-auth.js / auth-service.js / shared.js.
5. The transient client stays function-scoped — DO NOT promote to window.* global.
6. Fail-safe: any error path leaves the button hidden.

Verified facts (probed via Cowork architect 2026-05-18 night):
- admin.html → catalog-auth.js creates client with storageKey='optic_admin_auth' (Google OAuth JWT lives there).
- inventory.html → shared.js:4 creates default client (window.sb), no storageKey override.
- inventory-shell-lens.js:296 calls sb.rpc('is_platform_super_admin').
- Daniel's auth.users.id = c1d58c59-d38b-4fb0-8dab-2bb949d6d537, platform_admins.role='super_admin', status='active'.
- is_platform_super_admin() function returns true when auth.uid() matches a row in platform_admins with role='super_admin' AND status='active'.

Pre-Action Collision Check: claim lock with branch develop + files owned glob "js/inventory-shell-lens.js,modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE/**".

Pipeline: Path X sequential. Stop on deviation.

After the pipeline closes, emit ONE Hebrew status line to Daniel summarizing: verdict + commit count + 3 Tier C VFV results + Foreman verdict.
