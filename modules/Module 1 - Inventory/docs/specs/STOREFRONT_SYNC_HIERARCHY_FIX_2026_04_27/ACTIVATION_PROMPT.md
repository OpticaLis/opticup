# Activation Prompt — STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27

> **For:** Claude Code on Daniel's Windows desktop (or laptop / Mac)
> **Repo:** `opticalis/opticup` (ERP) + `opticalis/opticup-storefront` (storefront)
> **Branch (ERP):** `develop`
> **Branch (storefront):** `main`
> **Authored:** 2026-04-27 by Cowork-strategic (Foreman)
> **Severity:** HOTFIX — production-impacting

---

## Paste this entire block into Claude Code

```
You are opticup-executor. Load your skill: opticup-skills:opticup-executor.

Execute SPEC at:
modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/SPEC.md

Context (do NOT skip — read in this order before doing anything):
1. CLAUDE.md — Iron Rules 1–31
2. The SPEC.md above, in full
3. modules/Module 1 - Inventory/docs/SESSION_CONTEXT.md
4. docs/GLOBAL_SCHEMA.sql — current view definitions
5. The 3 most recent FOREMAN_REVIEW.md files under modules/Module 1 - Inventory/docs/specs/

Bounded Autonomy:
- The SPEC defines the success criteria. Match each step to its expected value.
  If they match → continue. If they don't → STOP and report.
- Never bypass any verify gate. Never use git --no-verify.
- Pre-flight is MANDATORY. Capture BEFORE_VIEWS.sql and BEFORE_METRICS.json
  to the SPEC folder BEFORE the first apply_migration call. Without these,
  rollback is impossible and the SPEC is unsafe to execute.
- §7 Out-of-Scope is exhaustive. Do not touch anything outside §8.
- The price-guard commit d1f67c4 on storefront main is sacred. Do NOT weaken it.

Hard rules being enforced (memory):
- HARD RULE 2026-04-27: storefront NEVER shows prices. Any product page
  rendering ₪ or ILS = STOP, treat as critical regression.
- §3 criteria #5–#10 are the smoke test. Run them after the migration. Run
  §12 end-to-end QA before writing EXECUTION_REPORT.

Both repos must be CLEAN at end:
- ERP (opticup): on develop, "nothing to commit, working tree clean"
- Storefront (opticup-storefront): on main, "nothing to commit, working tree clean"
- Push both repos to origin.

Deliverables (mandatory, all 4 in the SPEC folder):
1. EXECUTION_REPORT.md — pre-flight artifacts, start/end commit hashes for
   both repos, §3 criteria table with actual measured values, §12 QA output.
2. FINDINGS.md — anything surprising, deferred, or not in scope but worth flagging.
3. BEFORE_VIEWS.sql — pre-change view DDL (pre-flight).
4. BEFORE_METRICS.json — pre-change row counts (pre-flight).

Push when done. Report to Daniel in Hebrew, ONE sentence: "תוקן.
SuperSale שני סקשנים פעילים, מחירים מוסתרים, היררכיית סנכרון לפי דגם בודד."
Then list the commit hashes.

If anything diverges from §3 expected values — STOP, run §6 rollback,
report to Daniel for instructions. Do not improvise a recovery.
```

---

## Notes for Daniel (not for Claude Code)

- This SPEC has TWO repos in scope. Make sure Claude Code is in `C:\Users\User\opticup`
  when it starts; the SPEC tells it when to switch to `opticup-storefront`.
- Expected runtime: 30–45 min (most of it is QA waiting for Vercel to redeploy
  if the storefront repo gets a commit).
- The SPEC explicitly does NOT touch your `inventory.website_sync` data or
  `brands.default_sync` data. Your settings stay exactly as they are.
- If Claude Code stops mid-SPEC and asks for guidance, the answer is almost
  always: "follow the rollback plan in §6, then come back to me." Don't let
  it improvise.
- After Claude Code finishes and you've verified the live site looks right,
  paste-back this Cowork chat and say "executed, here's the EXECUTION_REPORT"
  so I can write the FOREMAN_REVIEW.
