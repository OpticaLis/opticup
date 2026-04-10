# Tech Debt — Optic Up ERP

> Known issues not yet fixed. Each item explains what, where, why, and the planned fix.
> Priority: 🔴 = blocks next milestone, 🟡 = should fix soon, 🟢 = minor / cosmetic.

---

## Active Debt

### #1 — 🔴 ERP credentials are single-tenant-assumed

**Where:** Currently there is no `.env` in the ERP repo. Phase 0B's schema-diff
will need Supabase credentials supplied via PROCESS ENVIRONMENT VARIABLES only —
not a committed `.env` file, not a file inside the ERP working directory.
Acceptable sources: (i) inline `export` before local runs, (ii) a file outside
both repos (e.g. `$HOME/.optic-up.env`) loaded by a helper, (iii) GitHub Secrets
in CI.

**Why it's debt:** The current model assumes one tenant (Prizma) and one
developer machine. When a second optical chain joins, there is no centralized
per-tenant credentials scheme. Each new tenant onboarding will require ad-hoc
manual credential handling.

**Why not fixed now:** Phase 0 is about building verification rails, not
re-architecting the credentials model. The process-env-only rule (set in 0B) is
sufficient to keep secrets out of the repo until a proper scheme is designed.

**Planned fix:** Design a per-tenant credentials consolidation scheme before
onboarding tenant #2. Options to evaluate: central vault, Supabase-managed
tenant config, or GitHub Environments. Out of scope until tenant #2 is on the
horizon.

**Effort:** ~4-6 hours design + implementation when the time comes.

---

## Resolved Debt

_(none yet)_

---

## How to Use This File

- Before starting work, scan Active Debt for items that touch your area.
- When you fix a debt item, move it to Resolved Debt with the date and commit.
- When you discover new debt, add it here with a priority tag.
- One authoritative location per item — do not duplicate in CLAUDE.md or elsewhere.
