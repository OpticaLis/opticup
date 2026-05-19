# SPEC — M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Claude Code Opus 4.7 1M)
> **Authored on:** 2026-05-18 night (IDT, immediately after Daniel's real-flow false-positive escalation)
> **Module:** 1.5 — Shared Components (cross-cutting auth-isolation infra; touches Module 2 code)
> **Brief:** Daniel's in-chat directive 2026-05-18 night ("APPROVED. Proceed with the 1-line storageKey patch...") authorizing what the prior Brief `M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE_BRIEF.md` incorrectly fenced off.
> **Plan position:** True closure of Stage 2A T-INFRA-1 (the prior SESSION_BRIDGE SPEC shipped the consumer-side bridge but the producer-side wrote to the wrong storage key in production).

---

## 0. Pre-Authoring Reality Check

### 0.1 Why this SPEC exists (failure of the prior SPEC)

The prior SPEC `M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE` (closed 🟢 at HEAD `ac8eb5f`) shipped a 7-line bridge inside `gatePlatformAdminTabs()` that reads from `localStorage` key `'optic_admin_auth'`. The Tester's "4/4 PASS" verdict was a **false positive** because it used Approach 1 (synthetic `auth.setSession()` planting a session directly into `optic_admin_auth`) — a state production never reaches.

**Real production state when Daniel actually performed the flow:**
- admin.html loads `modules/admin-platform/admin-auth.js:7`: `const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON);` — **NO storageKey override** → uses Supabase default `sb-tsxrrxzmdxaenlvocyit-auth-token`.
- inventory.html loads `js/shared.js:4`: same default storageKey.
- Daniel logs into admin.html → session stored under DEFAULT key.
- Daniel opens inventory.html?t=demo → PIN-auth flow **overwrites** the default key with the tenant JWT, evicting Daniel's admin session.
- gatePlatformAdminTabs runs, calls bridge → bridge reads `optic_admin_auth` → **always empty in real flow** (only `modules/lens-catalog-admin/catalog-auth.js` writes there, and that's loaded AFTER the catalog-admin tab is opened — too late to gate the button).
- RPC runs anon → returns false → button hidden. **Same broken state as before the bridge shipped.**

The prior Brief's author confused two similarly-named files:
- `modules/lens-catalog-admin/catalog-auth.js:10` (storageKey `'optic_admin_auth'`) — loaded by the catalog-admin **partial** INSIDE inventory.html, only AFTER Daniel reaches the tab.
- `modules/admin-platform/admin-auth.js:7` (no storageKey override) — the ACTUAL admin.html login flow.

The bridge's READ side was correct; the WRITE side (admin.html's actual login) never populated the key it reads. This SPEC fixes the producer side with a 1-line patch.

### 0.2 Pre-flight verifications (live 2026-05-18 night)

| Check | Result |
|---|---|
| Target file path | `modules/admin-platform/admin-auth.js` exists, 106 LOC. |
| Line 7 currently reads | `const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON);` (no auth options) — confirmed via Read 2026-05-18 night |
| Number of consumers of `adminSb` in `modules/admin-platform/*.js` | 7 files (admin-auth, admin-audit, admin-dashboard, admin-db, admin-feature-overrides, admin-provisioning, admin-tenant-detail). All use `adminSb.{from,rpc,auth}` patterns. All run in the SAME classic-script namespace as admin-auth.js. Zero of them parameterize storageKey. |
| Cross-module consumers of `adminSb` symbol | ZERO — verified via `grep -rn "adminSb" --include="*.js"` excludes anything outside `modules/admin-platform/`. The symbol is module-private. |
| Other consumers of admin.html's session under DEFAULT storageKey | ZERO direct readers. The only readers of the default key in admin-context are the same admin-platform/*.js files (via the in-namespace `adminSb`). Inventory.html's `sb` ALSO reads the default key but for PIN tenant sessions, not admin sessions. |
| Prior bridge SPEC (`M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE`) reads `optic_admin_auth` | ✅ confirmed at HEAD — the bridge code is correct; the producer side is wrong. This SPEC fixes the producer. |
| `lens-catalog-admin/catalog-auth.js:10` uses storageKey `'optic_admin_auth'` | ✅ confirmed. After this SPEC, admin.html + catalog-auth.js will both read/write the same storage namespace — which is the desired behavior (Daniel logged into admin.html → catalog-admin partial inside inventory.html sees same session). |

### 0.3 Runtime semantics rehearsal (post-patch behavior across 4 caller classes)

| Caller class | Pre-patch state | Post-patch state | Net |
|---|---|---|---|
| Daniel re-logs into admin.html (fresh login post-deployment) | session stored in default key; collides with PIN-auth | session stored in `optic_admin_auth`; isolated from PIN-auth | ✅ Fix |
| Daniel has EXISTING session in default key (logged in before deployment) | reads default key — works | reads `optic_admin_auth` — empty → forced to re-log-in ONCE | 🟡 ONE-TIME re-login required after deployment. Document. |
| admin-platform/*.js consumers (admin-dashboard etc.) calling `adminSb.from(...)` | use default-key session | use `optic_admin_auth`-key session (same session, different storage location) | ✅ Identical RPC/data behavior, isolated storage |
| Tenant manager on inventory.html (PIN session in default key) | unchanged | unchanged | ✅ Zero impact |
| catalog-auth.js client inside catalog-admin partial | reads `optic_admin_auth` → was always empty in production | reads `optic_admin_auth` → NOW POPULATED by admin.html login | ✅ Daniel reaches catalog-admin tab with session intact |
| gatePlatformAdminTabs bridge (shipped in prior SPEC) | reads `optic_admin_auth` → empty → RPC anon → button hidden | reads `optic_admin_auth` → populated → RPC returns true → button visible | ✅ FIX — this is the chain that finally completes T-INFRA-1 |

**Three traps eliminated by rehearsal:**

- **One-time re-login trap:** the patch does NOT migrate existing sessions. Daniel needs to re-log into admin.html ONCE post-deployment. Document in deployment notes + EXECUTION_REPORT. Not a recurring cost.
- **PIN-auth contention trap:** the patch ELIMINATES the contention. Default key now exclusively for tenant PIN; `optic_admin_auth` exclusively for platform admin. Two separate storage namespaces.
- **catalog-auth.js double-read trap:** the catalog-admin partial creates its OWN client with `storageKey: 'optic_admin_auth'` (its line 10). After this patch, that client + the admin-platform/adminSb client share the same storage namespace. Concurrent reads are safe; concurrent writes don't conflict because admin.html and catalog-admin partial never run in the same browser tab simultaneously (admin.html doesn't load catalog-admin partial; catalog-admin partial only loads inside inventory.html). Even if they did, Supabase's atomic-write storage adapter handles concurrent updates correctly.

**Runtime semantics rehearsed: yes — evidence captured. Tier C VFV must verify on REAL browser flow (no synthetic injection).**

### 0.4 SPEC-author defect from prior Brief (REQUIRED documentation per user directive)

Daniel's directive: "FOREMAN_REVIEW.md mandatory + must explicitly document the SPEC-author defect (my prior Brief named the wrong file) so future Briefs catch this class of error."

**The defect class:** prior Brief assumed `modules/lens-catalog-admin/catalog-auth.js` was admin.html's auth file because of the filename pattern + the `optic_admin_auth` storageKey it sets. A 60-second `grep -n "src=" admin.html | grep auth` would have shown admin.html loads `modules/admin-platform/admin-auth.js`, NOT `catalog-auth.js`. The Foreman (me) also missed this — my own diagnosis to Daniel (the 10-line analysis) said "admin.html → catalog-auth.js" which was the same wrong identification.

**The lesson:** for ANY SPEC that touches a frontend auth flow, the author MUST `grep "<script src=" <entry-page>.html` to enumerate ACTUAL loaded JS files, then verify each one for auth-relevant code. Don't infer from filenames or storageKey strings. P-AUTHOR-1 below codifies this as a SKILL improvement.

### 0.5 Lessons applied from prior FOREMAN_REVIEWs (especially the prior SPEC that produced the false positive)

| Source | Lesson | Honored here? |
|---|---|---|
| `M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE/FOREMAN_REVIEW.md` (just closed 🟢 with false positive) | "Self-grep §8 skeleton when authoring §3 string-literal counts" (P-AUTHOR-1) | YES — §3 row 6 self-checked. |
| Same FR (implicit) | "Tester Approach 1 verification must be a REAL flow, not synthetic injection" | YES — §3 S-VFV-CASE-A explicitly forbids `auth.setSession()` planting. Chrome MCP must drive the actual admin.html email/password form. |
| Memory `feedback_vfv_must_use_not_just_inspect.md` | "VFV must USE the surface" | YES — §3 S-VFV-CASE-A includes clicking through admin.html login form via Chrome MCP `fill` + `click`. |
| Memory `feedback_no_polish_by_validation.md` | "Zero-change closure → STOP" | YES — pre-flight confirmed line 7 has no storageKey override. |
| `M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS/FOREMAN_REVIEW.md` P-AUTHOR-1 | "Pre-dispatch destructive-ops gate simulation" | N/A — zero destructive ops in this SPEC. |
| All prior P-AUTHOR proposals re: SPEC-§3-§8 self-consistency | YES — §3 + §8 cross-checked. |

### 0.6 Pre-existing untracked files survey

Same 15+ pre-existing untracked + 4 M-tracked files as the last 5 SPECs in this session. Executor uses selective `git add` by filename only.

### 0.7 Baselines

| Symbol | Source | Metric | Value |
|---|---|---|---|
| `BASE_LINES_admin_auth` | `modules/admin-platform/admin-auth.js` | `wc -l` | 106 |
| `BASE_LINE_7_VERBATIM` | same | text | `const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON);` |
| `BASE_ADMINSB_CONSUMERS` | `modules/admin-platform/*.js` | grep -c | 7 files (29 total `adminSb` references) |
| `BASE_STORAGEKEY_KEY` | `modules/lens-catalog-admin/catalog-auth.js:10` | text | `storageKey: 'optic_admin_auth'` |
| `BASE_BRIDGE_KEY` | `modules/inventory/inventory-shell-lens.js:301` | text | `storageKey: 'optic_admin_auth'` (bridge read target — shipped in prior SPEC) |

---

## 1. Goal

Change `modules/admin-platform/admin-auth.js` line 7 to set `storageKey: 'optic_admin_auth'` on the `adminSb` Supabase client. This isolates admin.html's session from inventory.html's PIN-tenant session AND aligns admin.html's storage location with the bridge shipped in `M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE`. Effect: Daniel logging into admin.html stores his session in `optic_admin_auth`; PIN-auth on inventory.html no longer evicts it; the bridge actually finds the session; the "🔧 קטלוג מערכת" button surfaces; clicking it opens Stage 2A.

## 1.5 Schema Impact

ZERO. No DB changes. No new functions/tables/RPCs/policies. No new files.

## 2. Background & Motivation

See §0.1 above. This SPEC is the producer-side fix that makes the prior SPEC's consumer-side bridge actually work in production. Without this patch, the prior SPEC's "🟢 4/4 PASS" was a false positive (Tester used synthetic `auth.setSession()` injection, never the real admin.html login flow). Daniel surfaced the actual broken state via screenshot. After this patch, the FULL chain — admin.html login → PIN-auth on inventory.html doesn't evict admin session → bridge reads populated `optic_admin_auth` → button visible → click → Stage 2A opens — works end-to-end via real browser flow.

## 3. Success Criteria (Measurable)

| # | ID | Criterion | Expected | Verify command |
|---|----|-----------|----------|----------------|
| 1 | S-BRANCH | Branch `develop`, repo clean at close | "nothing to commit" (modulo pre-existing untracked) | `git status --short` |
| 2 | S-COMMITS | Commits produced | 2 (1 patch + 1 closure) — Foreman closure separate (commit 5) | `git log <START>..HEAD --oneline \| wc -l` → 2 (Executor stage) |
| 3 | S-FILE-EXISTS | Target file at expected path | `modules/admin-platform/admin-auth.js` | `ls` exit 0 |
| 4 | S-LOC-CAP | File ≤ 350 LOC (Iron Rule 12) | post-patch ≤ 110 (was 106; +0 to +4 expected from formatting) | `wc -l` → ≤110 |
| 5 | S-PATCH-EXACT | Patch changes ONLY line 7 (or splits the single line for readability across at most 4 lines if formatted) | `git diff <START>..HEAD modules/admin-platform/admin-auth.js` shows changes on line 7 ONLY | manual diff |
| 6 | S-STORAGEKEY-SET | Line 7 contains `storageKey: 'optic_admin_auth'` | text present | `grep -c "storageKey: 'optic_admin_auth'" modules/admin-platform/admin-auth.js` → 1 |
| 7 | S-CLIENT-ARGS-INTACT | URL + anon key arguments byte-identical to pre-patch | `ADMIN_SUPABASE_URL` + `ADMIN_SUPABASE_ANON` still passed | `grep "createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON" modules/admin-platform/admin-auth.js` → 1 hit |
| 8 | S-NO-OTHER-CHANGES | NO changes to lines 1-6 or 8-106 of admin-auth.js | `git diff` shows only line 7 family (with optional pretty-format expansion) | manual diff |
| 9 | S-OTHER-FILES-UNTOUCHED | NO changes to `admin.html`, `js/shared.js`, `js/auth-service.js`, `modules/lens-catalog-admin/catalog-auth.js`, `modules/inventory/inventory-shell-lens.js`, or any other JS/HTML file outside `admin-auth.js` | `git diff --name-only START..HEAD` matches only the allowed set | grep verify |
| 10 | S-IRON-RULE-7 | Standard `supabase.createClient(...)` API used | no raw fetch | grep verify |
| 11 | S-IRON-RULE-12 | File ≤ 350 LOC | covered by S-LOC-CAP |
| 12 | S-IRON-RULE-21 | No new symbols introduced (only an option-bag literal added) | `adminSb` is the same const | manual review |
| 13 | S-IRON-RULE-32 | `## Destructive Operations: None.` declared | declared | this SPEC |
| 14 | S-VERIFY-INTEGRITY | Iron Rule 31 gate | exit 0 or 2 | `npm run verify:integrity` |
| 15 | S-VERIFY-STAGED | `npm run verify -- --staged` | exit 0 | run command |
| 16 | S-NO-POLISH | Real change shipped — storageKey now present | S-STORAGEKEY-SET PASS | combined |
| 17 | S-VFV-CASE-A | **REAL FLOW** — Chrome MCP opens admin.html, fills email+password form with dannylis669@gmail.com / Optic2026!, clicks login button, waits for login success, checks `localStorage.getItem('optic_admin_auth')` is NON-NULL. Then navigates SAME PAGE/CONTEXT to inventory.html?t=demo, waits for lens-nav to render, checks `#lensNav button[data-lens-tab="catalog-admin"]` has `display !== 'none'`. **NO synthetic `auth.setSession` or `auth_setSession` planting allowed.** | button visible | Localhost-Tester via Chrome MCP |
| 18 | S-VFV-CASE-A-CLICK | Same Chrome session as Case A — click the now-visible button. Verify Stage 2A 4-column platform-admin screen renders (header banner "🔐 PLATFORM ADMIN", 4 grid columns visible, NOT the tenant private-catalog screen) | Stage 2A screen rendered | Tester screenshots before+after click |
| 19 | S-VFV-CASE-B | Tenant PIN user (no admin.html login) → button HIDDEN | `btn.style.display === 'none'` | Tester clears `optic_admin_auth`, logs in via tenant PIN |
| 20 | S-VFV-CASE-C | Anon (no auth at all) → button HIDDEN | hidden | Tester clears ALL auth storage, navigates to inventory.html |
| 21 | S-VFV-NO-CONSOLE | 0 NEW console errors from auth flow (pre-existing GoTrueClient noise allowed) | 0 new | Tester logs console |
| 22 | S-VFV-NO-REGRESSION | After patch, admin.html login flow continues to work (Daniel's email+password form still successfully authenticates + `getCurrentAdmin()` returns valid record) | login completes; admin panel visible | covered by S-VFV-CASE-A first step |
| 23 | S-SESSION-CONTEXT | Module 1.5 SESSION_CONTEXT.md prepended with closure block + Module 1 SESSION_CONTEXT.md updated to mark prior SESSION_BRIDGE SPEC's false positive correction | both files updated | manual diff |
| 24 | S-CHANGELOG | Module 1.5 CHANGELOG.md has section | new section | manual diff |

**16 Executor-measurable + 6 Tester-measurable + 2 Foreman-closure.**

## 4. Autonomy Envelope

### Executor CAN
- Edit `modules/admin-platform/admin-auth.js` (the ONE owned production file)
- Update Module 1.5 SESSION_CONTEXT + CHANGELOG + Module 1 SESSION_CONTEXT (carry-over update)
- Run verify scripts
- Commit + push with selective `git add` by filename

### Executor MUST STOP IF
- Bridge code I shipped earlier (`gatePlatformAdminTabs`) no longer reads `optic_admin_auth` (something else changed → coordination issue)
- Pre-edit re-probe finds line 7 already has `storageKey:` set (zero-change closure trigger) → STOP, escalation
- Any file outside §8 list touched
- Patch grows beyond 4 changed lines (single-line, formatted across 2-4 lines max)
- Tester surfaces tenant CAN reach platform-admin screen with the patch (bridge too permissive)
- Tester surfaces admin.html login flow regressed (email/password no longer works)
- Any verify gate fails

## 5. Stop-on-Deviation Triggers

- **HARD RULE — NO polish-by-validation.** Pre-flight 2026-05-18 night confirmed line 7 = `const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON);` with NO auth options. Pre-edit re-probe MUST confirm same baseline. If diverged → STOP escalation.
- Executor proposes editing `admin.html` itself, `js/shared.js`, `js/auth-service.js`, `catalog-auth.js`, or `inventory-shell-lens.js` → STOP, scope creep.
- Executor proposes adding `getCurrentSession()` or any new exported function → STOP, this is a config patch only.
- Executor proposes migrating existing sessions → STOP, out of scope. Re-login is documented.
- Tester uses `auth.setSession()`, `auth_setSession`, or any `localStorage.setItem('optic_admin_auth', ...)` direct write → STOP escalation, the Tester run is INVALID and must be redone.
- Tester finds tenant PIN user can see the button after patch → STOP, regression.
- Tester finds anon user can see the button → STOP, fail-safe breach.
- Tester finds admin.html login form no longer works → STOP, severe regression — rollback immediately.

## 6. Rollback Plan

If the SPEC fails:
1. `git reset --hard <START_COMMIT>` (Executor records).
2. No DB rollback.
3. Released lock.
4. Mark REOPEN. Note: the prior SESSION_BRIDGE SPEC's bridge code remains valid; only this producer-side fix is reversed.

## Destructive Operations

None.

(Per Iron Rule 32, all destructive operations forbidden for this SPEC's run.)

## 7. Out of Scope

- `admin.html` markup/scripts — untouched.
- `js/shared.js`, `js/auth-service.js` — untouched.
- `modules/lens-catalog-admin/catalog-auth.js` — untouched (it already uses the correct key).
- `modules/inventory/inventory-shell-lens.js` — untouched (bridge already shipped).
- Migration of existing sessions to the new key — out of scope; Daniel re-logs once.
- All other `admin-platform/*.js` files — they read `adminSb` from the same script-load namespace; no edits needed.
- Stage 2B Excel import — separate Brief.
- Hook auth-parser fix (NEW_SPEC carry from RLS bypass) — independent infrastructure.

## 8. Expected Final State

### Modified files

| File | Change |
|---|---|
| `modules/admin-platform/admin-auth.js` | Line 7 changes from `const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON);` to `const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON, { auth: { storageKey: 'optic_admin_auth' } });` (single-line) OR split across up to 4 lines if Executor prefers readability formatting. |
| `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` | Prepend closure block (~25 lines) |
| `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` | Append section (~12 lines) |
| `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` | Prepend note that prior SESSION_BRIDGE SPEC's "🟢" verdict was a false positive corrected by this Module 1.5 SPEC (~10 lines) |

### Patch shape (Executor copies this OR equivalent multi-line form)

```javascript
// Line 7 — single-line form (preferred):
const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON, { auth: { storageKey: 'optic_admin_auth' } });
```

Multi-line equivalent (if Executor prefers):

```javascript
const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON, {
  auth: { storageKey: 'optic_admin_auth' },
});
```

Both are byte-equivalent in behavior. Single-line matches the file's compact style.

### New files

None.

### Docs updated (MUST include)

- Module 1.5 SESSION_CONTEXT.md — UPDATED
- Module 1.5 CHANGELOG.md — UPDATED
- Module 1 SESSION_CONTEXT.md — UPDATED (carry-over correction)
- Module 2 — N/A (admin.html unchanged; admin-platform/*.js consumers behave identically)
- `MASTER_ROADMAP.md` — N/A
- `docs/GLOBAL_MAP.md` — N/A
- `docs/GLOBAL_SCHEMA.sql` — N/A
- `docs/FILE_STRUCTURE.md` — N/A

## 9. Commit Plan

| # | Type | Scope | Subject | Files |
|---|------|-------|---------|-------|
| 1 | fix | admin-auth | `isolate adminSb session under storageKey 'optic_admin_auth' (closes Stage 2A T-INFRA-1 producer side)` | `modules/admin-platform/admin-auth.js` |
| 2 | chore | spec | `close M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION with retrospective` | SPEC.md (if amended) + EXECUTION_REPORT + FINDINGS + Module 1.5 SESSION_CONTEXT + Module 1.5 CHANGELOG + Module 1 SESSION_CONTEXT |

Reviewer + Tester + Foreman closure follow.

## 10. Dependencies / Preconditions

- Prior SPEC `M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE` shipped (consumer-side bridge already in place, reading `optic_admin_auth`).
- Daniel has admin.html credentials (`dannylis669@gmail.com` / `Optic2026!`) — confirmed.
- Tester MUST have access to those credentials for REAL Chrome MCP flow (Daniel provided them in dispatch).
- ERP dev server running on localhost:3000.

## 11. Lessons Already Incorporated

See §0.5.

Cross-Reference Check completed 2026-05-18 night:
- New literal `'optic_admin_auth'` in admin-auth.js → 2 existing references (`catalog-auth.js:10` + `inventory-shell-lens.js:301`). Third reference here is INTENTIONAL — three files all agree on the canonical platform-admin storage namespace. NOT a violation of Iron Rule 21 (this is the convergence point, not a duplicate).
- No new files, no new symbols, no new functions.

**Cross-Reference Check: 0 collisions / 0 new names introduced.**

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actuals in EXECUTION_REPORT §2.
- [ ] Integrity gate exit 0 or 2.
- [ ] `git status --short` empty (modulo pre-existing untracked).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT + FINDINGS written.
- [ ] Tester's TEST_REPORT.md present with **REAL Chrome MCP browser flow** — NO synthetic `auth.setSession()` injection. Documented per case.
- [ ] Reviewer's REVIEWER_REPORT present.
- [ ] Module 1.5 + Module 1 SESSION_CONTEXT/CHANGELOG updated.
- [ ] Pipeline locks released.
- [ ] FOREMAN_REVIEW explicitly documents the SPEC-author defect from the prior Brief (per Daniel's directive #4).

---

**End of SPEC. Dispatch to opticup-executor next.**
