# Tech Debt — Optic Up ERP

> Known issues not yet fixed. Each item explains what, where, why, and the planned fix.
> Priority: 🔴 = blocks next milestone, 🟡 = should fix soon, 🟢 = minor / cosmetic.

---

## Active Debt

### #M1_INV_REDESIGN_VIEW_REVOKE_BROADENING — 🟢 v_inventory_unified_log authenticated has ALL privileges, not just SELECT

**Where:** Live DB — `pg_class.relacl` for `public.v_inventory_unified_log` shows `{authenticated=arwdDxtm/postgres}`. Surfaced by `M1_INVENTORY_REDESIGN/REVIEW.md` R-FINDING-1 (2026-05-16).

**What:** SPEC §2.4 view body said "GRANT SELECT ON … TO authenticated". Postgres's default-inherit on new public-schema views grants ALL (INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) to authenticated. The C5+C6 migration added `REVOKE ALL FROM anon, PUBLIC` (per executor's INTENT-vs-LITERAL recovery, EXECUTION_REPORT §3 D-2) but didn't broaden to REVOKE write-class from authenticated too.

**Why it's debt (and only 🟢):** UNION ALL views are non-updatable at the Postgres engine level — INSERT/UPDATE/DELETE/TRUNCATE attempts against the view fail with `cannot insert into view` regardless of GRANT. So the effective access is "SELECT works, everything else fails at engine." Real exploit path: zero. Defense-in-depth tidiness only.

**Planned fix:** Next M1 maintenance SPEC. 1-line migration: `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.v_inventory_unified_log FROM authenticated;`. Bundle with #M1_INV_REDESIGN_ORPHAN_SYSTEMLOG below. ~5 min total.

**Source:** `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_REDESIGN/REVIEW.md` R-FINDING-1 + `FOREMAN_REVIEW.md` §5, 2026-05-16.

---

### #M1_INV_REDESIGN_ORPHAN_SYSTEMLOG — 🟢 Orphan tab-systemlog section + system-log.js after sidebar redesign

**Where:** `inventory.html` lines ~377-435 (`<section id="tab-systemlog">` block) + `modules/admin/system-log.js` (217 lines) + the `<script src="modules/admin/system-log.js">` tag in `inventory.html` script section. Surfaced by `M1_INVENTORY_REDESIGN/FINDINGS.md` F-4 (2026-05-16).

**What:** C2 of M1_INVENTORY_REDESIGN removed the `<button data-tab="systemlog">` from `<nav id="mainNav">`. C5+C6 added the new `<section id="tab-unified-log">` driven by the new sidebar entry. The legacy `<section id="tab-systemlog">` block + its JS file are now unreachable but still on disk per SPEC §6 #10-#11 explicit deferral (one concern per task — out of scope to clean inline).

**Why it's debt (and only 🟢):** Pure orphan — not reachable from UI, not loaded by any other module. Will surface in next Sentinel refresh as a docs-drift candidate but has zero customer impact.

**Planned fix:** Next M1 maintenance SPEC. Delete the `<section id="tab-systemlog">` block (~58 lines), the `<script src="modules/admin/system-log.js">` line, and `modules/admin/system-log.js` itself (217 lines). Bundle with #M1_INV_REDESIGN_VIEW_REVOKE_BROADENING above. ~15 min total.

**Source:** `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_REDESIGN/FINDINGS.md` F-4 + `FOREMAN_REVIEW.md` §5, 2026-05-16.

---

### #M1A-DEBT-04 — 🟢 Demo lens-catalog seed fixtures persist from M1A_OPERATIONS_RPCS_FIX

