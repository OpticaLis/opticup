# SPEC — M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Claude Code Opus 4.7 1M)
> **Authored on:** 2026-05-18 night (IDT)
> **Module:** 1 — Inventory Management
> **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE_BRIEF.md` (SEALED)
> **Plan position:** Stage 2A finishing-touch (closes T-INFRA-1)

---

## 0. Pre-Authoring Reality Check

### 0.1 Brief read in full

Brief read 2026-05-18 night. Stage 2A's TEST_REPORT §6 T-INFRA-1 + Stage 2A's FOREMAN_REVIEW §6 disposition (carry → bundle with T-BLOCK-2) read for context. T-BLOCK-2 closed via `M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS` 🟡; T-INFRA-1 still open → THIS SPEC.

### 0.2 Pre-flight verifications (live 2026-05-18 night)

| Check | Result |
|---|---|
| Target file path | `modules/inventory/inventory-shell-lens.js` (Brief said `js/inventory-shell-lens.js` — typo; the `js/` path does not exist). 343 LOC. |
| `gatePlatformAdminTabs()` defined at lines 294-313 | ✅ Confirmed |
| Line 296 still calls `sb.rpc('is_platform_super_admin')` directly (no bridge code) | ✅ Confirmed — polish-by-validation guard armed |
| `catalog-auth.js:10` still creates client with `storageKey: 'optic_admin_auth'` | ✅ Confirmed via grep |
| `js/shared.js:2-3` exports `SUPABASE_URL` + `SUPABASE_ANON` constants | ✅ Confirmed (window-scoped via classic-script load) |
| `js/shared.js:4` creates `sb` with default storageKey (no override) | ✅ Confirmed |
| `is_platform_super_admin()` function active in DB | ✅ Confirmed across 3 prior SPECs this session |
| Daniel's auth.users.id = `c1d58c59-d38b-4fb0-8dab-2bb949d6d537` with role='super_admin' status='active' | ✅ Confirmed (Tester used this in M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS) |
| Grep `optic_admin_auth` in `*.js` + `*.html` | Only `modules/lens-catalog-admin/catalog-auth.js:10` (the source of truth). 0 collisions for SPEC's new bridge usage. |

### 0.3 Brief drift caught (small) — Brief §3.2 inaccuracy

Brief §3.2 claims: "Three nav strips have the same `data-{cat}-tab="catalog-admin"` button: lens-nav, contact-lens-nav, accessory-nav. The Stage 2A code (`gatePlatformAdminTabs()`) already iterates them."

**Repo reality:** `gatePlatformAdminTabs()` only targets `#lensNav button[data-lens-tab="catalog-admin"]` (line 300). The contact-lens and accessory variants are gated by `data-tab-permission="contact_lens.catalog.admin"` / `accessory.catalog.admin"` (PermissionUI library reads tenant permissions; out-of-band from THIS function).

