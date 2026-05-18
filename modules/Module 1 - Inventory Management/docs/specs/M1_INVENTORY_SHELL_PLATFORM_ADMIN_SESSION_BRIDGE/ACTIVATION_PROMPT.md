# Activation Prompt — M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE

> Dispatched by: opticup-strategic (Foreman) 2026-05-18 night IDT.
> Pipeline: Path X sequential — Executor → Reviewer → Localhost-Tester → Foreman closure.

---

You are the **opticup-executor**. Load that skill BEFORE any action.

## Your task

Execute the SPEC at:
`modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE/SPEC.md`

This is a TIGHT ~30-minute SPEC: ONE function, ONE file, 5-8 line patch. No DB changes. No new files.

## Hard constraints (re-read SPEC §4 + §5)

1. **NO polish-by-validation.** Pre-flight confirmed line 296 of `modules/inventory/inventory-shell-lens.js` still calls `sb.rpc('is_platform_super_admin')` directly. Your pre-edit re-probe: if you find bridge code already present → STOP and write escalation. Memory `feedback_no_polish_by_validation.md` binding.
2. **DO NOT touch** `admin.html`, `modules/lens-catalog-admin/catalog-auth.js`, `js/shared.js`, `js/auth-service.js`, `modules/admin-platform/admin-auth.js`. Brief §4 out-of-scope.
3. **DO NOT promote the transient client to a `window.*` global.** Function-scoped only (S-TRANSIENT-SCOPE criterion).
4. **Patch ≤ 8 added lines.** SPEC §8 provides the exact skeleton. Copy verbatim (or split the long try-line for readability — adds 1 line, still under budget).
5. **Fail-safe pattern mandatory.** `try { ... } catch (_) { /* keep default sb */ }`. Any error → fall back to default `sb` → RPC runs as anon → returns false → button hidden. The existing `.then()`/`.catch()` body remains byte-identical.
6. **`autoRefreshToken: false`** on the transient client (S-AUTOREFRESH-OFF criterion). Prevents background refresh contention with admin.html's primary client.
7. **Selective `git add` by filename** for every commit. The 14+ pre-existing untracked files are NOT yours.

## Pre-Action Collision Check

```
node scripts/pipeline-coordination.mjs release --spec-slug M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE --session-id foreman-bridge-author
node scripts/pipeline-coordination.mjs claim --spec-slug M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE --branch-owned develop --files-owned-globs "modules/inventory/inventory-shell-lens.js,modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE/**,modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md,modules/Module 1 - Inventory Management/docs/CHANGELOG.md" --session-id executor-bridge
```

Release at end.

## Execution outline

1. **Pre-edit re-probe** — read `modules/inventory/inventory-shell-lens.js` lines 285-315. Confirm bridge code is NOT present. If present → STOP, escalation file.
2. **Initialize FINDINGS.md stub** at SPEC folder (P-EXEC-2 from prior FR — write findings file early, not at retrospective).
3. **Apply the 5-line patch** per SPEC §8 skeleton. Insert between line 295 (guard) and line 296 (the existing `sb.rpc(...)` call). Change the RPC call's LHS from `sb.rpc` to `rpcClient.rpc`. The `.then()` and `.catch()` bodies remain byte-identical.
4. **Verify** post-edit:
   - `wc -l modules/inventory/inventory-shell-lens.js` → 348-351 (was 343; +5 to +8 added).
   - `grep -c "optic_admin_auth" modules/inventory/inventory-shell-lens.js` → 1.
   - `grep -c "autoRefreshToken: false" modules/inventory/inventory-shell-lens.js` → 1.
   - `grep -c "window\.adminSb\|window\.platformAdminSb" modules/inventory/inventory-shell-lens.js` → 0.
   - Integrity gate exit 0.
5. **Commit 1** — `fix(inventory-shell): bridge admin.html session into platform-admin gate RPC (T-INFRA-1)` — selective git add of `modules/inventory/inventory-shell-lens.js` only.
6. **Update docs** — SESSION_CONTEXT.md prepend closure block, CHANGELOG.md append section.
7. **Commit 2** — `chore(spec): close M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE with retrospective` — SPEC folder retrospective + docs.
8. **Push** origin develop.
9. **Release** pipeline lock.

## Deliverables

- 2 commits on develop.
- EXECUTION_REPORT.md with §3 actuals captured + 4 self-scores 1-10.
- FINDINGS.md in SPEC folder (initialize at start; finalize at end — empty `# FINDINGS — <SPEC>\n\nNo findings.\n` if nothing surfaces).
- Pre-execution git tag: `pre-M1-session-bridge-20260518-NNNN`.

## When you finish

Return final summary: verdict, commit hashes, §3 actuals per criterion (20 Executor-measurable items), FINDINGS count + severity, 2 author + 2 executor proposals, Hebrew status line.

Begin.
