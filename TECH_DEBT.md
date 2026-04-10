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

### #2 — 🟢 scripts/README.md mixes two unrelated topics

**Where:** `scripts/README.md` currently contains InventorySync watcher docs
(pre-existing, ~77 lines) appended with verify system docs (~65 lines) = 142
lines mixed.

**Why it's debt:** Two unrelated systems in one doc file violates the "one
responsibility per file" spirit of Iron Rule 12, and makes the doc harder to
scan.

**Why not fixed now:** Phase 0 is additive. Splitting is pure cleanup, out of
0A/0B scope.

**Planned fix:** Split into `scripts/README-sync-watcher.md` (legacy content) +
`scripts/README-verify.md` (verify system), delete `scripts/README.md`, update
any references.

**Effort:** ~15 min.

### #3 — 🟢 Phase 0A baseline violations snapshot (not to be fixed in Phase 0)

**Where:** ERP repo at commit `4849d6f` (Phase 0A complete), run of
`node scripts/verify.mjs --full`.

**Snapshot:** 417 violations, 39 warnings.

**Breakdown:** Nearly all violations are file-size on historical `archive/` HTML
files (`archive/index_V1.*A.html`, 10+ files at 1700–2500 lines each) and
`css/employees.css` at 397 lines. All 39 warnings are active JS files in the
300–349 line range. Zero violations on rule-14, rule-15, rule-18 (no SQL
migrations exist under `migrations/` in ERP yet). Zero violations on rule-21
(after resolving the intra-check collision during 0A). Zero on rule-23.

**Why it's debt:** These represent real tech debt but are out of Phase 0 scope
per Plan Decision 5.

**Why not fixed now:** Phase 0 detects, it does not fix. Each cluster should be
addressed in its own targeted cleanup:
- `archive/` cluster → either move to a top-level archive at repo root with
  `.gitignore` exclusion from verify, or delete entirely if no longer needed
- `css/employees.css` → split by concern
- 39 JS warnings → address individually when each module is next touched in
  regular work

**Effort:** Variable, estimated 4–8 hours total across multiple small cleanup
commits.

### #4 — 🟢 Credentials helper environment scaling

**Where:** `scripts/lib/load-env.mjs` + `$HOME/.optic-up/credentials.env`

**Current state:** Single environment (current Supabase project). Helper reads
`$HOME/.optic-up/credentials.env` directly with no env argument.

**When this becomes debt:** On the day a second Supabase environment arrives —
staging, alt-production, or enterprise-customer-isolated DB — credentials need
to be keyed by env name. NOT when a second tenant arrives (multi-tenancy in
Optic Up is RLS on the same Supabase, not separate credentials).

**Planned migration:**
1. Helper gains optional `ENV_NAME` argument (default: `'prod'`)
2. File renamed to `credentials-<env>.env` (migrate current file to
   `credentials-prod.env`)
3. Callers pass their env name (`schema-diff.mjs` gets a `--env` flag)
4. Storefront repo helper updated in parallel for consistency

**Effort:** ~5 lines of code + ~15 min docs. Trivial when it happens.

**Why not now:** YAGNI. Building it before there's a second environment adds
complexity with zero payoff.

---

## Resolved Debt

_(none yet)_

---

## How to Use This File

- Before starting work, scan Active Debt for items that touch your area.
- When you fix a debt item, move it to Resolved Debt with the date and commit.
- When you discover new debt, add it here with a priority tag.
- One authoritative location per item — do not duplicate in CLAUDE.md or elsewhere.