**Where:** demo tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb` — 2 `tenant_location` rows (short_codes `STA`/`STB`) + 1 global `lens_brand` `SmokeBrand_M1A` + 1 `lens_design` `SmokeDesign_M1A` + 1 `lens_variant` `LV-TST001` + 1 `supplier_catalog_offering` (100 ILS) + ~4 `stock_movement` rows + ~3 `stock_lot` rows + 1 `purchase_receipt` row, all tagged `notes ILIKE '%M1A%smoke%'` (where the `notes` column exists).

**What:** Functional smoke for `M1A_OPERATIONS_RPCS_FIX` discovered that demo had ZERO `tenant_location` rows, ZERO published `lens_variant` rows, and ZERO `supplier_catalog_offering` rows on the lens substrate. Phase 1A's smoke (a single `INSERT lens_brand` + cross-tenant SELECT + DELETE) had never seeded a runnable demo substrate. Without fixtures, the §14 smoke could not execute end-to-end. Executor seeded minimal fixtures inline (under "smoke on demo" envelope) and persisted them for Phase 1B re-use.

**Why it's debt:** The fixtures persist on demo. Two acceptable resolutions for Phase 1B opening: (a) reuse the persistent fixtures as Phase 1B's first-smoke seed (zero extra work), OR (b) replace with a proper `modules/Module 1 - Inventory Management/scripts/seed-demo-lens-fixtures.sql` so the seed is reproducible from clean state. Status quo (persistent fixtures) is fine for Phase 1B's local smoke needs; only matters when Phase 1B's own SPEC §0 chooses an approach.

**Why not fixed in M1A_OPERATIONS_RPCS_FIX:** Brief §11 "scope change requested (anti-pattern)" — a seed-script SPEC is its own scope.

**Planned fix:** Phase 1B SPEC §0 explicitly cites one of (a) or (b). If (b), author the seed script as part of that SPEC's commit plan.

**Source:** `modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/FINDINGS.md` items F-3 + F-8 (2026-05-15) + `FOREMAN_REVIEW.md` findings processing.

---

### #RULE18-COMMENT-FALSE-POSITIVE — 🟢 rule-18-unique-tenant.mjs matches `(NNN)` inside SQL comments

**Where:** `scripts/checks/rule-18-unique-tenant.mjs` — `UNIQUE_RE = /UNIQUE\s*\(([^)]+)\)/gi`. Surfaced by `M1A_DEBT_SWEEP` (2026-05-15) FINDINGS-03.

**What:** The case-insensitive regex matches `unique(NNN)` patterns inside `-- ...` line comments AND `/* ... */` block comments. Currently 1 known occurrence — `modules/Module 1 - Inventory Management/docs/db-schema.sql` originally had `-- partial unique (022)` at line 767 which tripped as `UNIQUE(022)`. M1A_DEBT_SWEEP worked around it with a 2-char comment edit (`(022)` → `, migration 022`) within the same commit that fixed 4 real rule-18 violations.

**Why it's debt:** The workaround is local to one file. Future SPECs touching other module SQL doc files may hit similar narrative-comment false positives. The systemic fix is a 2-line hook patch.

**Why not fixed in M1A_DEBT_SWEEP:** Brief §8 anti-pattern explicitly forbade "while-we're-here" scope expansion. Bundling a rule-18 hook fix would have expanded VERIFY_HOOKS_REGEX_FIXES (which was already scoped to rule-15 + rule-21) and triggered the Brief's stated anti-pattern.

**Planned fix:** Strip line comments + block comments from `content` before applying `UNIQUE_RE`. Sketch:
```js
const stripped = content
  .split('\n')
  .map(l => l.replace(/--.*$/, ''))  // strip line comments
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, ''); // strip block comments
let match;
UNIQUE_RE.lastIndex = 0;
while ((match = UNIQUE_RE.exec(stripped)) !== null) { /* ... */ }
```
Self-test: synthetic .sql file with `-- partial unique (022)` returns 0 violations.

**Effort:** ~15 min hook patch + 5 min self-test. Recommended before Phase 1B starts (Phase 1B's customer-facing screen SPECs may touch shared SQL doc files).

**Source:** `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/FINDINGS.md` Finding M1A-SWEEP-FINDINGS-03 (2026-05-15).

### #M2-DEBT-LOGO-PATH-CANONICALIZATION — 🟢 12 of 13 Prizma tenant-logos at legacy paths

**Where:** Supabase Storage bucket `tenant-logos`. Audit captured during `SECURITY_HOTFIX_2026_05_13` §6.8 pre-step (2026-05-13).

**What:** 13 logo files in the bucket. Only 1 file is at the canonical `<tenant_id>/<filename>` convention (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c/logo.png`). The other 12 use legacy prefixes: 8 at `brands/<tenant_id>/<filename>` (brand-gallery uploads from earlier Module 3 work) and 4 at `tenants/<tenant_id>/<filename>` (versioned `site-logo_<timestamp>.png` uploads). Demo has 0 logos.