**This SPEC's scope:** lens-nav button only (same as the existing function). The other 2 nav strips' visibility for platform admins is a SEPARATE concern (would require giving the platform admin's session a synthetic permission set, or wiring PermissionUI to honor the `optic_admin_auth` session). **Out of scope per Brief §4 "no changes to admin.html, catalog-auth.js, or any platform-admin login flow"** — adding permission semantics for the admin session is platform-admin-login-flow adjacent. Document this in §7 Out of Scope for transparency.

### 0.4 Runtime semantics rehearsal (Iron Rule 5.3 — JWT-routing path)

Three caller classes after the bridge ships:

| Caller class | localStorage `optic_admin_auth` | localStorage default sb key | Bridge client's session | RPC result | Button visible? |
|---|---|---|---|---|---|
| Daniel (logged into admin.html, then opens inventory.html) | session present, JWT valid | empty / tenant-pin session | bridge reads admin JWT, `auth.uid()` = Daniel's UID, matches active super_admin row | `true` | YES ✅ |
| Tenant manager (PIN-authenticated on inventory.html, NEVER opened admin.html) | empty | tenant-pin session present | bridge client construction succeeds but `getSession()` returns null → `auth.uid()` in RPC = NULL | `false` | NO ✅ (unchanged behavior) |
| Anon user (no auth, no admin login) | empty | empty | bridge client returns null session → `auth.uid()` = NULL → RPC anon path | `false` (or RPC rejection caught) | NO ✅ |

**Three traps eliminated by rehearsal:**

- **Auto-refresh trap:** if `autoRefreshToken: true`, the transient client would background-refresh the admin JWT on each invocation. Wasteful and noisy. → SPEC mandates `autoRefreshToken: false` for the transient client. Admin.html's primary client (in catalog-auth.js) keeps doing the real refresh.
- **persistSession write-back trap:** if the transient client writes a fresh session back to `optic_admin_auth`, it could corrupt admin.html's state. → SPEC mandates `persistSession: true` (so READ works) BUT the transient client only READs the session; the existing token in storage is not mutated by simple getSession() calls. Verified via Supabase JS docs.
- **No-admin-session false-positive trap:** if the bridge's createClient succeeds but the storage is empty, the new client has no session → `rpc('is_platform_super_admin')` runs as anon → returns false → button hidden. **This is the correct fall-through; tenant users on inventory.html (who have a PIN-tenant session under the default key) are NOT mis-classified as admins** because the bridge client reads ONLY from `optic_admin_auth`, not from the default key. ✅ Defense-in-depth confirmed.

**Runtime semantics rehearsed: yes — evidence captured.**

### 0.5 Lessons applied from prior FOREMAN_REVIEWs

| Source | Lesson | Honored here? |
|---|---|---|
| `M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS/FOREMAN_REVIEW.md` P-AUTHOR-1 | "Pre-dispatch destructive-ops gate simulation" | N/A — this SPEC has zero destructive ops. |
| Same FR P-AUTHOR-2 | "SPEC_TEMPLATE §Destructive Ops should encode machine-readable block" | N/A — same reason. |
| Same FR P-EXEC-1 | "Pre-apply destructive-ops gate simulation" | N/A. |
| Same FR P-EXEC-2 | "Write FINDINGS.md EARLIER" | YES — ACTIVATION_PROMPT instructs Executor to create FINDINGS.md stub at start. |
| `M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A/FOREMAN_REVIEW.md` P-AUTHOR-1 | "§0.4 DB Schema Rehearsal MUST include RLS/auth WRITE-path probe" | YES — §0.4 above traces 3 caller classes against the bridge. |
| Same FR P-EXEC-1 | "Pre-stage diff of sibling files (sibling-pattern symmetry)" | N/A — no sibling function pattern in this SPEC. |
| Stage 1 P-AUTHOR-2 | "List `docs/FILE_STRUCTURE.md` in §8" | N/A — no new files. |
| Memory `feedback_no_polish_by_validation.md` | "If zero changes needed → STOP, escalate" | YES — §5 active stop-trigger. Pre-flight confirmed bridge does NOT exist. |
| Memory `feedback_vfv_must_use_not_just_inspect.md` | "VFV must USE the surface, not just inspect" | YES — §3 S-VFV-CASE-A requires Tester to actually log in via admin.html → navigate to inventory.html → click the now-visible button → confirm Stage 2A screen opens. |

### 0.6 Untracked-files survey

Same 14+ pre-existing untracked + 4 M-tracked carry-overs as the last 3 SPECs in this session. **Executor uses selective `git add` by filename. No `git add -A`.**

### 0.7 Baselines

| Symbol | Source | Metric | Value (captured 2026-05-18 night) |
|---|---|---|---|
| `BASE_LINES_shell` | `modules/inventory/inventory-shell-lens.js` | `wc -l` | 343 |
| `BASE_GATE_RPC_LINE` | same file, line 296 | text | `sb.rpc('is_platform_super_admin').then(function (r) {` |
| `BASE_STORAGEKEY_REF` | `modules/lens-catalog-admin/catalog-auth.js:10` | text contains | `storageKey: 'optic_admin_auth'` |
| `BASE_DEFAULT_CLIENT` | `js/shared.js:4` | text | `let sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);` (no auth options) |

---

## 1. Goal

Bridge the admin.html platform-super-admin session (stored under `localStorage.optic_admin_auth`) into the `is_platform_super_admin` RPC call inside `gatePlatformAdminTabs()`, so when Daniel (or any platform-super-admin) logs into admin.html and then navigates to `inventory.html?t=demo`, the "🔧 קטלוג מערכת" button surfaces in the lens-nav strip and clicking it opens the Stage 2A platform admin screen. **Closes Stage 2A's T-INFRA-1 carry.** Tenant PIN users + anon users continue to see the button hidden (no regression).

## 1.5 Schema Impact

ZERO. No DB changes. No new functions. No new RLS policies. No new tables/columns.

## 2. Background & Motivation

Stage 2A shipped the platform-admin UI; the RLS bypass SPEC unblocked the DB writes. Both verified. But the Tester surfaced T-INFRA-1: even though Daniel is a confirmed platform-super-admin, the "🔧 קטלוג מערכת" button is hidden on inventory.html because the gate's RPC uses the wrong Supabase client (no admin session in its localStorage). The Foreman's diagnosis (10-line analysis 2026-05-18 night) identified two separate Supabase Auth clients with different `storageKey` values. The Architect's Brief locks the 5-8 line fix inside `gatePlatformAdminTabs()`.

Once 🟢, Daniel can visually confirm Stage 2A's flows end-to-end from inventory.html, which is the gate Daniel set for authoring Stage 2B (Excel import dialog).

## 3. Success Criteria (Measurable)

| # | ID | Criterion | Expected | Verify command |
|---|----|-----------|----------|----------------|
| 1 | S-BRANCH | Branch `develop`, repo clean at close | "nothing to commit, working tree clean" (modulo pre-existing untracked) | `git status --short` |
| 2 | S-COMMITS | Commits produced on top of START_COMMIT | 2 commits (1 patch + 1 closure) | `git log <START>..HEAD --oneline \| wc -l` → 2 |
| 3 | S-FILE-EXISTS | Target file still at expected path | `modules/inventory/inventory-shell-lens.js` exists | `ls` exit 0 |
| 4 | S-LOC-CAP | File ≤ 350 LOC (Iron Rule 12 hard cap); soft warning at >300 acceptable (pre-existing state) | post-patch ≤ 350 | `wc -l modules/inventory/inventory-shell-lens.js` → ≤350 |
| 5 | S-PATCH-MIN | Patch ≤ 8 added lines (Brief §3.1 + §5 budget) | added lines ≤ 8 | `git diff <START>..HEAD modules/inventory/inventory-shell-lens.js \| grep -c '^+' \| awk '{print $1-1}'` (subtracting the +++ header line) → ≤8 |
| 6 | S-PATCH-MAX | Patch must change SOMETHING (no zero-change closure) | added lines ≥ 4 | same as above ≥ 4 |
| 7 | S-STORAGEKEY-REF | Patch references `'optic_admin_auth'` literal | exactly 1 occurrence in the file | `grep -c "optic_admin_auth" modules/inventory/inventory-shell-lens.js` → 1 |
| 8 | S-TRANSIENT-SCOPE | The transient admin client is function-scoped (no `window.*` assignment) | 0 `window.adminSb`/`window.platformAdminSb`/`window.optic` writes in the patch | `grep -c "window\\.adminSb\\|window\\.platformAdminSb\\|window\\.optic" modules/inventory/inventory-shell-lens.js` → 0 |
| 9 | S-AUTOREFRESH-OFF | Transient client has `autoRefreshToken: false` (prevents background refresh contention with admin.html's primary client) | text present | `grep -c "autoRefreshToken: false\\|autoRefreshToken:false" modules/inventory/inventory-shell-lens.js` → 1 |
| 10 | S-FAILSAFE | try/catch wrapping the bridge-client construction (any error → fall back to original `sb`, button hidden by default RPC anon path) | text present | `grep -c "try {\\|catch" inside the gatePlatformAdminTabs function body` → ≥1 try / ≥1 catch |
| 11 | S-RPC-ROUTED | The `is_platform_super_admin` RPC is called through the BRIDGE client (or fallback `sb`), not directly on `sb` after the patch | the immediate `.rpc('is_platform_super_admin')` call no longer hard-codes `sb.` | manual diff |
| 12 | S-RETAIN-BEHAVIOR | The existing button-hide + section-gate + tab-fallback logic INSIDE the .then() block is byte-identical to pre-patch | Reviewer diff-audits | manual diff |
| 13 | S-IRON-RULE-7 | All Supabase calls use `supabase.createClient(...)` standard API (Iron Rule 7) | no raw fetch / no Supabase URL hardcoded outside SUPABASE_URL constant | `grep -c "fetch.*supabase.co" modules/inventory/inventory-shell-lens.js` → 0 |
| 14 | S-IRON-RULE-12 | File ≤ 350 LOC | covered by S-LOC-CAP |
| 15 | S-IRON-RULE-21 | No duplicate `optic_admin_auth` storageKey constant — patch uses the string literal once (the canonical home stays in catalog-auth.js:10) | 1 occurrence in inventory-shell-lens.js + 1 in catalog-auth.js + spec/Brief refs are documentation only | `grep -rn "optic_admin_auth" --include="*.js" .` returns 2 code references (catalog-auth.js + this patch) + any documentation |
| 16 | S-IRON-RULE-32 | `## Destructive Operations` declares None. + verified | declared | this SPEC §Destructive Operations |
| 17 | S-VERIFY-INTEGRITY | Integrity gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity` |
| 18 | S-VERIFY-STAGED | `npm run verify -- --staged` passes | exit 0 | run command |
| 19 | S-NO-SCOPE-CREEP | NO changes to `admin.html`, `catalog-auth.js`, `js/shared.js`, `js/auth-service.js`, or any other file outside `modules/inventory/inventory-shell-lens.js` + this SPEC folder + module docs | `git diff --name-only START..HEAD` matches only the allowed set | grep verify |
| 20 | S-NO-POLISH | Real code change shipped — bridge present (pre-flight confirmed it was absent at SPEC seal) | S-PATCH-MAX + S-STORAGEKEY-REF + S-AUTOREFRESH-OFF all PASS | combined |
| 21 | S-VFV-CASE-A | Tier C VFV — Daniel logged into admin.html → button VISIBLE on inventory.html?t=demo + Stage 2A screen opens on click | button visible + Stage 2A screen visible | Localhost-Tester via Chrome MCP |
| 22 | S-VFV-CASE-B | Tier C VFV — tenant PIN user (no admin session) → button HIDDEN on inventory.html | button hidden | Localhost-Tester |
| 23 | S-VFV-CASE-C | Tier C VFV — anon user (no auth at all) → button HIDDEN | button hidden | Localhost-Tester |
| 24 | S-VFV-NO-CONSOLE | 0 NEW console errors/warnings from the bridge code path (pre-existing GoTrueClient noise acceptable) | 0 new | Localhost-Tester |
| 25 | S-SESSION-CONTEXT | Module SESSION_CONTEXT.md prepended with this SPEC's closure block | new top-of-file entry | manual diff |
| 26 | S-CHANGELOG | CHANGELOG.md has this SPEC's section | new section | manual diff |

**20 Executor-measurable criteria + 4 Tester-measurable (S-VFV-*) + 2 Foreman-closure (S-SESSION-CONTEXT, S-CHANGELOG).**

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Edit `modules/inventory/inventory-shell-lens.js` (the ONE owned file)
- Run read-only verify scripts
- Commit + push with selective `git add` by explicit filename
- Update SESSION_CONTEXT + CHANGELOG + MODULE_MAP (Foreman closure block can be added by Executor in commit 2, OR by Foreman in a 3rd commit — Executor chooses)

### What REQUIRES stopping and reporting

- Any edit to a file outside §8 list
- Patch exceeds 8 added lines (Brief §3.1 + §5 budget) — STOP, scope creep
- Any of: admin.html / catalog-auth.js / shared.js / auth-service.js touched — STOP per Brief §4
- Bridge code already exists when Executor reads the file (re-probe before patch) — STOP, polish-by-validation guard, escalation file
- Any verify gate fails
- Any §3 actual diverges from §3 expected

## 5. Stop-on-Deviation Triggers

- **HARD RULE — NO polish-by-validation.** Pre-flight confirmed line 296 unchanged at SPEC seal. If Executor's pre-edit re-probe finds a bridge already in place → STOP, write escalation. Memory `feedback_no_polish_by_validation.md` binding.
- Patch grows beyond 15 lines total → STOP (Brief §12 trigger).
- Executor proposes refactoring `auth-service.js` / `catalog-auth.js` / `shared.js` → STOP, out of scope.
- Executor proposes promoting the transient client to `window.*` → STOP per Brief §9 #3.
- Tester finds tenant PIN user CAN see the button after patch → STOP, bridge too permissive.
- Tester finds anon user can see the button → STOP, bridge fails fail-safe.

## 6. Rollback Plan

If the SPEC fails partway:
1. `git reset --hard <START_COMMIT>` (Executor records START_COMMIT in EXECUTION_REPORT §1).
2. No DB rollback needed (no DB changes).
3. Release pipeline lock.
4. Mark REOPEN.

## Destructive Operations

None.

(Per Iron Rule 32, this declaration forbids ALL destructive operations for this SPEC's run. No file deletes, no SQL DROP/TRUNCATE, no force-pushes, no `git reset --hard` outside rollback path, no mass renames.)

## 7. Out of Scope (explicit)

- `admin.html`, `modules/lens-catalog-admin/catalog-auth.js`, `js/shared.js`, `js/auth-service.js`, `modules/admin-platform/admin-auth.js` — all untouched per Brief §4.
- Tenant PIN auth flow — untouched.
- New permission keys — none. `is_platform_super_admin()` is the single check.
- New RLS policies — already shipped in the predecessor SPEC.
- contact-lens-nav + accessory-nav `catalog-admin` buttons — gated by PermissionUI `data-tab-permission` attribute, NOT by `gatePlatformAdminTabs()`. Out of scope per §0.3 Brief-drift clarification.
- Extracting `'optic_admin_auth'` into a shared constant — Brief §3.3 prefers (a) accept the literal duplicate. SPEC follows.
- Stage 2B Excel import — separate Brief, queued.
- T-INFRA-1's sibling concern: PermissionUI honoring admin sessions for the contact-lens / accessory nav buttons — future Brief if needed.

## 8. Expected Final State

### Modified files (exactly ONE production file + 3 docs)

| File | Change |
|---|---|
| `modules/inventory/inventory-shell-lens.js` | 5-8 lines added inside `gatePlatformAdminTabs()` between line 295 (the existing guard) and line 296 (the existing RPC call). The RPC call's left-hand side changes from `sb.rpc(...)` to `rpcClient.rpc(...)` where `rpcClient` defaults to `sb` and is reassigned to a transient admin client if construction succeeds. |
| `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` | Prepend closure block above prior RLS Unblocker block (~25 lines) |
| `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` | Append section (~10 lines) |
| `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` | N/A — no new files; existing `inventory-shell-lens.js` row already present |

### Patch shape (Executor copies this skeleton)

The 5-line patch sits between the existing line 295 guard and the existing line 296 RPC call:

```javascript
  function gatePlatformAdminTabs() {
    if (typeof sb === 'undefined' || !sb || typeof sb.rpc !== 'function') return;
    // M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE: route the platform-admin
    // gate RPC through a transient client that reads the admin.html session
    // (storageKey 'optic_admin_auth'). Default sb misses Google-OAuth admin JWTs.
    // Fail-safe: any error → fall back to default sb → RPC runs as anon → false → button hidden.
    var rpcClient = sb;
    try { rpcClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: true, autoRefreshToken: false, storageKey: 'optic_admin_auth' } }); } catch (_) { /* keep default sb */ }
    rpcClient.rpc('is_platform_super_admin').then(function (r) {
      // ... existing .then() body unchanged (lines 297-311) ...
    }).catch(function () { /* anon/RPC failure → keep tab hidden by leaving the gate set */ });
  }
