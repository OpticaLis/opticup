You are running a Full-Auto Pipeline SPEC for the Optic Up project. Read the Brief at:

`modules/Module 4 - CRM/architecture-brief/M4_CONFIG_SYNC_INFRASTRUCTURE_BRIEF.md`

Author the SPEC (`opticup-strategic` skill — Foreman role), then execute via the standard Pipeline chain: Foreman → Executor → Reviewer → Localhost-Tester → Foreman close.

**Pre-conditions to verify before starting:**

1. `git status` clean on develop.
2. The M1 lens-catalog Pipeline lock file at `_archive/pipeline-sessions/2026-05-18T16-09-48-483Z_M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_executor-2a.lock` no longer exists (M1 has closed).
3. `npm run verify:integrity` exit 0.
4. Smoke 7/7 PASS on demo (`tests/smoke/baseline.test.mjs`).
5. Claim a Pipeline lock per CLAUDE.md §9 (`scripts/pipeline-coordination.mjs claim --spec-slug=M4_CONFIG_SYNC_INFRASTRUCTURE`).

If any pre-condition fails, STOP and emit one Hebrew line to Daniel naming the failure.

**Read the audit context:** before authoring the SPEC, read `_archive/m4-qa-2026-05-18/M4_FULL_QA_REPORT_2026_05_18.md` end-to-end. The audit established the drift baseline (row counts + 7 DIVERGED templates + 6 demo-only QA templates + 1 Prizma-only). Use that as Foreman's `## 0. Reality Check` baseline.

**Deliverables per the Brief §2:**

1. `scripts/sync-prizma-config-to-demo.mjs`
2. `scripts/promote-config-to-prizma.mjs`
3. `CLAUDE.md` Iron Rule 33 in §6
4. `scripts/checks/demo-config-allowlist.json`
5. `docs/guardian/sentinel/mission-11-config-parity.md`
6. `tests/smoke/sync-script-test.mjs` (regression tests per Risk 1)
7. `docs/FILE_STRUCTURE.md` updates (4 new entries)

**Constraints (non-negotiable):**

- This SPEC creates scripts but does NOT execute them. The first sync run is a SEPARATE SPEC (`M4_CONFIG_PARITY_RUN_1`) that the next Architect Pipeline ships. Do not run `sync-prizma-config-to-demo.mjs` against live data.
- §4 Destructive Operations: `None.` declared. Honor it.
- Demo tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb` and Prizma tenant: row counts must be byte-identical pre/post this Pipeline (no row writes by this SPEC's execution itself).
- Iron Rules 12 (file size ≤350 lines) — split scripts if needed.
- Iron Rule 31 (integrity gate) — every commit.
- Iron Rule 32 (destructive ops declared) — enforced.

**When done, emit one Hebrew line to Daniel:**

> "M4_CONFIG_SYNC_INFRASTRUCTURE 🟢 נסגר. [N] commits, [M] Iron Rule violations 0. הסקריפטים מוכנים. SPEC הבא: M4_CONFIG_PARITY_RUN_1."

Read the Brief and start.
