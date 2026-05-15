# ACTIVATION PROMPT — STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15

> **Audience:** A FRESH Claude Code chat that will run the Full-Auto Pipeline for this SPEC end-to-end.
> **Mode:** Full-Auto (Foreman-handoff already done — Executor → Reviewer → Localhost-Tester → Foreman-review all in this same chat via skill chaining).
> **Authored by:** opticup-strategic (Foreman), 2026-05-15.
> **Estimated wall time:** 2–3 working days. **Do NOT compress the schedule.**

---

## How to use this prompt

1. Open a fresh Claude Code chat in `C:/Users/User/opticup/`.
2. Paste **everything below the line** as the first message.
3. The chat will load `opticup-executor` (which loads `opticup-guardian` first), execute under Bounded Autonomy, and chain to Reviewer + Localhost-Tester + Foreman-review automatically.

---

# >>> EXECUTOR ACTIVATION (paste below this line) >>>

You are the Executor for Optic Up. Load the skill `opticup-executor`. You will execute the SPEC `STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15` end-to-end under the Full-Auto Pipeline (per `docs/AGENT_CHAIN_PROTOCOL.md` and `M1_5_FULL_AUTO_PIPELINE`).

**Read these in order at session start, no shortcuts:**

1. **Skill bootstrap** — `opticup-executor` SKILL loads `opticup-guardian` automatically.
2. **CLAUDE.md** (root) — the 30 Iron Rules.
3. **The SPEC itself** — `modules/Module 1.5 - Shared Components/docs/specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/SPEC.md`. Read in full. Read §0 + §1.5 + §6 + §3 Destructive Operations + §5 STT especially carefully.
4. **The Brief that drove the SPEC** — `modules/Module 1.5 - Shared Components/architecture-brief/STOREFRONT_PUBLIC_DATA_LAYER_BRIEF.md`. The SPEC supersedes anything that drifted, but the Brief's intent is the contract.
5. **Module 1.5 SESSION_CONTEXT** — `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`.
6. **Predecessor FOREMAN_REVIEWs (skim only)** — `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` + `SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md`. The SPEC §11 already lists which lessons from these were applied — you do not need to re-derive them.

## First Action — Session Start (mandatory, do not skip)

Per CLAUDE.md §1:

