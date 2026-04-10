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

### #5 — 🟡 information_schema inaccessible via Supabase REST

**Where:** `scripts/schema-diff.mjs` (Phase 0B), and any future schema
introspection script in either repo.

**Current state:** Supabase REST API does not expose
`information_schema.tables` / `information_schema.views` / `pg_policies`.
`schema-diff.mjs` falls back to probing each declared table individually via
`.from('<name>').select('*', { head: true })`. This works for declared→live
validation (catches columns missing from live, or column drift on declared
tables) but is one-directional — it CANNOT detect tables, views, or policies
that exist in the live DB but aren't declared in `GLOBAL_SCHEMA.sql`. View body
comparison is also impossible.

**Why it's debt:** Phase 0B achieves ~80% of the schema-diff goal. The missing
20% is live-side extras: shadow tables, undocumented views, unlisted RLS
policies. An undetected live-side extra could be legitimate-but-undocumented
infrastructure, an abandoned experiment, or in the worst case a
security-relevant misconfiguration (e.g., a table without RLS that was added
outside the normal migration flow).

**Why not fixed now:** Two viable paths exist, neither cheap:
- **Option A:** Deploy a read-only Supabase Edge Function that queries
  `information_schema` and returns JSON. `schema-diff.mjs` calls it instead of
  REST probing. Pros: service role stays server-side. Cons: new Edge Function to
  maintain, deployment overhead.
- **Option B:** Direct pg connection from `schema-diff.mjs` using
  `SUPABASE_SERVICE_ROLE_KEY` via a pg client (`pg` or `postgres` libs). Pros:
  simpler. Cons: adds a new dependency, needs service role key in CI secrets,
  broader credential footprint.

Phase 0 decided on regex + REST as MVP (Decision 2). Upgrade is Phase 0.5
material at the earliest.

**Planned fix:** Decide between Option A / Option B when Phase 0.5 starts OR
when a real drift incident exposes the gap — whichever comes first.

**Effort:** ~2-3 hours for Option A, ~1 hour for Option B, + testing.

### #6 — 🟡 GLOBAL_SCHEMA.sql declares zero views (rails gap, not doc gap)

**Where:** `docs/GLOBAL_SCHEMA.sql` (2413 lines) declares tables + RLS policies
but NO view definitions.

**Current state:** All storefront-facing views (`v_storefront_products`,
`v_storefront_brands`, `v_storefront_brand_page`, `v_storefront_categories`, and
others) exist in the live DB but are not in `GLOBAL_SCHEMA.sql`.
`schema-diff.mjs` cannot detect view drift — there is nothing to compare
against.

**Why it matters (architectural, not documentation):** Views are the contract
layer between ERP and Storefront. Rule 13 of the ERP `CLAUDE.md` and Rule 24 of
the Storefront `CLAUDE.md` both enforce "storefront reads ONLY from views".
Without views in `GLOBAL_SCHEMA.sql`, schema-diff is structurally blind to view
drift. Since Rule 13/24 enforces views-only reads from external consumers, an
undocumented view failure is a silent contract break. **This is a gap in rails
coverage, not a documentation miss.** A view can be altered, dropped, or
replaced in live DB and no automated check would catch it until the storefront
starts returning wrong data to end users.

**Why not fixed now:** Extracting all current view definitions from live DB
(which requires solving #5 first OR doing manual extraction via Supabase
Dashboard), reviewing each, and placing them in `GLOBAL_SCHEMA.sql` in the
correct dependency order (views that reference other views must come later in the
file) is a 2-hour task minimum. Out of Phase 0 0A-0F scope. Belongs in Phase 0.5
or a dedicated view consolidation task.

**Planned fix:**
1. (Requires #5 resolved OR manual extraction) Query `pg_views` for all views
   in the public schema
2. Extract each view's definition (SELECT body + WHERE clause + column aliases)
3. Add definitions to `GLOBAL_SCHEMA.sql` in dependency order
4. Re-run `schema-diff.mjs` — should now detect view drift at the existence
   level
5. (Optional enhancement) Extend `schema-diff.mjs` to compare view bodies, not
   just existence. Body comparison is noisy but catches WHERE clause drift — a
   known issue for this project.

**Effort:** ~2 hours for steps 1-4. Step 5 is another ~1-2 hours and is
optional.

**Risk if ignored:** A view WHERE clause change that accidentally filters out
products, brands, or categories would ship to production undetected. This is
Fragile Area #1 (images view) repeating itself for other views.

### #7 — 🟢 verify.mjs warnings exit policy inconsistent between ERP and Storefront

**Priority:** 🟢 LOW

**Where:**
- ERP: `scripts/verify.mjs` — warnings-only path returns exit 0 (deliberate,
  with inline `// Warnings are advisory — do not block commits (exit 0)` comment)
- Storefront: `scripts/verify.mjs` — warnings-only path returns exit 2 (matches
  0A spec)

**Current state:** The Phase 0A plan specified exit 2 on warnings-only as the
blocking policy. The Storefront `verify.mjs` (built in Phase 0C) correctly
implements this. The ERP `verify.mjs` (built in Phase 0A) deviates and returns
exit 0 on warnings-only. Both behaviors were independently correct at the time of
their respective phases — the discrepancy was only discovered during Phase 0D
when both implementations were compared.

**Why it matters:** CI (Phase 0E) will run `verify.mjs --full` on both repos. If
the two repos use different exit codes for the same condition (warnings-only), CI
policies must either:
  (a) Accept inconsistency and document it per-repo, OR
  (b) Harmonize to one policy (probably exit 2 = "warnings block CI but not
  pre-commit hooks" OR exit 0 = "warnings are always advisory")
Currently (a) is the de facto state. Neither behavior is wrong in isolation —
both are defensible — but the inconsistency will cause confusion when someone
reads one repo's `verify.mjs` expecting the behavior of the other.

**Why not fixed now:** Harmonizing is a policy decision, not a code fix. Either
direction requires a one-line change. The question is which direction, and that
is best decided when CI is being configured in Phase 0E — at which point the
preferred policy will be informed by how CI wants to treat warnings.

**Planned fix:** In Phase 0E or immediately after, pick one policy and apply it
to both repos. If unclear, default to exit 2 on warnings (0A spec) and let
pre-commit hooks skip warnings-check via an env var or flag if they're too noisy.

**Effort:** ~5 minutes of code change after the policy decision is made.

---

## Resolved Debt

_(none yet)_

---

## How to Use This File

- Before starting work, scan Active Debt for items that touch your area.
- When you fix a debt item, move it to Resolved Debt with the date and commit.
- When you discover new debt, add it here with a priority tag.
- One authoritative location per item — do not duplicate in CLAUDE.md or elsewhere.
