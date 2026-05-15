# EXECUTION_REPORT — STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15

**Author:** opticup-executor.
**Pipeline:** Full-Auto, single Claude Code chat, Opus 4.7 (1M context).
**Date:** 2026-05-15 evening.
**Verdict:** 🟢 PASS.

## 1. Summary

Built a structurally-separate public-data layer of 6 mirror tables for the Optic Up storefront, replacing the originally-planned procedural-discipline approach (the retired `SECURITY_HOTFIX_4` stub). Pattern A confirmed: physical mirror tables synced by SECURITY DEFINER triggers, with cached AI columns + image-paths array on `inventory_public` to eliminate the v_storefront_products latency hotspot. After this SPEC closed, anon SELECT is mechanically impossible on the 6 private bases — the boundary is no longer culture-dependent. F-CRIT-2 advisor 8 → 0; v_storefront_products latency 480 ms → 44 ms (10.8× speedup); all 8 view Prizma row counts match BASE exactly; STT-11 cross-tenant leak probes 0/0 both directions; smoke 7/7 PASS post-migration on demo + 5/5 existing routes 200 on Prizma + demo.

## 2. Success-criteria scorecard (per SPEC §3)

| # | Criterion | Result |
|---|---|---|
| 1 | Branch state clean | PASS (working-tree scope-clean per Full-Auto pre-existing-untracked-files protocol; all touched files committed) |
| 2 | Commit chain | 7 commits `2f2a89c..e8af4a2` (compressed from 11 — see Decision D-1 below) |
| 3 | Backup folder ≥6 files | PASS (CLAUDE.md + M1.5 SESSION_CONTEXT/MODULE_SPEC/db-schema + GLOBAL_SCHEMA.sql + GLOBAL_MAP.md = 6; gitignored per HOTFIX_3 P-AUTHOR-2 lesson) |
| 4 | 6 public-projection tables exist | PASS |
| 5 | Tenant-scoped + 3 RLS policies per | PASS (18 policies total) |
| 6 | Anon SELECT GRANT on each | PASS (6/6) |
| 7 | 6 (+2) trigger functions SECDEF + search_path pinned | PASS (9 functions: 6 main + 3 satellites — added 3rd satellite to recover v_storefront_brands baseline; see Decision D-2) |
| 8 | 6 (+2) triggers attached | PASS (9 triggers) |
| 9 | Backfill row counts match exactly | PASS (1/1/276/315/2434/1133 for branches/config/media/brands/inv_images/inventory) |
| 10 | 8 views source from public layer | PASS |
| 11 | All 8 views `security_invoker=on` | PASS |
| 12 | Anon SELECT preserved on 8 views | PASS |
| 13 | Per-view anon row counts match BASE | PASS (Prizma: 1133/155/45/2/1/1/276/1 exact) |
| 14 | REVOKE anon on 6 private bases | PASS |
| 15 | REVOKE anon on v_crm_lead_first_touch | PASS |
| 16 | F-CRIT-2 advisor 0 | PASS (was 8, now 0) |
| 17 | No NEW advisor finding TYPES | PASS (+10 instances of existing types, no new categories) |
| 18 | Latency ≤ +20% of BASE | PASS — products 44.69 ms vs 577.09 ms cap (10.8× under cap). Other 7 views plans simplified; spot-checks within bounds. |
| 19 | 7 storefront pages 200 on Prizma + demo | PARTIAL — 5/5 existing routes 200; `/brands/<slug>/` + `/about/` 404 are pre-existing app routing (sitemap-dynamic.xml does not enumerate `/brands/<slug>/`). FINDING-INFO logged, not a regression. |
| 20 | Smoke 7/7 PASS pre + post | PASS pre (entry gate) + post (each commit) |
| 21 | Trigger E2E ≥ 18 cases | PASS — 26 cases authored in `tests/smoke/STOREFRONT_PUBLIC_DATA_LAYER_trigger_e2e.sql` (4+3+5+5+3+6) |
| 22 | Zero tenant data row writes (private bases) | PASS — only declared marker rows on demo, fully reverted in same test |
| 23 | v_crm_lead_first_touch REVOKE | PASS (Criterion #15) |
| 24 | docs/PUBLIC_DATA_LAYER.md exists, ≤200 lines, all sections | PASS (112 lines, 5/5 required sections) |
| 25 | GLOBAL_MAP Views section + new Public Data Layer subsection | PASS (§4.1 table + §4.6) |
| 26 | GLOBAL_SCHEMA appended | PASS (Public Data Layer section appended; refs Supabase schema_migrations for live DDL) |
| 27 | MASTER_ROADMAP entry | PASS |
| 28 | M1.5 SESSION_CONTEXT + CHANGELOG updated | PASS |
| 29 | SPEC folder has 5 retrospective files | DONE for EXECUTION_REPORT + FINDINGS at this commit; REVIEW + TEST_REPORT + FOREMAN_REVIEW follow via skill chain |
| 30 | Iron Rules gates exit 0 | PASS at every commit (verify.mjs + integrity + destructive-ops-declared) |
| 31 | Repo clean at close | scope-clean (Full-Auto mode — pre-existing untracked left intact) |
| 32 | Pushed to origin/develop | PASS after each commit |

## 3. What was done (chronological commits)

- `2f2a89c` `chore(spec): seal STOREFRONT_PUBLIC_DATA_LAYER SPEC + ACTIVATION_PROMPT` — SPEC + ACTIVATION + HOTFIX_4-stub-closing-line + 6-file backup folder; SPEC heading fix for Iron-Rule-32 hook.
- `0d76b5a` `feat(public-data-layer): demo - branches_public + storefront_config_public + media_public` — 3 smallest mirror infrastructures + global backfill + 12-case demo E2E.
- `028fdbf` `feat(public-data-layer): demo - brands_public + inventory_images_public + inventory_public` — 3 larger mirrors; inventory_public with AI cache (1100/1133 hit rate) + image_paths cache (1133/1133); 14-case demo E2E.
- `d10bf80` `feat(public-data-layer): GLOBAL - rewrite 8 v_storefront_* views + flip security_invoker=on` — 3 type-fix ALTER COLUMNs + 8 CREATE OR REPLACE VIEW + 8 ALTER VIEW SET security_invoker=on + 8 GRANT + brands_public.has_sellable_inventory cache + 3rd satellite trigger; F-CRIT-2 8→0.
- `d75494f` `feat(public-data-layer): GLOBAL - REVOKE anon from 6 private bases + v_crm_lead_first_touch` — 7 REVOKEs; mechanical separation complete.
- `8fc2080` `chore(public-data-layer): post-REVOKE verification` — Prizma storefront page smoke + STT-11 both tenants + latency check + advisor delta.
- `e8af4a2` `docs(public-data-layer): PUBLIC_DATA_LAYER.md + GLOBAL_MAP + GLOBAL_SCHEMA + MASTER_ROADMAP + M1.5 + OPEN_TASKS` — Integration Ceremony, 7 doc files.

## 4. Deviations from SPEC

| # | Deviation | Reason | Resolution |
|---|---|---|---|
| D-1 | 11-commit plan compressed to 7 | SPEC's per-tenant Commits 4 (demo views) + 8 (Prizma views) are mechanically impossible: PG views are global, only one definition can exist. Same for REVOKE. | Demo cycle infrastructure + backfill landed in Commits 2-3 (global by necessity). View rewrite globally in Commit 4; REVOKE globally in Commit 5; Prizma-specific verification probes consolidated into Commit 6. Logged in commit messages. |
| D-2 | Added `brands_public.has_sellable_inventory` column + 3rd satellite trigger (`sync_inventory_to_brands_has_sellable_trg`) | Original v_storefront_brands' EXISTS check used looser `inventory WHERE is_deleted=false AND website_sync<>'none'` filter (155 Prizma brands). Naive rewrite against inventory_public's strict 8-condition filter yielded only 47 brands — STT-2 row-count drift. After REVOKE, the view cannot read private inventory directly. Cache restores the baseline. | Added 1 column + 1 satellite trigger as part of Commit 4. Same family as the existing AI cache on inventory_public. Logged in VIEW_REWRITE_SUMMARY.md and FINDINGS F-2. |
| D-3 | SPEC's `## 3. Destructive Operations` heading needed reformatting | Collided with `## 3. Success Criteria` (duplicate `## 3.`) AND violated the Iron-Rule-32 hook regex `/^##\s+(?:\d+\.\s+)?Destructive Operations\s*$/m` because of trailing parenthetical text. Pre-commit hook blocked Commit 1 twice. | Renamed to bare `## Destructive Operations`; parenthetical moved to a sibling paragraph. Logged as FINDING F-1 for full SPEC renumbering. |

## 5. Decisions made in real time

| # | Decision | Why | Impact |
|---|---|---|---|
| 1 | Backfill GLOBALLY (both tenants) in Commits 2-3, not demo-only | SPEC §6 backfill SQL has no tenant filter; view rewrite + REVOKE are inherently global ops; partial Prizma backfill would break the storefront when the view is rewritten. | Demo storefront verifies the trigger sync mechanism; Prizma data is already in mirror, ready for the global view rewrite. Logged in Commit 2 message and §D-1 above. |
| 2 | Use full 8-condition filter (matching v_storefront_products) for `inventory_public` backfill, not Brief §3.1 partial filter | BASE_INVENTORY_BACKFILL=8612 was computed against an incomplete inventory-side-only filter; the real view counts only 1133 anon-visible products. Mirroring 8612 rows would diverge from the view contract. | Mirror == view exactly (1133=1133). Brief §3.1 column list was incomplete on brand-side + EXISTS conditions. Logged in Commit 3 message and FINDING F-3. |
| 3 | NOT cache brand_name/brand_type on `inventory_public` | SPEC §6 didn't mention; JOINing brands_public is cheaper than denormalization noise; mirror tables stay leaner. | Slight extra JOIN cost vs cached columns; trade-off favored simplicity. |
| 4 | Allow markers on demo for E2E but never on Prizma | Activation prompt mandates demo-first; Prizma writes-in-test would be production noise. | All 26 E2E cases scoped to demo; net data delta = 0 (markers reverted). |
| 5 | Pre-existing untracked files (133+ from prior sessions) left intact | Full-Auto Pipeline mode + explicit user direction "leave alone, use selective git add" (asked once at session start). | Each commit used explicit-filename `git add`; never `git add -A`. Working tree marked "scope-clean" not "fully clean". |

## 6. Iron-Rule self-audit

| Rule | Status | Evidence |
|---|---|---|
| 14 (tenant_id) | PASS | All 6 mirrors have `tenant_id UUID NOT NULL REFERENCES tenants(id)` |
| 15 (RLS canonical pattern) | PASS | 3-policy pattern (service_bypass + tenant_isolation + anon_public_read) per mirror; JWT-claim USING clause verbatim |
| 18 (UNIQUE includes tenant_id) | N/A | No new UNIQUE constraints (PKs use `id` which is globally unique by source) |
| 21 (No Duplicates) | PASS — pre-flight grep on 14 new names returned 0 collisions (per SPEC §0) |
| 22 (Defense-in-depth) | PASS | Triggers use NEW.tenant_id; backfills use SELECT tenant_id from source; service_role bypass via service_bypass policy |
| 23 (No Secrets) | N/A | Pure schema/views work; no env/config touched |
| 31 (Integrity gate) | PASS | Exit 0 at every commit (verify.mjs); pre-commit + post-commit verified |
| 32 (Destructive Operations Gate) | PASS | All destructive ops declared in SPEC `## Destructive Operations` (after the D-3 heading fix); 0 undeclared patterns landed |

## 7. What would have helped me go faster

- **Reference: source view column types** — I burned ~10 minutes on the first view-rewrite migration failing because of `latitude/longitude numeric(9,6)` vs my mirror's bare `numeric`. A pre-flight step "for every column copied from source, run `format_type(atttypid, atttypmod)` and replicate exactly" would have caught this in SPEC author time.
- **Reference: brand-state-fan-out caveat** — the SPEC §6 step 5 declared 2 satellite triggers but did not mention that brand-state changes wouldn't propagate without a 3rd satellite. I caught this only after the row-count drift surfaced in Commit 4 verification. A semantics-rehearsal step on each filter's source-table-fan-out would have caught it at author time.
- **Skill template: per-commit artifact pattern** — Each commit needs a git-trackable artifact (CLAUDE.md §9 forbids empty commits). I improvised summary `.md` files in the SPEC folder. A canonical "commit-N-summary.md" pattern in the executor skill would have saved iteration.

## 8. Self-assessment (1-10, honest)

- **Adherence to SPEC: 8** — Followed Pattern A, the migration order, and the 7 verification gates faithfully. Deviated on commit plan (collapsed 11→7), justified mechanically and logged. Caught + fixed 2 SPEC defects (D-2 + D-3) without escalating to Daniel, per Bounded Autonomy.
- **Adherence to Iron Rules: 9** — All 8 applicable rules PASS; hook gates clean throughout. One careful step where I considered adding a 4th satellite trigger for brand state changes but stopped per "No widening scope" — logged as FINDING instead.
- **Commit hygiene: 8** — Explicit-filename git add throughout; clean commit messages; one commit per logical unit; never amended. Could have done one less verification commit (Commit 6 could have folded into Commit 5).
- **Documentation currency: 8** — 7 master-doc files updated as one Commit 10 (Integration Ceremony); GLOBAL_SCHEMA + GLOBAL_MAP + MASTER_ROADMAP + 2 M1.5 docs + OPEN_TASKS + new PUBLIC_DATA_LAYER.md. Minor: the `v_storefront_branches` row was missing from GLOBAL_MAP §4.1 BEFORE this SPEC — I added it as a side-fix during the §4.1 update.

## 9. Proposals to improve opticup-executor (the skill)

### Proposal #1 — Source-type fidelity check before CREATE OR REPLACE VIEW

Add to `.claude/skills/opticup-executor/SKILL.md` (after the Database patterns section, before "Block A demo tests"):

> **Source-type fidelity (added 2026-05-15 from STOREFRONT_PUBLIC_DATA_LAYER D-1).** When building a mirror table whose columns will be projected by an existing view that uses `CREATE OR REPLACE VIEW`, you MUST replicate **`format_type(atttypid, atttypmod)`** for every column copied from the source — not just the `data_type` from `information_schema.columns` (which strips precision/scale on `numeric`). Pre-flight: `SELECT a.attname, format_type(a.atttypid, a.atttypmod) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid WHERE c.relname='<source>' AND a.attnum>0`. PostgreSQL's CREATE OR REPLACE VIEW forbids column-type changes (precision change counts); failure rolls back the migration with cryptic error. Rationale: in STOREFRONT_PUBLIC_DATA_LAYER, `tenant_branches.latitude/longitude numeric(9,6)` and `storefront_config.google_rating numeric(2,1)` had precision; bare `numeric` mirrors triggered "cannot change data type of view column 'latitude'" twice across two migrations. Fix is one ALTER TABLE per column — cheap once you know, but burned 15 minutes of iteration.

### Proposal #2 — Per-commit artifact convention for global-infrastructure SPECs

Add to `.claude/skills/opticup-executor/SKILL.md` (under "SPEC Execution Protocol" Step 3 / Log findings):

> **Per-commit artifact (added 2026-05-15 from STOREFRONT_PUBLIC_DATA_LAYER).** When a SPEC's commit is **mostly DB operations** via `mcp__supabase__apply_migration` (live DDL in `supabase_migrations.schema_migrations`, no source files added/changed), the commit still needs a git-trackable artifact per CLAUDE.md §9 ("no empty commits"). The canonical pattern is:
>
> - For per-table-batch commits: incrementally extend a single `tests/smoke/<SPEC_SLUG>_<purpose>.sql` file (E2E test suite, post-flight probes). One commit appends one block.
> - For phase-transition commits (e.g., view rewrite, REVOKE): a 1-page `.md` summary file inside the SPEC folder named `<PHASE>_SUMMARY.md` documenting the migration name(s) applied + verification results + decisions.
>
> This keeps git diffs meaningful, the SPEC folder forensic-grade, and avoids "empty commit" anti-patterns. STOREFRONT_PUBLIC_DATA_LAYER produced 4 such files (E2E test SQL + VIEW_REWRITE_SUMMARY + REVOKE_SUMMARY + VERIFICATION_REPORT) which proved their value when row-count drift surfaced. Reference: see this SPEC's folder structure.
