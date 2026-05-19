# FOREMAN_REVIEW — M4_CONFIG_SYNC_INFRASTRUCTURE

**Foreman closing:** overnight session, 2026-05-19.
**Commits:** `0f50d86` (single commit).
**Status:** 🟢 SPEC CLOSED. Verification 10/10. Reviewer approved with 0 blockers.

---

## 1. What this SPEC accomplished

Established the M4 demo↔Prizma config-parity discipline as infrastructure:
- Iron Rule 33 in CLAUDE.md §6.
- 2 working scripts (sync + promote) with proper safety rails.
- Allowlist file enumerating today's known demo-only state.
- Sentinel Mission 11 protocol doc (impl deferred).
- Shared helpers library to satisfy Iron Rule 21 (extracted mid-execution).

Wall-clock: ~30 minutes (under Brief's 3-4h estimate — tests deferred per F-1).

## 2. Lineage to the QA report

Surface 1 / Finding 1.2 of `_archive/m4-qa-2026-05-18/M4_FULL_QA_REPORT_2026_05_18.md` identified that messages drop silently because the template variable resolver doesn't supply `event_day_of_week`, `event_deposit_amount`, `event_max_attendees`. That's the work of SPEC 3 (`M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX`).

But the QA also surfaced that demo and Prizma had drifted in their config layer (7 templates DIVERGED, 6 demo-only, 1 Prizma-only). Without parity, a fix tested on demo doesn't prove it works on Prizma. **This SPEC closes the parity gap as a permanent discipline** — every future M4 fix benefits.

## 3. Verification matrix

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Sync script runs --dry-run cleanly | ✅ | `node scripts/sync-prizma-config-to-demo.mjs --dry-run` exit 0 |
| 2 | Promote script exits non-zero without required flags | ✅ | `node scripts/promote-config-to-prizma.mjs` exit 2 |
| 3 | CLAUDE.md contains Iron Rule 33 | ✅ | grep confirmed |
| 4 | Allowlist contains 6 template slugs + 6 rule names | ✅ | `scripts/checks/demo-config-allowlist.json` |
| 5 | Sentinel mission 11 file exists | ✅ | `docs/guardian/sentinel/mission-11-config-parity.md` |
| 6 | `verify.mjs --staged` passes | ✅ | commit hook clean, 0 violations |
| 7 | Smoke 7/7 PASS | ✅ | `npm run smoke` post-commit |
| 8 | No DB writes from SPEC 1 execution | ✅ | only SELECT queries during dry-run |
| 9 | FILE_STRUCTURE.md registers new files | ✅ | 4 entries added |
| 10 | SPEC §"Destructive Operations" declares None. | ✅ | explicit in SPEC.md |

## 4. Skill-harvest proposals (per master prompt §"Final report")

### Author tier (opticup-strategic skill improvements)

**Proposal A-1 — Pre-plan helper extraction.**
When SPEC includes ≥ 2 scripts in same domain, Foreman should pre-declare which helpers are shared and where they live. Today F-2 surfaced as a mid-execution refactor. The improvement: add to opticup-strategic skill's authoring checklist a step "If multiple scripts in same domain, identify shared helpers and pre-declare their location in §2.1 file inventory." This would have saved ~5 min and one round-trip.

**Proposal A-2 — Diff-out flag for SPEC 2.**
The master prompt's SPEC 2 override calls for saving the diff to `_archive/m4-overnight-2026-05-18/sync-diff.txt` BEFORE applying. Foreman of SPEC 1 added `--diff-out=<path>` as an undeclared bonus flag to support this. The improvement: opticup-strategic should normalize "follow-up SPEC needs to read this SPEC's output → declare the output path/flag upfront in this SPEC." Add to the chained-SPEC pattern in the skill.

### Executor tier (opticup-executor skill improvements)

**Proposal E-1 — Iron Rule 21 pre-scan.**
Executor wrote both scripts before realizing they shared 5 helper functions. The improvement: add to opticup-executor's "before commit 1" checklist a step "for any commit that adds ≥ 2 source files in same dir, run `node scripts/checks/rule-21-orphans.mjs` (or equivalent ad-hoc grep) BEFORE staging." This is an executor-side cheap check that surfaces the issue before the pre-commit hook.

**Proposal E-2 — Tool-result truncation handling pattern.**
Twice this session (yesterday's QA + tonight's automation-engine fetch) Supabase MCP `get_edge_function` returned content too large for inline. Both times Executor fell back to python-parsing the auto-saved tool-result file. The pattern is now well-established but not documented in opticup-executor. The improvement: add a reference recipe "For MCP responses > 80KB: harness auto-saves to `tool-results/*.txt`. Parse via python read+json.loads. Save extracted content to target location."

## 5. Open follow-ups

- `M4_CONFIG_PARITY_RUN_1` (SPEC 2 of the overnight chain) — runs the sync script with `--allow-destructive --confirm-destructive=YES-I-READ-THE-DIFF --apply --diff-out=...`. Expected diff: 1 insert, 8 updates, 0 deletes, 12 preserved. STOP if observed diff > 10% beyond this baseline per master prompt §"SPEC-specific overrides".
- `M4_CONFIG_SYNC_SCRIPT_REGRESSION_TEST` — F-1 from FINDINGS. Adds `tests/smoke/sync-script-test.mjs`.
- `SENTINEL_MISSION_11_IMPL` — F-4 from FINDINGS. Adds the actual runner referenced by `docs/guardian/sentinel/mission-11-config-parity.md`.
- Future Hebrew-language UX polish for diff output (N-1 in REVIEW).

## 6. Rollback path (if needed)

`git revert 0f50d86` — single-commit revert. No DB rows mutated by SPEC 1, so no data restoration needed. Iron Rule 33 reverts atomically with the commit.

## 7. Outcome statement

🟢 SPEC sealed. Iron Rule 33 live. Infrastructure ready for SPEC 2.