1. Confirm `git remote -v` is `opticalis/opticup` (this is the ERP repo, not the storefront repo).
2. Confirm branch is `develop`. If not: `git checkout develop`.
3. `git pull origin develop`.
4. `git status --porcelain` — survey untracked files. Per CLAUDE.md §1 step 3a Phase 1: if ANY untracked files exist, STOP and ask the user. Do NOT `git clean`. Do NOT discard. Selective `git add` by filename only throughout the entire pipeline.
5. `npm run verify:integrity` — must exit 0 or 2. Exit 1 = STOP, repair SPEC first.
6. `npm run test:smoke` on demo — must be 7/7 PASS. If not, STOP and surface the failure (this is the baseline; don't run any destructive op against a broken baseline).
7. Confirm Supabase MCP is connected (try a trivial `mcp__supabase__list_tables` — if it errors, STOP).
8. Confirm storefront repo at `C:/Users/User/opticup-storefront/` exists (`ls` it, do not modify).
9. Emit one Hebrew confirmation line to the user:
   > "מוכן. ענף develop נקי, smoke 7/7 PASS, MCP מחובר. מתחיל Pipeline על STOREFRONT_PUBLIC_DATA_LAYER — 6 טבלאות mirror, demo קודם ואז Prizma. אדווח כשכל commit נסגר."

## Execution Mandate

- **Demo-first, then Prizma.** Per the user's explicit directive: NO destructive op runs on Prizma before the equivalent op verifies clean on demo. Order is contractual; do not invert.
- **6 tables in this order on each tenant:** `tenant_branches` → `storefront_config` → `media_library` → `brands` → `inventory_images` → `inventory` LAST.
- **Per-table flow** (must complete before moving to the next table):
  - a. Pre-tag: `git tag pre-public-data-layer-<table>-<tenant>`.
  - b. Pre-snapshot: `pg_dump --schema-only --table=<table>` into `modules/Module 1.5 - Shared Components/backups/2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER/db-snapshots/<table>-<tenant>.sql`.
  - c. Apply migration via `mcp__supabase__apply_migration`: CREATE TABLE + RLS (3 policies per Iron Rule 15) + GRANT SELECT TO anon + trigger function (SECDEF + `SET search_path=public,pg_temp`) + trigger.
  - d. Backfill: `INSERT INTO <table>_public SELECT <projected_cols> FROM <private_base> WHERE <public_filter>`.
  - e. Verify §3 #9: `count(*) FROM <table>_public` = `count(*) FROM <private_base> WHERE <public_filter>`. **Drift = abort, rollback via pre-tag, escalate.**
  - f. E2E trigger test (3 cases per table — INSERT/UPDATE/DELETE marker rows, verify mirror reflects, then revert each marker). Use `tests/smoke/STOREFRONT_PUBLIC_DATA_LAYER_trigger_e2e.sql` (you author it).
  - g. Move to next table.
- **After all 6 tables done on a tenant:** rewrite the 8 v_storefront_* views per §6 + §3 #10–#13. Then REVOKE anon from the 6 private bases + v_crm_lead_first_touch per §3 #14–#15.

## Bounded-Autonomy Gates (every gate is non-negotiable)

- **STT-1 to STT-11** in SPEC §5 — each is a STOP-and-escalate event.
- The pre-flight Brief item the Foreman ran (SPEC §1.5) is sealed evidence — do NOT re-litigate the column allow-lists or pattern decision. If you discover the LIVE state has drifted from §1.5 (e.g., `v_storefront_products` got new columns since 2026-05-15), STT-7 fires.
- The 18 declared destructive operations in §3 are exhaustive. If you encounter a need for a 19th destructive op (e.g., a DROP COLUMN you didn't expect), STOP and write an escalation file to `modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_STOREFRONT_PUBLIC_DATA_LAYER_<short_slug>.md`, emit ONE Hebrew line to Daniel, halt the pipeline.
- Iron Rule 32 hook will block commits that contain undeclared destructive patterns. The §3 declarations cover the legitimate ops; if the hook fires, the op was either not declared or your migration .sql contains a destructive keyword inside a comment (HOTFIX_3 P-EXEC-2 lesson — avoid `DROP/DELETE/TRUNCATE/REVOKE` words inside `--` SQL comments).

## After Execution — Skill Chain

When you complete the last destructive op (Prizma `v_crm_lead_first_touch` REVOKE, expected to be Commit 9), do NOT close the SPEC yourself.

1. Author `EXECUTION_REPORT.md` + `FINDINGS.md` in this SPEC folder per `opticup-executor` SKILL §"Retrospective Protocol". Self-score §8 honestly.
2. Hand off to `opticup-reviewer` — load the skill, read SPEC + EXECUTION_REPORT + FINDINGS, write `REVIEW.md` per its template. Reviewer is not allowed to edit code; only audit.
3. Hand off to `opticup-localhost-tester` — load the skill, run the 7-test baseline + the 8-storefront-page smoke + the trigger E2E suite + the cross-tenant leak probes (§5 STT-11). Write `TEST_REPORT.md`. If anything fails → STOP, escalate to Foreman; do NOT silently fix.
4. Hand off back to `opticup-strategic` — load the skill, read all 4 sibling files (SPEC + EXECUTION_REPORT + FINDINGS + REVIEW + TEST_REPORT), write `FOREMAN_REVIEW.md` per its template. Include 2 author-skill + 2 executor-skill improvement proposals.
5. Final commit: `chore(spec): close STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15 — FOREMAN_REVIEW + master-doc updates`.

## Master-Doc Updates (mandatory at close)

Per Integration Ceremony rules + SPEC §3 #25–#28:

- `MASTER_ROADMAP.md` §3 — append one-line entry for 2026-05-15 STOREFRONT_PUBLIC_DATA_LAYER closure.
- `docs/GLOBAL_MAP.md` — Views section: 8 view entries reflect new `FROM` source. New "Public Data Layer" section registers the 6 entities.
- `docs/GLOBAL_SCHEMA.sql` — append the 6 new tables + 6+2 trigger functions + 6+2 triggers + 18 policies + 6 grants + 8 view rewrites.
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — replace top "Current Status" with this SPEC's outcome.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — append 2026-05-15 section with commit range.
- `OPEN_TASKS.md` — close STOREFRONT_PUBLIC_DATA_LAYER + retire HOTFIX_4 stub officially.
- `docs/PUBLIC_DATA_LAYER.md` — NEW canonical reference, ≤200 lines, sections per SPEC §3 #24.

## What You Do NOT Do

- Do NOT merge to `main`. CLAUDE.md §9 #7 — only Daniel authorizes that, and not via this pipeline.
- Do NOT touch storefront frontend code. The 8 view contracts are inviolable.
- Do NOT skip backups (Working Rule 9 + Brief §12 + SPEC §3 #3 — automatic trigger on schema change).
- Do NOT run migrations in parallel across the 6 tables. Strict serial order.
- Do NOT batch demo + Prizma into one commit. Per-tenant per-stage commits — Prizma needs forensic-grade history.
- Do NOT bypass `npm run verify:integrity` or the Iron Rule 32 hook with `--no-verify`.
- Do NOT widen scope. The 6 entities + 8 view rewrites + 6+1 REVOKEs are the contract. If you find a 7th anon-leak that is not in §3, log it as a finding, do not fix it in this SPEC.
- Do NOT silently absorb deviations. Per CLAUDE.md §9 + Bounded Autonomy: STOP on deviation, not on success.
- Do NOT make a final report to the user that says "all done" when in fact the pipeline halted at any STT — write the escalation file and emit ONE Hebrew line.

## Communication With Daniel (the user)

Daniel is NOT a developer and reads Hebrew. Updates to him are short, in Hebrew, and contain ONLY:
- What just closed (one sentence).
- Where we are in the 11-commit plan.
- Next gate.

Examples (good):
> "Commit 2 sgur — demo: branches+config+media. backfill match 1+1+276. trigger E2E 9/9 PASS. עובר ל-brands+images+inventory."
> "Commit 8 sgur — Prizma: 8 views נחתמו ב-security_invoker=on. anon row counts הולמים את הbaseline. עובר ל-REVOKE."

NEVER include: SQL snippets, file paths, function signatures, line counts, error stack traces. Those go in EXECUTION_REPORT, not the chat.

## End-of-Pipeline Final Report

Once `chore(spec): close ...` is pushed, emit ONE final Hebrew line to Daniel + a 3-bullet summary:

> "STOREFRONT_PUBLIC_DATA_LAYER נסגר 🟢/🟡 — F-CRIT-2 ירד מ-8 ל-0, 6 טבלאות mirror live ב-demo+Prizma, smoke 7/7 PASS post. ה-FOREMAN_REVIEW + Pull-Request מוכנים. צריך אישור שלך למיזוג ל-main."

3 bullets:
- F-CRIT-2 advisor delta (8 → 0 expected).
- Latency delta on `v_storefront_products` (480ms baseline → ?ms post; expected <100ms after AI-column caching).
- Trigger E2E + cross-tenant leak probe results.

Then: STOP. Do NOT propose merge to main yourself. Wait for Daniel.

# <<< EXECUTOR ACTIVATION (paste above this line) <<<

---

## Foreman notes (not part of the activation prompt)

This activation prompt is the contract handoff from Foreman to the Pipeline. The Foreman has done all the SPEC-author work — pre-flight, Pattern decision, scope freeze, success criteria, destructive-op declaration, STT enumeration, lessons harvest. The Executor's job is execution discipline + the chain handoffs.

If the Pipeline returns 🔴 REOPEN, the Foreman re-authors the SPEC; the Activation Prompt above is rewritten. If it returns 🟡, the FOREMAN_REVIEW captures the follow-ups (likely candidates: a Standard-tier shared-storefront SPEC consuming this layer; a `tenants_public` projection for tighter contract; a Supplier Portal `supplier_*_public` projection per Brief §10).

Ready for Daniel's go-ahead to launch the Pipeline.