**Why it's debt:** The `SECURITY_HOTFIX_2026_05_13` §6.8 storage policy was made **legacy-path-compatible** (accepts tenant_id at folder index `[1]` OR — after a `brands`/`tenants` prefix — at index `[2]`) precisely because Brief §5.3 forbade Prizma data writes during that hotfix. The policy as written is correct and secure for both conventions; the debt is purely architectural hygiene — having three path conventions in one bucket invites future bugs when adding a tenant or a new upload flow.

**Why deferred:** Backfill requires moving 12 storage objects + updating FK references in `brands.logo_url` (8 files) and any other consumer of the legacy paths. That's data-migration territory, not security. Owns its own SPEC.

**Planned fix:** Future SPEC `M2_TENANT_LOGOS_PATH_CANONICALIZATION` (small, 1-day scope) — enumerate consumers via grep across opticup + opticup-storefront, plan storage object renames + FK updates per tenant, smoke on demo (currently empty), apply on Prizma in a maintenance window, then drop the `OR (storage.foldername(name))[1] IN ('brands','tenants')` legacy branches from the storage policies. Until that SPEC ships, the current policy is correct and the security gap from audit Finding 11 is CLOSED.

---

### #M3-DEBT-V_STOREFRONT_CROSS_TENANT_HARDEN — 🟡 17 storefront views lack tenant filter inside the view

**Where:** Views in `public`: `v_storefront_products`, `v_storefront_branches`, `v_storefront_config`, `v_public_tenant`, `v_ai_content`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats`, and 8 others (full list in `docs/guardian/SECURITY_ADVISOR_AUDIT_2026_05_13.md` Finding 14). All are SECURITY DEFINER, granted SELECT to anon per Iron Rule 13 ("Views-only for external reads"), and rely on the storefront supplying `?tenant_id=eq.<uuid>` as a URL query parameter to scope to a single tenant.

**Why it's debt:** Today this is a no-op — Prizma is the only tenant in production, so a missing tenant filter exposes only Prizma data, which is already public-by-design for the storefront. **When tenant #2 onboards**, an anon caller who drops the `?tenant_id=eq.<x>` filter from any of these views' PostgREST URLs reads every published storefront's products / branches / config / campaign cards. That's a competitor-catalog leak path.

**Why deferred:** Daniel locked decision Q4 in the SECURITY_HOTFIX brief: "DEFER to SaaS-readiness program before tenant #2 onboards." Single-tenant production today; competitor-catalog leak surfaces only at tenant-2 time.

**Planned fix:** Future Module 3 SPEC `M3_V_STOREFRONT_TENANT_INVOKER_HARDEN` — convert each view to `security_invoker = true` + add an explicit tenant_id WHERE clause driven by JWT claim (requires storefront-side per-request JWT minting; the storefront's Astro origin would resolve `slug → tenant_id` at SSR time and mint a short-lived JWT for the browser to send on subsequent RPC/view calls). Out of scope until tenant #2 onboarding is scheduled.

**Cross-reference:** `SECURITY_HOTFIX_2026_05_13_SUMMARY.md` §6 next-step #3; audit Finding 14.

---

### #M1_5-DEBT-CRM-ORPHAN-TAILWIND-CONFIG — 🟢 CRM Tailwind config defines unused color tokens

**Where:** `crm.html` lines 26-37 (inline Tailwind config `<script>` block). Surfaced by MIGRATION_3_CRM (2026-05-12) F2.

**Why it's debt:** The `crm: { sidebar: '#1e1b4b', accent: '#6366f1', surface: '#f8fafc', card: '#ffffff', text: '#1e293b', muted: '#64748b' }` color tokens defined in the inline Tailwind config are NOT referenced by any `bg-crm-*` / `text-crm-*` / `border-crm-*` class in the markup. Zero usages. Rule 21 (No Orphans) candidate.

**Why not fixed now:** Out of scope for the accent-insertion SPEC. The config block is documentation of intent — leaving it preserves history. Removal needs the same SPEC that does CRM CSS stub cleanup (F1 → `M1_5_CRM_CSS_STUB_CLEANUP`).

**Planned fix:** Delete the `colors.crm.*` block (lines 26-37) when running `M1_5_CRM_CSS_STUB_CLEANUP`. May also consider removing the entire inline Tailwind config block (lines 19-39) if JIT defaults are sufficient.

**Effort:** ~10 min, bundled with the stub-cleanup SPEC.

### #M1_5-DEBT-EOF-NEWLINE-LEGACY-FILES — 🟢 Pre-existing trailing-newline gaps in legacy HTML/JS files

**Where:** Project-wide — first surfaced on `storefront-content.html` (Iron Rule 31 gate warning during MIGRATION_4 C2 commit, `last byte: 0x3e`). Likely present in other legacy files that were authored before the gate existed.

**Why it's debt:** The Iron Rule 31 integrity gate emits a **warning** (exit 2, not error/exit 1) when a source file does not end with a trailing newline — the gate suspects mid-statement truncation. Warning does NOT block commits, but produces noise on every commit that touches such a file and erodes signal-to-noise on the gate's output.

**Why not fixed now:** Out of scope for visual re-skin SPECs (MIGRATION_4 only modified specific token lines via Edit tool, not the EOF). The fix is editorial (re-save each file with a trailing newline) and project-wide. Risk: a careless `sed -i` or batch-rewrite tool could introduce a different defect.

**Planned fix:** A single EOL-normalization SPEC scoped to "add trailing newline to every text file in repo that lacks one" — gates can run per-file confirmation; commits per file or per directory; defer until next infrastructure-hygiene window. Migration #4 surfaced this as Finding F3.

**Effort:** ~30 min for the SPEC + ~1 hour for the per-file editorial sweep + Reviewer pass.

---

### #M1_5-DEBT-CRM-SIDEBAR-MARKER-RTL-ONLY — 🟢 Sidebar Navy marker uses physical `-3px` offset (LTR fallback)

**Where:** `css/crm.css` `.crm-nav-item.active` `box-shadow: inset -3px 0 0 #1e3a8a;`. Added by MIGRATION_3_CRM (2026-05-12); surfaced as F3.

