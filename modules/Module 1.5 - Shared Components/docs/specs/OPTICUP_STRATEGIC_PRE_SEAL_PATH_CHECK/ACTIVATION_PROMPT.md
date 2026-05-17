# ACTIVATION_PROMPT — opticup-strategic Pre-seal Path-Check patch

**Paste into Claude Code on Daniel's Windows desktop.** Same session that just closed M1_FOUNDATION_CLOSE_CLEANUP — quick patch.

---

You are **opticup-executor**. Apply a small but high-leverage patch to `.claude/skills/opticup-strategic/SKILL.md` before the next batch of SPEC authoring starts.

**Why:** 2 consecutive SPECs (M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION + M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17) hit the same author-side defect class — literal paths in SPEC §3/§4/§9 referenced `modules/inventory/` instead of correct `modules/lens-inventory/`. Each one caused an executor retry cycle (Rule-32 hook caught it at commit time). Per 3-strike rule, 2-strike is early-promotion territory when the cost is "every SPEC executor session loses ~15 min".

This is the harvest of FOREMAN_REVIEW A-1 from `modules/Module 1 - Inventory Management/docs/specs/M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17/FOREMAN_REVIEW.md` §6.

---

## Edit — `.claude/skills/opticup-strategic/SKILL.md`

**Find** the section "## SPEC Authoring Protocol" → "### Step 1.5 — Cross-Reference Check" (mandatory step before SPEC seal).

**Append a new sub-section after Step 1.5** (named **Step 1.6**) with this content:

```markdown
### Step 1.6 — Pre-Seal Path Verification (MANDATORY — applied 2026-05-17 after 2-strike of path-typo class)

Every literal filesystem path mentioned in the SPEC MUST be verified to exist on disk BEFORE sealing. Specifically check:

- Every path in §3 Success Criteria verification commands (`ls`, `Test-Path`, `grep -rn`)
- Every path in §4 Destructive Operations (rm/edit targets)
- Every path in §7 Out-of-Scope (paths to NOT touch)
- Every path in §9 Commit Plan (Files column)
- Every path in §11 Pipeline Coordination (files_owned_globs)
- Every path in §13 Lessons (references)

**Verification command (Cowork):**
```bash
cd /sessions/*/mnt/opticup
# For each path in SPEC, run:
ls "<path>" 2>&1 | head -1
# Expected: file/dir listed. NOT: "No such file or directory".
```

**Verification command (Claude Code desktop):**
```powershell
cd C:\Users\User\opticup
Test-Path "<path>"  # Expected: True
```

If ANY path returns false-existence → STOP, fix the SPEC, re-verify. Do NOT seal a SPEC with phantom paths.

**Common typo classes this catches:**
- `modules/inventory/` vs `modules/lens-inventory/` (sibling module prefix)
- `modules/Module 1/` vs `modules/Module 1 - Inventory Management/` (truncated module folder name)
- `shared/css/foo.css` vs `shared/css/foo.css.bak` (extension drift)
- File renamed after audit but SPEC still cites old name

**Why this is non-overridable:** the SPEC contract is a written agreement with the executor. Paths that don't exist break the contract before execution starts. The executor will catch it via Rule-32 hook or pre-flight, but each catch costs ~15 min retry. Author-side prevention is 30 seconds.

**2-strike empirical history:**
- 2026-05-17 SPEC 4a: §4 allowlist used `modules/inventory/` (lens-goods-receipt missed)
- 2026-05-17 SPEC 4.5: §3 + §4 + §5 used `modules/inventory/lens-inventory-quick-scan.js` (actual: `modules/lens-inventory/lens-inventory-quick-scan.js`); 3 occurrences in one SPEC
```

## Edit 2 — Append the cross-reference grep template

**Find** the same section. **Append a new Step 1.7** after Step 1.6:

```markdown
### Step 1.7 — Embedded Pre-Flight Grep for Consumer Counts (MANDATORY when SPEC claims "only N consumers")

When SPEC §5 (Foreman Decision) asserts "only N consumers of X exist", the SPEC §6 Stop-Triggers MUST contain the exact grep/Select-String command the executor will run at pre-flight to verify the claim.

Example shape:

```bash
# Cowork:
grep -rn "m1_create_receipt_from_box" js/ modules/ supabase/functions/ | grep -v ".bak"

# Claude Code desktop:
Select-String -Path "js\**\*.js","modules\**\*.js","supabase\functions\**\*.ts" -Pattern "m1_create_receipt_from_box" -SimpleMatch
```

If the grep returns N+1+ → executor STOPs and escalates. If the SPEC §6 does NOT contain the grep command, the executor must author one before pre-flight (adds noise + variability). Embedding the command in SPEC §6 makes the verification deterministic.

**1-strike empirical history (early-promoted because it pairs naturally with Step 1.6):**
- 2026-05-17 SPEC 4.5: §5 said "only 1 consumer" — actual was 2. Executor wrote the grep ad-hoc, found `lens-goods-receipt-close.js:65`, halted correctly. With this rule in force, the grep is canonical and the verification is faster.
```

---

## Commit + push

```powershell
cd C:\Users\User\opticup
git add .claude\skills\opticup-strategic\SKILL.md
git add "modules\Module 1.5 - Shared Components\docs\specs\OPTICUP_STRATEGIC_PRE_SEAL_PATH_CHECK\ACTIVATION_PROMPT.md"
git add "modules\Module 1 - Inventory Management\docs\specs\M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17\FOREMAN_REVIEW.md"
git commit -m "chore(skills): opticup-strategic Step 1.6 + 1.7 path-check + consumer-grep — 2-strike harvest"
git push origin develop
```

Also update DECISIONS_LOG.md with a new 2026-05-17 entry summarizing the 2-strike harvest. Reference both SPECs as evidence.

Report commit hashes.

**Estimated wall clock: 5-10 min.**
