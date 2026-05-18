# Activation Prompt — M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION

> Dispatched by: opticup-strategic (Foreman) 2026-05-18 night IDT.
> Pipeline: Path X sequential — Executor → Reviewer → Localhost-Tester → Foreman closure.

---

You are the **opticup-executor**. Load that skill BEFORE any action.

## Your task

Execute the SPEC at:
`modules/Module 1.5 - Shared Components/docs/specs/M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION/SPEC.md`

This is the SHORTEST possible SPEC: ONE-LINE patch to `modules/admin-platform/admin-auth.js` line 7. Adds `{ auth: { storageKey: 'optic_admin_auth' } }` as the third arg to `supabase.createClient`.

## Why this SPEC matters

The prior SPEC (`M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE`, closed 🟢 with 4/4 PASS) was a FALSE POSITIVE. The Tester used synthetic `auth.setSession()` to plant a session into `optic_admin_auth` localStorage — production never reaches that state because admin.html actually writes to the DEFAULT Supabase storageKey, not `optic_admin_auth`. Daniel surfaced the broken state via real screenshot.

The bridge I shipped on the consumer side (`gatePlatformAdminTabs` reads `optic_admin_auth`) was correct. The producer side (`admin-auth.js:7`, no storageKey override) is wrong. THIS SPEC fixes the producer side with ONE line.

## Hard constraints (re-read SPEC §4 + §5)

1. **NO polish-by-validation.** Pre-flight confirmed line 7 reads `const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON);` (no auth options). Your re-probe must confirm same baseline. If you find `storageKey:` already set → STOP escalation.
2. **DO NOT touch** any file other than `modules/admin-platform/admin-auth.js` + Module 1.5 docs + Module 1 SESSION_CONTEXT carry-note. ZERO changes to admin.html, js/shared.js, js/auth-service.js, catalog-auth.js, inventory-shell-lens.js.
3. **Selective `git add` by filename** for every commit.
4. **Patch ≤ 4 changed lines** (single-line or pretty-formatted multi-line of same content).

## Pre-Action Collision Check

```
node scripts/pipeline-coordination.mjs release --spec-slug M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION --session-id foreman-storagekey-author
node scripts/pipeline-coordination.mjs claim --spec-slug M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION --branch-owned develop --files-owned-globs "modules/admin-platform/admin-auth.js,modules/Module 1.5 - Shared Components/docs/specs/M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION/**,modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md,modules/Module 1.5 - Shared Components/docs/CHANGELOG.md,modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md" --session-id executor-storagekey
```

Release at end.

## Execution outline

1. Pre-edit re-probe: `head -10 modules/admin-platform/admin-auth.js` — confirm line 7 unchanged.
2. Initialize FINDINGS.md stub.
3. Apply 1-line patch on line 7. Single-line form preferred: `const adminSb = supabase.createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON, { auth: { storageKey: 'optic_admin_auth' } });`
4. Verify post-edit:
   - `grep -c "storageKey: 'optic_admin_auth'" modules/admin-platform/admin-auth.js` → 1
   - `wc -l` → 106 ± 4
   - `git diff` shows ONLY line 7 family
   - integrity gate exit 0
5. **Commit 1** — `fix(admin-auth): isolate adminSb session under storageKey 'optic_admin_auth' (closes Stage 2A T-INFRA-1 producer side)` — selective git add of `modules/admin-platform/admin-auth.js`.
6. Update docs:
   - Module 1.5 SESSION_CONTEXT.md — prepend closure block
   - Module 1.5 CHANGELOG.md — append section
   - Module 1 SESSION_CONTEXT.md — prepend correction note re: prior SESSION_BRIDGE SPEC's false-positive verdict
7. **Commit 2** — `chore(spec): close M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION with retrospective` — EXECUTION_REPORT + FINDINGS + docs updates.
8. Push origin develop.
9. Release pipeline lock.

## Deliverables

- 2 commits on develop
- EXECUTION_REPORT.md with §3 actuals + 4 self-scores 1-10
- FINDINGS.md (empty stub at start; finalize empty `No findings.` if nothing surfaces — but flag any consumers of `adminSb` that might be affected by the storageKey change as INFO findings)
- Pre-execution git tag: `pre-M1-5-storagekey-isolation-20260518-NNNN`

## When you finish

Return: verdict (🟢/🟡/🔴), commit hashes, §3 actuals per Executor-measurable criterion (16 items), FINDINGS count + severity, 2 author + 2 executor proposals, Hebrew status line.

Begin.