**Why it's debt:** The Navy left-edge marker is implemented as a physical-pixel inset shadow on the right edge. Correct for CRM today (Hebrew, `dir="rtl"` on `<html>`), where the right edge IS the start edge. If CRM ever supports LTR (Arabic-to-Hebrew bilingual or English fallback), the marker will paint on the wrong edge. CSS does not have a `box-shadow-inline-start` logical property.

**Why not fixed now:** Nobody asks for LTR CRM today. The cost of fixing is real-but-low and the value lands only on hypothetical LTR expansion.

**Planned fix:** Either (a) a CSS `[dir="ltr"] .crm-nav-item.active { box-shadow: inset 3px 0 0 #1e3a8a; }` override pair, or (b) a `::before` pseudo-element rendered marker positioned via logical `inset-inline-start`. Cosmetic-debt only — not a SPEC trigger.

**Effort:** ~5 min when CRM starts LTR work.

### #M4-DEBT-CRM-AUTO-RULES-UPDATED-AT — 🟢 `crm_automation_rules` lacks `updated_at` column

**Where:** Supabase table `public.crm_automation_rules`. Surfaced by `PRIZMA_CRM_BUGFIX_BACKPORT` (2026-05-12) Phase 1 pre-flight when a query requested `updated_at` and Postgres returned `42703: column "updated_at" does not exist`.

**Why it's debt:** Rule rows are mutated occasionally (UI editor, data-only fixes like this SPEC) but the row itself doesn't record when. Auditors and "since X" verification queries (e.g., the predecessor `M4_DEMO_E2E_FULL_AUDIT`-style snapshot pattern) have to fall back on git/SPEC history instead of an authoritative DB timestamp.

**Why not fixed now:** Out of scope for the backport SPEC. The table is small (16-32 rows per tenant) and the audit need is rare.