```

Net: +5 lines (3 comment + 1 var + 1 try-line). +1 char modification (`sb.rpc` → `rpcClient.rpc`). The existing `.then()` body and `.catch()` block remain byte-identical.

**Executor MAY split the long try-line across 2 lines for readability — that adds 1 line (total +6, still within S-PATCH-MIN ≤ 8).**

### New files

None.

### DB state

Unchanged.

### Docs updated (MUST include)

- Module `SESSION_CONTEXT.md` — UPDATED (closure block prepended)
- Module `CHANGELOG.md` — UPDATED (section appended)
- Module `MODULE_MAP.md` — N/A (no new files)
- `MASTER_ROADMAP.md` — N/A
- `docs/GLOBAL_MAP.md` — N/A
- `docs/GLOBAL_SCHEMA.sql` — N/A
- `docs/FILE_STRUCTURE.md` — N/A

## 9. Commit Plan

2 commits (3 if a Foreman closure commit is needed separately).

| # | Type | Scope | Subject | Files |
|---|------|-------|---------|-------|
| 1 | fix | inventory-shell | `bridge admin.html session into platform-admin gate RPC (T-INFRA-1)` | `modules/inventory/inventory-shell-lens.js` |
| 2 | chore | spec | `close M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE with retrospective` | `SPEC.md` (if amended) + `EXECUTION_REPORT.md` + `FINDINGS.md` + `SESSION_CONTEXT.md` + `CHANGELOG.md` |

Reviewer + Tester commits follow in 3 + 4. Foreman closure commit lands FOREMAN_REVIEW.md + final SESSION_CONTEXT update if needed.

## 10. Dependencies / Preconditions

- Stage 2A closed 🟡 (predecessor) — verified.
- RLS bypass SPEC closed 🟡 — verified.
- `is_platform_super_admin()` RPC live — verified (3 prior SPECs this session).
- Daniel has admin.html access via Google OAuth — confirmed (`platform_admins` row, role=super_admin, status=active).
- For Tier C VFV positive case: Daniel must be logged into admin.html in the test browser BEFORE navigating to inventory.html.

## 11. Lessons Already Incorporated

See §0.5 above for the lessons-table.

Cross-Reference Check (Rule 21 author-time sweep) completed 2026-05-18 night:
- New literal `'optic_admin_auth'` in patch → only existing code reference is `catalog-auth.js:10`; the patch is the SECOND reference. Per Brief §3.3 (a), accept the duplicate (low-risk literal — same string in both places functionally describes "use the admin's storageKey").
- No new function names, no new exported symbols, no new files.
- Cross-Reference Check completed against GLOBAL_SCHEMA + GLOBAL_MAP + FILE_STRUCTURE: **0 collisions / 0 new names introduced.**

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values in EXECUTION_REPORT.md §2.
- [ ] Patch added lines count ≥ 4 and ≤ 8 (S-PATCH-MIN + S-PATCH-MAX).
- [ ] Integrity gate exit 0 or 2.
- [ ] `git status --short` returns empty (clean tree, modulo pre-existing untracked carry-overs).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written in SPEC folder.
- [ ] Tester's TEST_REPORT.md present with 3 cases (A admin-visible / B tenant-hidden / C anon-hidden) reported + S-VFV-NO-CONSOLE.
- [ ] Reviewer's REVIEWER_REPORT.md present.
- [ ] Module SESSION_CONTEXT.md / CHANGELOG.md updated.
- [ ] Pipeline locks released.

---

**End of SPEC. Dispatch to opticup-executor next.**
