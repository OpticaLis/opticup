# Agent Chain Protocol — Optic Up SPEC Execution

> **Purpose:** define exactly how a SPEC moves from Foreman → Executor →
> Reviewer → **Localhost-Tester** → back to Foreman. Established 2026-05-10
> as part of the safety-infrastructure layer (Task 3 in OPEN_TASKS).

## The Chain

```
                       opticup-strategic
                       (Foreman: SPEC author)
                                │
                                ▼
                        opticup-executor
                        (Executor: implements SPEC)
                                │
                                ▼
                        opticup-reviewer
                        (Reviewer: code, security, Iron Rules)
                                │
                                ▼
                   opticup-localhost-tester
                   (Tester: runtime smoke + TEST_REPORT.md)
                                │
                                ▼
                       opticup-strategic
                       (Foreman: FOREMAN_REVIEW.md + skill self-improvement)
                                │
                                ▼
                    opticup-architect
                    (Architect — escalation only)
```

## What Each Agent Owns

| Agent | Owns | Writes | Skips When |
|-------|------|--------|------------|
| opticup-strategic (Foreman) | SPEC.md, FOREMAN_REVIEW.md | both | n/a — every SPEC has both |
| opticup-executor | code changes, EXECUTION_REPORT.md, FINDINGS.md | both | n/a — every SPEC produces both |
| opticup-reviewer | review notes (in EXECUTION_REPORT or sibling file) | review notes | when SPEC is doc-only with no code change |
| opticup-localhost-tester | TEST_REPORT.md | TEST_REPORT.md | when SPEC is doc-only OR cannot reach localhost |
| opticup-architect | escalation ladder (Tier 2 in 3-tier autonomy) | DECISIONS_LOG entries | when nothing escalates above the Foreman |

## Hand-off Rules

**Foreman → Executor:** SPEC.md exists, has acceptance criteria, has
preflight section. Executor reads SPEC end-to-end before any change. If
preflight catches author bugs (per Pattern P28) — Executor STOPS and
reports back to Foreman; Foreman amends SPEC; chain resumes.

**Executor → Reviewer:** EXECUTION_REPORT.md + FINDINGS.md complete; all
expected outputs from SPEC verified; commits made on develop. Reviewer
focuses on Iron Rules, RLS, security, and pattern conformance.

**Reviewer → Tester:** Reviewer's notes are written and at least
"Approved" or "Approved with notes". A "Rejected" review goes back to
Executor (not to Tester).

**Tester → Foreman:** TEST_REPORT.md written.
- Status GREEN → Foreman writes FOREMAN_REVIEW.md and (per
  opticup-strategic skill) extracts 1–2 self-improvement proposals.
- Status RED → Foreman triages: was it env (start-local.ps1), data
  (demo tenant), or code (Executor missed something)? Foreman either
  re-opens the SPEC for Executor or escalates upward to Architect.

**Foreman → Architect:** only when the issue cannot be resolved at
Foreman level (cross-module decision, brief deviation, blocker that
needs Daniel). Architect stays out of single-module loops.

## Escalation Triggers

The Tester escalates to the Foreman when ANY of these happens:

- Baseline smoke fails (any of tests 1–7).
- A SPEC-specific test fails.
- start-local.ps1 cannot bring both servers up within 30 seconds.
- A cleanup operation fails (e.g. test-2 record cannot be deleted).
- TEST_REPORT.md cannot be written (write permission, disk space).

The Foreman escalates to Architect when ANY of these happens:

- Smoke failure root-cause crosses module boundaries (touches contracts).
- Cumulative deviation from the Brief / Master Plan exceeds the SPEC's
  scope.
- A new strategic decision is needed (Daniel-level only).

## The Snapshot/Rollback Layer

`scripts/snapshot.mjs` provides:

- `create <SPEC_SLUG>` — git tag `pre-spec-{SLUG}-{ISO_TS}` of HEAD;
  refuses if working tree is dirty.
- `rollback <TAG> [--force]` — `git reset --hard <TAG>`; refuses dirty
  tree without `--force`.
- `list` — show prior snapshots from `snapshots/log.json`.

Snapshots are taken **before** the Executor commits. Either the Foreman or
the user (Daniel) creates them; the Tester does not create or roll back
unless explicitly instructed.

In v1 only git is snapshotted. Supabase branch snapshots are deferred to
v2 — see TODO at the bottom of `scripts/snapshot.mjs`.

## Iron Rules in the Chain

These rules cross every agent in the chain:

- **Iron Rule 31 (integrity gate)** — runs at every commit. Any agent
  that commits passes through this gate.
- **Iron Rule 14 / 15 / 18** — every code or DB change must respect
  tenant_id, RLS, UNIQUE-with-tenant. The Reviewer verifies; the Tester
  catches RLS leaks via test-6.
- **Demo tenant only** for runtime tests. Never Prizma.
- **No `git add -A`, no `git push --no-verify`.** All chain commits use
  named-file `git add` and pre-commit hooks must pass.

## Where to Read Each Agent's Skill

| Skill | Path |
|-------|------|
| opticup-architect | `.claude/skills/opticup-architect/SKILL.md` |
| opticup-strategic (Foreman) | `.claude/skills/opticup-strategic/SKILL.md` |
| opticup-executor | `.claude/skills/opticup-executor/SKILL.md` |
| opticup-reviewer | `.claude/skills/opticup-reviewer/SKILL.md` |
| opticup-localhost-tester | `.claude/skills/opticup-localhost-tester/SKILL.md` |

## Status

This protocol is **active** as of 2026-05-10. It supersedes the prior
3-agent chain (Foreman → Executor → Reviewer → Foreman) by inserting the
Tester step. Every SPEC written from this date forward is expected to flow
through all 5 agents.

Older SPECs (pre-2026-05-10) closed without a TEST_REPORT.md are
grandfathered — they remain valid and do not need retroactive testing.