**Planned fix:** Add `updated_at timestamptz NOT NULL DEFAULT now()` + an `ON UPDATE` trigger (mirroring the canonical pattern from other CRM tables) in a single-purpose migration. Effort: ~30 min.

**Effort:** ~30 min.

### #M4-DEBT-EVENT-REG-OPEN-AUDIENCE-AUDIT — 🟡 `event_registration_open` rule audience may be too broad

**Where:** Supabase `crm_automation_rules` for Prizma tenant — a separate (out-of-`PRIZMA_CRM_BUGFIX_BACKPORT`-scope) automation rule fires on `event.status_change → registration_open` and uses a broad audience resolver. Surfaced by EF dry-run (`mode='evaluate'`) on event `a7c9f174` which returned 1999 plan_items all from template `event_registration_open` (≈ all Prizma `waiting`-status leads × 2 channels).

**Why it's debt:** 1999 outbound messages per "event opened for registration" event flip is a lot. Need to confirm:
1. Is this the intended behavior on Prizma operationally?
2. Should the audience be narrowed (e.g., a status filter or a recency window)?
3. Does demo's equivalent rule have the same audience?

**Why not fixed now:** Out of scope for `PRIZMA_CRM_BUGFIX_BACKPORT` (the SPEC was a targeted 2-row data fix on `event_invite_waiting_list` rules, not an audit of all event-status-change automation).

**Planned fix:** Author a small audit SPEC `M4_EVENT_REGISTRATION_OPEN_AUDIENCE_AUDIT` to inspect both tenants' equivalent rules + Daniel's intent. May or may not result in a data change.

**Effort:** ~1 hour audit + Daniel decision; data fix if needed is single-row UPDATE.

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

### M3-BLOG-05 — 🟢 Four WordPress blog images permanently 404

**Where:** Blog posts migrated from WordPress in SPEC
`modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/` (commits
`678a82e`→`3e92f7f`, executed 2026-04-15).

**What happened:** During the blog image migration, 23 unique WordPress image
URLs were catalogued across 132 posts. 19 were downloaded and re-uploaded to
Supabase Storage (`media-library/blog/`) with matching `media_library` rows.
**4 returned HTTP 404** from the legacy WordPress host at migration time and
could not be recovered. Their `<img>` tags were stripped from post content;
the posts (he/en/ru variants) now render without those images.

**Lost image filenames:**
- `Screen-Shot-2022-05-10-at-14.59.22-1024x613.png`
- `Screen-Shot-2022-05-10-at-15.04.05-300x300.png`
- `אופטיקה-באשקלון-1024x722.png`
- `האם-אתם-עיוורי-צבעים-300x212.jpg`

**Why it's debt:** Content completeness — posts referencing these images
render without the illustrative figure. Not a functional or SEO regression
(alt text + surrounding content preserved); purely a visual gap.

**Why not fixed now:** The legacy WordPress host no longer has the files. No
alternate backup has been surfaced.

**Planned fix (if Prizma has originals):**
1. Daniel locates original copies in Prizma's local WP media backup or
   original blog-post source drafts.
2. Upload via Studio → Media → folder "בלוג" (this routes through the
   canonical `media_library` dedup check and assigns a new
   `/api/image/media/<tenant>/blog/<sanitized>` URL).
3. Edit the affected posts via Studio → Blog editor to re-insert the
   `<img>` tags against the new URLs.

**Effort:** ~30 min per image if originals are available (upload + post
edit × 4). Zero effort (dismiss) if originals cannot be located.

**Source:** `FINDINGS.md` FINDING-005 in the SPEC folder.

### #8 — 🟢 SPEC templates reference `npm run safety-net` which is not a real script (M3-DEBT-DOC-03)

**Where:** SPEC authoring templates and Rule 30 wording in `CLAUDE.md` §6 both reference a `safety-net` verification step. The storefront `package.json` has `verify`, `verify:staged`, `verify:full` but **no `safety-net` script**. R2 criterion #18 cited `npm run safety-net` and forced the executor to substitute `verify:full` mid-execution.

**Why it's debt:** Every future Module 3 SPEC that uses the default template will hit the same substitution. Wastes ~3 minutes per SPEC and weakens the "literal verify command" discipline that makes criteria reliable.

