# FINDINGS — M1B_FOUNDATION_PERMISSIONS_HOTFIX

This file records issues discovered during execution that are NOT in scope of this SPEC. Per CLAUDE.md §9 "one concern per task", these are NOT fixed here — they're logged for Foreman triage (new SPEC / TECH_DEBT / dismiss).

---

## F-1 — Foundation Pipeline shipped a discipline gap, not a code bug

**Severity:** HIGH (process)
**Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/TEST_REPORT.md` smoke cases 1-9
**Discovered during:** §0 Phase A probes (A2 returned 0 rows for any lens.* permission in role_permissions on either tenant)

**Description:** The Foundation Pipeline declared 9/9 smoke PASS and closed 🟢. Foundation Block 1 successfully seeded 6 `permissions` rows (3 keys × 2 tenants) — but never seeded any `role_permissions` assignments. The Foundation smoke ran in JWT-direct context with implicit full-permission and never exercised the real client-side `hasPermission()` cache lookup against `getEffectivePermissions`'s output. Real users (Daniel, PIN-auth path) saw "אין הרשאה למסך זה" on all 3 new screens.

The bug is not a code bug — the screens, the RPCs, the permission keys are all fine. The bug is a *test-discipline* bug: the Foundation SPEC's smoke matrix did not include the role_permissions seed nor exercise the gated path under a real-user JWT.

**Suggested next action:** Already addressed in this SPEC's §3 #19 — Foreman_review logs as **skill-improvement proposal counter 1/3** for opticup-strategic SKILL.md. The fix to the skill is: "Any SPEC that ships a customer-facing screen with `hasPermission(key)` MUST include in its smoke matrix: (a) real-user JWT mint via pin-auth EF, (b) replicated `getEffectivePermissions` query under that JWT, (c) positive + negative test (one role that has the key, one that doesn't). JWT-direct smoke is insufficient."

---

## F-2 — `team_lead` total_keys did not increase from 46 to 47 post-fix

**Severity:** INFO (counting nuance, not a bug)
**Location:** TEST_REPORT.md Case 1 row for `team_lead`
**Discovered during:** Smoke Case 1 verification

**Description:** Pre-fix, `team_lead` had 46 role_permissions rows on demo (count from §0 baseline probe ran without `granted=true` filter). Post-fix `total_keys=46` was expected to be 47 (46+1). Closer look: pre-fix had 45 `granted=true` rows + 1 `granted=false` row = 46 total; post-fix has 46 `granted=true` rows = 46 (the new `lens.inventory.view` added). When filtering on `granted=true` (the same filter `getEffectivePermissions` applies), pre vs post = 45 → 46. The discrepancy is a baseline-counting artifact, not a fix-correctness issue. SPEC §3 #7 is satisfied by `lens_keys=1` and `lens_keys_list=[lens.inventory.view]`.

**Suggested next action:** None. Recorded for retrospective transparency. A future audit SPEC could enumerate which role × permission_id rows on demo are `granted=false` (for hygiene), but no functional issue.

---

## F-3 — Foundation EXECUTION_REPORT smoke #8 description matched current behavior, but the smoke itself did not detect the gap

**Severity:** LOW (already covered by F-1 root cause)
**Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/TEST_REPORT.md` smoke #8
**Discovered during:** Brief reading

**Description:** Foundation's smoke #8 was described as: "Permission gate present in all 3 main JS files (lens.*.* keys via hasPermission())." This validated that the screens *call* hasPermission with the right keys — which is true. It did not validate that hasPermission *returned true* for the test user. The discipline-gap is more subtle than "no UI smoke" — it's "UI smoke that asserts presence of the gate but not its outcome under a real role". The proposed SKILL.md fix (F-1) should explicitly include this distinction.

**Suggested next action:** Roll into the same SKILL.md change in F-1. Or, a separate proposal: "smoke matrix must include role × key outcome rows, not just gate presence." Same author-skill improvement; one line extension.

---

## F-4 — pin-auth EF response shape does not include the granted-permissions list

**Severity:** INFO (architectural observation, not a defect)
**Location:** `supabase/functions/pin-auth/index.ts:167-176`
**Discovered during:** Smoke Cases 2/3 design

**Description:** The pin-auth EF returns `{token, employee: {id, name, role, branch_id, tenant_id}}` — no permissions list. The client (auth-service.js:103) calls `getEffectivePermissions(employee.id)` after receiving the JWT and queries role_permissions itself. This is the canonical project architecture (server mints identity, client materializes permissions). It means smoke testing requires a *second* SQL probe after the EF call, not a single round-trip. Not a bug — this SPEC's smoke design accommodates this.

**Suggested next action:** None. Recorded for any future architecture decision regarding whether to inline the permissions list into the pin-auth response (would save 1 round-trip but couples EF to permission schema). Out-of-scope for this SPEC.

---

## F-5 — Repo had pre-existing untracked/modified files at Pipeline start (Full-Auto Pipeline mode)

**Severity:** INFO (process — handled per Autonomy Playbook)
**Location:** repo root, prior to Commit 1
**Discovered during:** First Action repo check

**Description:** At Pipeline start, `git status --short` showed ~8 modified files (docs/guardian/, roles/, M4 audit) and ~20 untracked files (other architecture-briefs + M1 SPEC folders). Per Autonomy Playbook ("Pre-existing untracked / modified files in Full-Auto Pipeline mode"), these were left alone; explicit-filename `git add` was used for every commit of this SPEC; working-tree cleanliness was satisfied for files this SPEC touched (SPEC.md + ROLLBACK.md + MIGRATION.md + TEST_REPORT.md + FINDINGS.md + EXECUTION_REPORT.md + SESSION_CONTEXT.md update).

**Suggested next action:** None. Process operated as designed. The pre-existing files are managed by other concurrent Pipelines (Foundation close-out, M1B0 close-out, M1A_OPS_RPCS_FIX close-out, etc. per SPEC §0.F orthogonality envelope).

---

*End of findings. 5 findings logged; 1 HIGH (F-1, the meta-lesson), 1 LOW (F-3), 3 INFO (F-2/F-4/F-5). Foreman triages.*