**Why not fixed now:** Two possible fixes (rename an npm script to `safety-net`, OR update the template to use `verify:full`) are both trivial but belong in the same commit as the opticup-strategic skill pre-flight check (§6 Proposal 2 of `HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md`).

**Planned fix:** Decide (a) or (b) with Daniel at the start of NAV_FIX. Likely (b) because the existing script names are more precise. Update SPEC_TEMPLATE.md + any inherited verify-column language. Also add the author-side pre-flight grep of `package.json` per FOREMAN_REVIEW §6 Proposal 2.

**Effort:** ~15 min doc edit + ~10 min skill-file edit.

**Source:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FINDINGS.md` finding M3-DOC-DRIFT-02

### #9 — 🟡 HE vs EN/RU homepage structural divergence (M3-DEBT-LOCALE-01)

**Where:** `storefront_pages` rows for `tenant_id='6ad0781b-…'`, `slug='/'`:

| Locale | Block at index 2 | Block at index 4 |
|--------|------------------|------------------|
| HE | `exhibitions-home-he` (events_showcase) | `events-showcase-home-he` |
| EN | `tier1-spotlight-home-en` | `tier2-grid-home-en` |
| RU | `tier1-spotlight-home-ru` | `tier2-grid-home-ru` |

Block counts match (all 3 = 8), but block TYPES and ORDER diverge. R1 removed tier1_spotlight from HE and added events_showcase; R2 added the new exhibitions block only to HE.

**Why it's debt:** Three locale rows with different homepage information architectures means content governance becomes per-locale. A future translation effort can't simply localize strings — it has to decide *which blocks* exist per locale.

**Why not fixed now:** Daniel's explicit R1 + R2 scope was HE only. EN and RU are not yet in active content iteration. No user is hurt today.

**Planned fix:** During **LANGUAGES_FIX** (next-next gate after NAV_FIX), decide:
  - (a) Port the exhibitions block to EN + RU (keep HE-led information architecture),
  - (b) Accept HE-only by design (HE is the primary market; EN + RU are secondary),
  - (c) Parity both ways — give HE back a tier1_spotlight slot.

**Effort:** ~30 min DB work + copy writing, once the strategic decision is made. Strategic decision: ~10 min with Daniel.

**Source:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md` finding M3-LOCALE-PARITY-01 (Foreman-added during 2026-04-16 review)

---

### #10 — 🟢 `tenant-fallback-map.json` drifts on every storefront build (M3-DEBT-12)

**Where:** `opticup-storefront/src/data/tenant-fallback-map.json` (committed copy) vs `scripts/generate-tenant-fallback-map.mjs` (generator).

**Why it's debt:** Running `npm run build` regenerates the JSON and produces a phantom modification — the generator now emits a `www.prizma-optic.co.il` key (canonical www) that's missing from the committed copy. Every developer who runs build sees `M src/data/tenant-fallback-map.json` in git status. Either gets committed accidentally to unrelated PRs or gets restored manually. CI also produces this drift on every build and discards it.

**Why not fixed now:** 1-commit fix (run generator → commit fresh JSON), but doesn't justify a SPEC of its own. Bundle with other small drift items in a "post-cutover hygiene" SPEC.

**Planned fix:** Run `node scripts/generate-tenant-fallback-map.mjs` and commit the regenerated file. Verify the consuming code (`resolveTenantNameFallback()` per M3_TENANT_NAME_FALLBACK_SAAS) handles both apex + www keys correctly before committing.

**Effort:** ~5 min.

**Source:** `modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_BRAND_404_CLEANUP/FINDINGS.md` Finding M3-DEBT-12 (executor-discovered 2026-05-09).

---

### #11 — 🟢 `verify-sitemap.mjs` check #8 warn-only allowance is now stale (M3-OBS-01)

**Where:** `opticup-storefront/scripts/verify-sitemap.mjs` lines ~108-126 (check #8, the existing 30-URL random-sample probe).

**Why it's debt:** Check #8 was authored as warn-only because the prior data-quality issue (brand-block 404s) was tracked as a separate REC. After M3_SITEMAP_BRAND_404_CLEANUP shipped 2026-05-09, the post-deploy verify run reports `Sample probe: 30/30 returned 200 (0 pre-existing 404s logged)`. The "pre-existing data-quality issue" was entirely brand-block-driven and is now resolved. Check #8 could safely be tightened from warn-only to a strict gate, AND its inline comment is now misleading (mentions a problem that no longer exists).

**Why not fixed now:** Wait for 2 weeks of continuous 30/30 to confirm zero residual non-brand 404s before tightening (data confidence). The new `brand404Probe()` (check #10) already covers brands strictly, so tightening check #8 is incremental hardening, not bug-fix urgency.

**Planned fix:** After 2 weeks of continuous PASS: change `console.warn` → `throw new Error()` and update the inline comment to remove the "pre-existing data-quality issue" reference.

**Effort:** ~5 min.

**Source:** `modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_BRAND_404_CLEANUP/FINDINGS.md` Finding M3-OBS-01 (executor-discovered 2026-05-09).

---

### M4-DEBT-01 — 🟢 receipt-ocr-review.js T.INV migration deferred (blocked by H-3 file-size hard max)

**Where:** `modules/goods-receipts/receipt-ocr-review.js` (402 lines — pre-commit file-size check blocks at 350 hard max).

**Why it's debt:** OVERNIGHT_HYGIENE_SWEEP_2026_05_09 Item 12 migrated `'inventory'` → `T.INV` across 5 goods-receipts files. 4 of 5 committed cleanly. The 5th (this file) was already 402 lines — Sentinel H-3 (24 oversized files); staging ANY change trips the file-size hook. The 1-line T.INV change was reverted; commit `db042c0` closed Item 12 partial.

**Why not fixed now:** Cannot stage any change until file is decomposed. Decomposition is its own SPEC (per H-3 plan: `MISC_OVERSIZED_FILES_SPLIT`).

**Planned fix:** When the H-3 cleanup SPEC ships and decomposes receipt-ocr-review.js into smaller modules, complete the residual T.INV migration (1 line — replace one `'inventory'` raw string with `T.INV`). 5-minute follow-up.

**Effort:** ~5 min after H-3 file-split SPEC ships.

**Source:** `modules/Module 4 - CRM/docs/specs/OVERNIGHT_HYGIENE_SWEEP_2026_05_09/FINDINGS.md` Finding F4 (executor-discovered 2026-05-09).

---

### #12 — 🟢 Sentinel vs Lighthouse-Cron coexistence on `GUARDIAN_ALERTS.md` is informal (M3-INFRA-04)

**Where:** `docs/guardian/GUARDIAN_ALERTS.md` — single file with two writers: (a) Sentinel (regenerates the whole file each scan, runs locally on dev machines); (b) Lighthouse cron (appends below `<!-- LIGHTHOUSE-CRON-APPEND-MARKER -->`, runs in CI on develop).

**Why it's debt:** The marker-based design works for the cron's writes, but coexistence is conventional, not enforced. Risks: (1) Sentinel's local regenerations now produce dirty working trees (the `.gitignore` was changed from directory-level `docs/guardian/` to subdir-only `docs/guardian/*/` so the cron can commit `GUARDIAN_ALERTS.md`); (2) if a future Sentinel scan ever pushes its regenerated content, the cron's accumulated entries above the marker could be lost OR the marker itself deleted.

**Why not fixed now:** Marker design is robust against routine drift; this is about formalizing what is currently a convention. Wait until either writer actually drifts before investing the SPEC time.

**Planned fix:** Two clean options:
- (a) Update Sentinel to also respect the marker (only write above it).
- (b) Split into two files: `GUARDIAN_ALERTS.md` (Sentinel's, gitignored) + `LIGHTHOUSE_ALERTS.md` (cron's, committed).

Both are ~1-hour SPECs.

**Effort:** ~1 hour SPEC if/when needed.

**Source:** `modules/Module 3 - Storefront/docs/specs/M3_LIGHTHOUSE_NIGHTLY_CRON/FINDINGS.md` Finding M3-INFRA-04 (executor-discovered 2026-05-10).

---

### #13 — 🟢 `tenants` table has no `updated_at` auto-update trigger (TD-TENANTS-UPDATED-AT-TRIGGER-MISSING)

**Where:** Postgres `tenants` table — no `BEFORE UPDATE ... SET NEW.updated_at = NOW()` trigger.

**Why it's debt:** SPECs that compare `tenants.updated_at` to verify a mutation succeeded get false negatives — the column doesn't bump unless the UPDATE explicitly sets it in the SET clause. Verified live 2026-05-11 during `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT`: an UPDATE to `ui_config` did not advance `updated_at`. The current value (`2026-03-29 08:33:43.906+00` for demo) was set by an earlier SPEC that explicitly included `updated_at = NOW()`.

**Why not fixed now:** Schema change requires Level-3 SQL autonomy (never autonomous) and a dedicated migration. SPECs in the meantime should compare the substantive column via `RETURNING`, not `updated_at` (now documented as an authoring anti-pattern in `SPEC_TEMPLATE.md` per Author Proposal A2 from this SPEC's FOREMAN_REVIEW).

**Planned fix:** Two viable resolutions:
- (a) Add a standard `BEFORE UPDATE ... SET NEW.updated_at = NOW()` trigger to `tenants` (worth verifying which other multi-tenant tables also lack one before deciding scope).
- (b) Document the absence (this entry) and rely on SPECs to verify mutations via substantive-column comparison only.

**Effort:** ~30-minute migration if option (a) chosen + audit. Zero additional work if option (b).

**Source:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FINDINGS.md` Finding M3-FINDINGS-02 (executor-discovered 2026-05-11).

---

## Resolved Debt

### #2 — 🟢 scripts/README.md mixes two unrelated topics ✅ RESOLVED

**Resolved by commit `c623dd0` on 2026-05-09 — OVERNIGHT_HYGIENE_SWEEP_2026_05_09 Item 13.**

**Original state:** `scripts/README.md` mixed InventorySync watcher docs (~77 lines) with verify system docs (~65 lines) = 142 lines, two unrelated systems in one file (Iron Rule 12 spirit violation).

**Fix applied:** Split into `scripts/README-sync-watcher.md` (78 lines) + `scripts/README-verify.md` (~75 lines, expanded to include null-bytes + check-root-discipline checks). Original `scripts/README.md` deleted. Zero references in live code.

---

### #7 — 🟢 verify.mjs warnings exit policy inconsistent between ERP and Storefront ✅ RESOLVED

**Resolved by commit 305b22e — see PHASE_0_PROGRESS.md for details.**

**Priority:** 🟢 LOW

**Where:**
- ERP: `scripts/verify.mjs` — warnings-only path returns exit 0 (deliberate,
  with inline `// Warnings are advisory — do not block commits (exit 0)` comment)
- Storefront: `scripts/verify.mjs` — warnings-only path returns exit 2 (matches
  0A spec)

**Original state:** The Phase 0A plan specified exit 2 on warnings-only as the
blocking policy. The Storefront `verify.mjs` (built in Phase 0C) correctly
implements this. The ERP `verify.mjs` (built in Phase 0A) deviates and returns
exit 0 on warnings-only. Both behaviors were independently correct at the time of
their respective phases — the discrepancy was only discovered during Phase 0D
when both implementations were compared.

**Why it mattered:** CI (Phase 0E) will run `verify.mjs --full` on both repos. If
the two repos use different exit codes for the same condition (warnings-only), CI
policies must either:
  (a) Accept inconsistency and document it per-repo, OR
  (b) Harmonize to one policy (probably exit 2 = "warnings block CI but not
  pre-commit hooks" OR exit 0 = "warnings are always advisory")
Neither behavior was wrong in isolation — both were defensible — but the
inconsistency would cause confusion when someone reads one repo's `verify.mjs`
expecting the behavior of the other.

**Fix applied:** Harmonized in commit 305b22e. The TECH_DEBT.md entry was
not updated at the time; this bookkeeping was completed in Phase 3C of
Module 3.1 (2026-04-11).

---

## How to Use This File

- Before starting work, scan Active Debt for items that touch your area.
- When you fix a debt item, move it to Resolved Debt with the date and commit.
- When you discover new debt, add it here with a priority tag.
- One authoritative location per item — do not duplicate in CLAUDE.md or elsewhere.
