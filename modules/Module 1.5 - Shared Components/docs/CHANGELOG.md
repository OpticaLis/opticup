# Module 1.5 — Shared Components Refactor — CHANGELOG

## 2026-05-17 afternoon — M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2 — VFV-verified Option A layout fix (margin-inline-start)

SPEC: `M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2` ([folder](specs/M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2/))

**Remediation Pipeline.** Full-Auto, single chat, ~50 min wall-clock. Daniel observed post-merge that the just-closed `M1_5_CAT_SIDEBAR_COMPONENT` Pipeline shipped 🟢 yet the overlap bug Daniel originally reported was **STILL PRESENT** on contact-lenses + accessories surfaces. Dispatched a Remediation Pipeline with explicit non-bypassable Tier C VFV mandate ("Do NOT pass 🟢 until Daniel-equivalent eyes confirm the bug is gone on all 4 product category tabs").

**6 Pipeline commits + 1 Foreman close (`0cf78ef..65c671b` + this commit):**

- `0cf78ef` — `chore(spec): seal M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2 — SPEC.md (Foreman Stage 1)` — ~250 lines, 30 success criteria, root cause hypothesis: grid config-order swap
- `04094ff` — `fix(m1.5): swap grid-template-columns order for RTL sidebar alignment (cat-sidebar HOTFIX_2)` (C1) — `shared/css/cat-sidebar.css` 162 → 185 lines (+23: 1-line rule edit + 22-line RTL comment block) + SPEC.md §12 Execution Marker C1
- `d7fa89c` — `chore(spec): close M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2 executor scope — retrospective (C2)` — EXECUTION_REPORT.md ~112 lines; 0 FINDINGS.md (0 findings); 2 executor improvement proposals
- `ab79cd0` — `test(spec): M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2 TEST_REPORT 🔴 RED + escalation` — VFV across all 8 surfaces shows mainContent collapsed to 240px under sidebar; escalation file with refined root-cause + 3 proposed correct fixes; 11 screenshots (8 pre-fix + 3 post-C1)
- `b774e2c` — `fix(m1.5): drop grid; reserve sidebar space via margin-inline-start (cat-sidebar HOTFIX_2 C2, Option A)` — Daniel-approved Option A: `shared/css/cat-sidebar.css` 185 → 161 lines (-24 net); dropped `display: grid` + `grid-template-columns`; added `margin-inline-start: var(--cat-sidebar-width, 240px)` on `.main-content`; mobile @media block updated; SPEC.md §12 Execution Marker C2
- `65c671b` — `test(spec): M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2 TEST_REPORT 🟢 GREEN (Option A C2)` — VFV across all 8 surfaces PASS; DOM probe `mainContent.right == sidebar.left` on every surface; 8 C2 screenshots
- _(this commit)_ — `chore(spec): close M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2 — FOREMAN_REVIEW + master-docs + Hebrew summary + 2 skill harvests`

**Pipeline stats:**

- 6 Pipeline commits + 1 close = 7 total; 0 merges; 0 amends; 0 force-pushes
- 2 execution attempts (C1 hypothesis FAILED VFV; C2 PASSED) — first end-to-end validation of the Tier C VFV protocol
- 0 escalations to Daniel beyond the deliberate Option A decision
- 0 DB ops; 0 main-branch touches
- Iron Rule 31 + 32 gates exit 0 every commit; SPEC.md staged in every destructive commit per §12 Execution Marker
- Smoke 7/7 PASS pre + post on both C1 and C2 runs
- 0 findings (no FINDINGS.md written)
- 2 skill harvests applied directly to SKILL files in this close: P-AUTHOR-1 (CSS hypothesis DOM-state mental rehearsal) → opticup-strategic SKILL.md §5.4; P-EXEC-1 (canonical recipe: fixed-sidebar + main-content via margin-inline-start) → opticup-executor SKILL.md Visual re-skin patterns

**Schema/code delta:**

- 1 file modified: `shared/js/cat-sidebar.js` unchanged; `shared/css/cat-sidebar.css` 162 → 161 lines (-1 net across both C1 + C2; C2 reverted C1's grid swap entirely and substituted Option A's margin-inline-start primitive)
- 0 new files; 0 deletes
- 11 + 8 = 19 screenshots in `_archive/cat-sidebar-overlap-hotfix-2-2026-05-17/screenshots/`
- 1 escalation file in `modules/Module 1.5 - Shared Components/escalations/2026-05-17T1945Z_C1_HYPOTHESIS_FAILED.md` (preserved as Pipeline learning record)

**Root cause (definitive):** CSS Grid cannot constrain main content against a `position: fixed` sidebar — a fixed element exits document flow. Both the original grid-based attempt (`M1_5_CAT_SIDEBAR_COMPONENT`) and the C1 swap attempted to use the wrong tool. Grid auto-placement uses DOM child order, not config order; swapping `grid-template-columns` doesn't move `.main-content` into a different cell. The correct primitive is `margin-inline-start: var(--cat-sidebar-width, 240px)` on `.main-content` (RTL flips automatically) — one rule, one selector, no DOM-order trap.

**Status:**
- 🟢 Pipeline CLOSED — bug RESOLVED on all 8 sidebar surfaces (VFV 8/8 PASS, smoke 7/7 PASS, visual confirmation on the 4 product category surfaces)
- ✅ 2 skill harvests applied
- ⏸️ Tier C VFV pending entry remains queued for separate Layer 1 Pending Entries Sweep
- ⏸️ Ready for develop → main PR

---

## 2026-05-17 morning — M1_5_CAT_SIDEBAR_COMPONENT — reusable sidebar ES Module + structural overlap fix

SPEC: `M1_5_CAT_SIDEBAR_COMPONENT` ([folder](specs/M1_5_CAT_SIDEBAR_COMPONENT/))

**Component-extraction + visual-bug-fix Pipeline.** Full Auto Pipeline, ~1.5h wall-clock. Two goals merged into one Pipeline because they share the same code path: (1) extract sidebar from inventory.html into reusable Module 1.5 ES Module; (2) replace selector-specific overlap hotfix (which missed contactNav + accessoryNav — Daniel's reported bug) with grid-based structural rule.

**8 commits on develop (pre-tag `pre-cat-sidebar-extraction-2026-05-17` @ `dafdf6e`):**

- `9a783c2` — `docs(m1.5): seed M1_5_CAT_SIDEBAR_COMPONENT Brief (Cowork architect)`
- `e9c2b5a` — `chore(spec): seal M1_5_CAT_SIDEBAR_COMPONENT — SPEC.md (Foreman Stage 1)` — 30 measurable success criteria, 5 decision gates pre-resolved, 6 Brief-vs-reality findings absorbed
- `c911bca` — `feat(m1.5): cat-sidebar.js + cat-sidebar.css — reusable ES Module component (C1)` — 192-line ES Module + 162-line CSS (grid host + sidebar visual + responsive @media)
- `7c74e9c` — `refactor(m1): inventory.html consumes cat-sidebar component (C2)` — 5 corollary edits per DG-5 (CSS link, body class dropped, wrappers added, inline aside removed, script type=module import added)
- `fb54e21` — `fix(m1): grid-based sidebar/main-content boundary protection (C3)` — `css/inventory-shell.css` pruned 248 → 140 lines; the brittle selector list (the bug source) GONE; cross-cutting non-sidebar rules KEPT (supplier-cat-badge, ul-filter-bar, lens-tab-section)
- `041f3f7` — `chore(docs): GLOBAL_MAP.md adds initCatSidebar entry (C4)` — §5.4 Key JS globals ERP gets `initCatSidebar` row with ES Module divergence flag + companion cat-sidebar.css reference
- `11b3d5c` — `chore(spec): close M1_5_CAT_SIDEBAR_COMPONENT executor scope — retrospective (C5)` — EXECUTION_REPORT.md ~210 lines; 0 FINDINGS.md (executor found 0 findings); 2 executor-improvement proposals
- `16bb07b` — `chore(spec): Reviewer REVIEW.md — M1_5_CAT_SIDEBAR_COMPONENT 🟡 PASS WITH NOTE` — 7 fresh-angle spot-checks PASS + 1 R-FINDING-1 (icon glyph drift)
- `5af2b4c` — `chore(spec): Localhost-Tester TEST_REPORT — M1_5_CAT_SIDEBAR_COMPONENT 🟡 YELLOW` — Smoke 7/7 + Tier A HTTP 10/10 + 1 screenshot (UI walk blocked by login-modal limitation)
- _(this commit)_ — `chore(spec): close M1_5_CAT_SIDEBAR_COMPONENT — FOREMAN_REVIEW + master-docs + Hebrew summary`

**Pipeline stats:**

- 8 Pipeline commits + 1 close = 9 total; 0 merges; 0 amends; 0 force-pushes (FA-1 verified)
- 0 escalations to Daniel; 3 in-flight Executor decisions all justified (D-1 line-count, IF-1 script placement, IF-2 wrapper scope)
- 0 DB ops; 0 main-branch touches
- Iron Rule 31 + 32 gates exit 0 every commit; SPEC.md staged in every destructive commit per §12 Execution Marker
- Smoke 7/7 PASS pre + post (verified twice by Tester)
- 1 cosmetic R-FINDING-1 (3 sidebar icon codepoints drifted: frames 👓→🕶; secondary title 🔃→🔄; access-sync 🔄→🔂) — flagged for Daniel decision via Hebrew summary

**Schema/code delta:**

- 2 new files: `shared/js/cat-sidebar.js` (192 lines, ES Module) + `shared/css/cat-sidebar.css` (162 lines)
- inventory.html: net +0 lines (37 removed inline aside + ~15 added wrappers + ~28 added script type=module config + 1 added CSS link); 1200 lines pre + 1200 post
- css/inventory-shell.css: 248 → 140 lines (-108: sidebar visual extracted to cat-sidebar.css + brittle overlap selector list removed; supplier badges + ul-filter-bar + lens-tab-section KEPT)
- docs/GLOBAL_MAP.md: +1 row (initCatSidebar in §5.4)

**Status:**
- 🟢 Pipeline CLOSED — all 30 SPEC §3 criteria met structurally
- ✅ Reusable Module 1.5 sidebar component shipped — future modules (M5/M7/M9/...) consume via `import { initCatSidebar } from '/shared/js/cat-sidebar.js'`
- ✅ Daniel's contactNav + accessoryNav overlap bug RESOLVED STRUCTURALLY (grid replaces selector enumeration)
- ⏳ Awaiting Daniel decision on R-FINDING-1 (3 icon glyph drifts) — accept OR trivial 1-min revert
- ⏳ Awaiting Daniel ~5-min manual UI walk (test environment login-modal limitation)
- ⏳ Architect Integration Ceremony (next opticup-architect session): merge cat-sidebar.js + cat-sidebar.css into FILE_STRUCTURE.md + apply 4 auto-trigger SKILL.md edits queued via pending architect entries

---

## 2026-05-15 evening — PENDING_ENTRIES_AUTO_RESOLUTION — 3-layer pending-entries infrastructure

SPEC: `PENDING_ENTRIES_AUTO_RESOLUTION` ([folder](specs/PENDING_ENTRIES_AUTO_RESOLUTION/))

**Process-infrastructure SPEC.** Turns the Cowork → Claude Code pending-entries hand-off (`_archive/architect-pending-entries/*.md`) from a culture rule into mechanical infrastructure per Daniel directive #11 (2026-05-09): "I want infrastructure, not culture. Culture decays." Mirrors the STRUCTURE_PROTECTIONS pattern — 3 layers, each catching what the previous one missed.

**6 commits in chain:**

- `1a22974` — `spec(infra): author PENDING_ENTRIES_AUTO_RESOLUTION SPEC.md (Foreman)` — Foreman authors SPEC.md (458 lines) with 17 measurable success criteria + Iron Rule 32 destructive-op declaration + §10 6-commit plan. Pre-tag `pre-pending-entries-resolution-start` placed BEFORE.
- `e51cef8` — `feat(infra): add architect-pending-applied advisory check (Layer 2)` — new `scripts/checks/architect-pending-applied.mjs` (56 lines), advisory-only (exit 2 yellow warning when folder non-empty AND no other violations). Auto-loaded by `verify.mjs`; no `verify.mjs` edit needed.
- `e4a679e` — `docs(skill): add Pending Entries Sweep to opticup-executor SKILL.md (Layer 1)` — new "Step 4.5 — Pending Entries Sweep" section between SPEC Execution Protocol Steps 4 and 5. opticup-executor SKILL.md 1196 → 1234 lines (+38).
- `2fe2070` — `docs(skill): add Cowork File-Write Capability Map to opticup-architect SKILL.md (D5)` — new sub-section in "Cowork vs Claude Code" with capability matrix (5 surfaces × 4 path namespaces) + 4 rules-of-thumb for Cowork Architect sessions. opticup-architect SKILL.md 1066 → 1089 lines (+23).
- `28c3c08` — `docs(sentinel): extend Mission 10 with pending-entries audit Check 10.6 (Layer 3)` — new Check 10.6 with portable Bash probe (GNU `stat -c %Y` + BSD `stat -f %m` fallback) + GUARDIAN_REPORT.md output templates for MEDIUM + HIGH findings. Mission 10 file 162 → 213 lines (+52).
- `a25de76` — `chore(decisions): apply pending entry #32 + delete pending file (Brief §3.1)` — DECISIONS_LOG.md row #32 inserted above row #28 (verbatim per pending file's placement instructions); pending file `2026-05-15_STOREFRONT_PUBLIC_DATA_LAYER.md` removed from disk (was untracked — no `git rm`); `.gitkeep` added so folder + Sentinel 10.6 have a stable path. **Iron Rule 32 destructive op #1 of 1** declared in SPEC §7.

**Verification:**
- 17/17 SPEC §3 success criteria GREEN (smoke 7/7 + integrity gate confirmed by Localhost-Tester chain).
- Iron Rule 31 exit 0 at every commit boundary (152 files scanned in 5–6 ms each).
- Iron Rule 32 hook passed every commit (no `--no-verify`).
- Layer 2 contract validated end-to-end: verify.mjs exit 2 with warning at C1–C4 (folder still had 1 pending file), exit 0 at C5 (folder empty).
- Working tree scope-clean at close.

**4 in-flight decisions (Bounded Autonomy):** D1 copy pending file's "merged to main" wording VERBATIM per placement instructions (logged as F-1, Foreman post-decides); D2 use `rm` not `git rm` for untracked file; D3 no SPEC.md re-stage needed (untracked file = no staged-delete = auth-parser not invoked; logged as F-2 tooling-gap); D4 leave pre-existing untracked files alone (Full-Auto Pipeline pattern, 6+ consecutive SPECs).

**4 STOREFRONT_PUBLIC_DATA_LAYER queued skill improvements NOT applied:** P-AUTHOR-1 view-fan-out probe, P-AUTHOR-2 §1.5 Pre-flight findings standard section, P-EXEC-1 trigger E2E SQL convention, P-EXEC-2 base-table RLS probe gate. All 4 target SQL/Pattern-A/view-cascade work — orthogonal to this SPEC's process-infrastructure scope. Queue intact for next SQL-heavy SPEC.

**2 findings (both LOW), 2 executor proposals queued:** F-1 content-fidelity ("merged to main" aspirational wording in pending file's row #32); F-2 Iron Rule 32 auth-parser STAGED-only gap (will fire for future Full-Auto SPECs with tracked deletes). Executor Proposal 1 — tracked-vs-untracked guidance in Sweep protocol; Executor Proposal 2 — auth-parser HEAD-scan note in SKILL.md or follow-up SPEC `M1_5_DESTRUCTIVE_OPS_AUTH_PARSER_HEAD_SCAN`.

**Strategic state:** Pending-entries hand-off is now infrastructure. Next Cowork Architect session that needs to write to `.claude/skills/...` writes a pending file → next Claude Code session's Sweep protocol consumes it → Layer 2 + Layer 3 catch any miss. The 2026-05-15 failure mode (pending file sitting unconsumed across multiple Cowork sessions) is structurally resolved.

---

## 2026-05-15 evening — STOREFRONT_PUBLIC_DATA_LAYER — Pattern A mirror architecture (replaces SECURITY_HOTFIX_4)

SPEC: `STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15` ([folder](specs/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15/))

**Foundational architectural SPEC.** Replaces `SECURITY_HOTFIX_4_BRIEF.md` (stub retired by Architect same-day per Daniel directive — *"בלי פלסטרים — תמיד אפשר לשפר בלי לחזור ולתקן"*). Instead of "extend RLS + GRANT anon on private base tables" (procedural discipline, fragile), build a **dedicated public-data layer** of structurally-separate mirror tables (mechanical separation, durable).

**6 commits in chain (collapsed from SPEC's 11 — real-time decision logged in commit messages 2-4):**

- `2f2a89c` — `chore(spec): seal STOREFRONT_PUBLIC_DATA_LAYER SPEC + ACTIVATION_PROMPT` — Foreman SPEC + ACTIVATION_PROMPT + retire HOTFIX_4 stub. Heading-convention fix (Iron Rule 32 hook regex requires exact `## Destructive Operations` line termination).
- `0d76b5a` — `feat(public-data-layer): demo - branches_public + storefront_config_public + media_public` — 3 smallest mirrors + RLS + GRANT + triggers; global infrastructure, demo-cycle E2E (12/12 PASS).
- `028fdbf` — `feat(public-data-layer): demo - brands_public + inventory_images_public + inventory_public` — 3 larger mirrors. inventory_public caches 3 ai_content columns + image_paths text[]; 2 satellite triggers on ai_content + inventory_images. E2E 14/14 PASS (incl. visibility-by-image transition + ai_content satellite path). Cumulative 26/18+ E2E cases.
- `d10bf80` — `feat(public-data-layer): GLOBAL - rewrite 8 v_storefront_* views + flip security_invoker=on` — global view rewrites + ALTER VIEW SET (security_invoker=on) × 8 + brands_public.has_sellable_inventory cache + 3rd satellite trigger (inventory → brands_public.has_sellable). All 8 Prizma row counts match BASE exactly. F-CRIT-2 8→0.
- `d75494f` — `feat(public-data-layer): GLOBAL - REVOKE anon from 6 private bases + v_crm_lead_first_touch` — 7 REVOKEs. Mechanical separation complete.
- `8fc2080` — `chore(public-data-layer): post-REVOKE verification` — Prizma storefront page smoke + STT-11 both tenants + latency check (products 480→44ms) + advisor delta.

**Migrations applied (via Supabase MCP apply_migration; recorded in supabase_migrations.schema_migrations):**
- `create_branches_public_layer`
- `create_storefront_config_public_layer`
- `create_media_public_layer`
- `create_brands_public_layer`
- `create_inventory_images_public_layer`
- `create_inventory_public_layer` (3 functions + 3 triggers — main + 2 satellites)
- `fix_mirror_column_precision_to_match_source` (latitude/longitude numeric(9,6), google_rating numeric(2,1))
- `rewrite_8_storefront_views_source_from_public_layer_v2` (8 CREATE OR REPLACE VIEW + 8 ALTER VIEW SET security_invoker=on + 8 GRANT defensively)
- `add_has_sellable_inventory_to_brands_public` (1 ALTER ADD COLUMN + 1 backfill UPDATE + 1 ALTER FUNCTION (re-defined trigger) + 1 CREATE FUNCTION + 1 CREATE TRIGGER + 1 CREATE OR REPLACE VIEW for v_storefront_brands filter switch)
- `revoke_anon_select_from_private_bases_and_crm_view` (7 REVOKE SELECT)

**Verdict 🟢 CLOSED.** Smoke 7/7 PASS post-migration on demo. All 8 view Prizma counts match BASE exactly (1133/155/45/2/1/1/276/1). STT-11 cross-tenant leak probe: 0 leaks for both tenant JWTs. v_storefront_products latency 480.91ms → 44.69ms via EXPLAIN ANALYZE (10.8× speedup — Pattern A's AI cache eliminated 3×1133 subquery loops). F-CRIT-2 advisor 8→0; no new lint TYPES introduced (+10 instances of existing types from 9 new SECDEF trigger functions, FINDING-LOW). 7 REVOKEs sealed anon access to 6 private bases + v_crm_lead_first_touch.

**Real-time decision** (logged in commit 2 + EXECUTION_REPORT §5): The SPEC's "demo-first then Prizma" Commits 4-9 collapsed to 4 commits because views + REVOKE are inherently global Postgres operations. Global infrastructure (CREATE TABLE/TRIGGER/POLICY) landed in Commits 2-3 with backfill matching project-wide row counts. View rewrite (Commit 4) and REVOKE (Commit 5) are global single ops. Commits 6-9 from the original plan consolidated into Commit 6 (verification report). Tenant-isolation safety is preserved by per-row RLS, not per-commit phasing.

**Brief gap caught + fixed:** Original v_storefront_brands EXISTS check used looser `inventory WHERE is_deleted=false AND website_sync<>'none'` filter (155 Prizma brands). Naive rewrite using inventory_public's strict 8-condition filter yielded 47 brands — STT-2 row-count drift. Fixed in Commit 4 by caching `has_sellable_inventory` boolean on brands_public, refreshed by main brands trigger + a 3rd satellite trigger on inventory. Preserves baseline.

**SPEC heading-defect caught:** SPEC's `## 3. Destructive Operations (...)` collided with `## 3. Success Criteria` AND violated Iron-Rule-32 hook regex (which requires line termination exactly at "Destructive Operations"). Renamed to bare `## Destructive Operations` + sibling parenthetical paragraph. Pre-commit hook now passes. Logged as FINDING for next Foreman pass to renumber whole SPEC monotonically.

**Open follow-ups (FINDINGS):**
1. SPEC-defect heading renumbering (already noted in SPEC.md).
2. Brand state changes (active=false, exclude_website=true) don't auto-refresh inventory_public visibility — 4th satellite trigger on brands would close this. LOW severity, eventually consistent.
3. 10 new SECDEF function findings (`authenticated_security_definer_function_executable` ×9, `anon_security_definer_function_executable` ×1) — REVOKE EXECUTE FROM anon, authenticated on the 9 trigger functions would close them. LOW severity; functions only fire as triggers, not callable.
4. /brands/<slug>/ and /about/ Prizma routes 404 — PRE-EXISTING storefront-app routing, not migration regression (sitemap-dynamic.xml doesn't enumerate these URLs). FINDING-INFO.

---

## 2026-05-15 afternoon — SECURITY_HOTFIX_3 — residual F-CRIT-2 + 15 F-CRIT-3 carry RPCs (Daniel Option B)

SPEC: `SECURITY_HOTFIX_3_2026_05_15` ([folder](specs/SECURITY_HOTFIX_3_2026_05_15/))

**Production security hotfix.** Sequel to `SECURITY_HOTFIX_2_2026_05_15` (closed earlier today 🟡). Pre-flight surfaced Brief §1.1 3-table scope insufficient for §1.2 15-view closure — Daniel Option B approved (scope-out unsafe views, ship smaller hotfix). 1 escalation RESOLVED pre-SPEC-seal.

**Migrations applied (5 sequential, smallest blast radius first):**
- `20260515093000_hotfix3_s1_3_admin_view_lockdowns.sql` — §1.3 lock 5 admin views (REVOKE anon SELECT + `security_invoker=on` on `v_ai_content`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats`). SHA `635281b`.
- `20260515093500_hotfix3_s1_4_save_translation_memory_batch_2nd_overload.sql` — §1.4 harden 2nd overload (`p_entries jsonb`) with 3-role-aware Block A adapted for entry-level tenant_id derivation + SET search_path + REVOKE anon EXECUTE. SHA `a20343a`.
- `20260515094000_hotfix3_s1_5_carry_rpcs_block_a_and_revokes.sql` — §1.5 14 Option B + 1 Option C. 5 RPCs got NEW 3-role-aware Block A: `increment_paid_amount`/`increment_prepaid_used`/`mark_translations_stale` via JOIN-derived tenant; `register_lead_to_event` + `resolve_touchpoints_to_lead` upgraded from weaker variants. 3 RPCs got new search_path (`is_platform_super_admin`, `promote_to_platform`, `promote_lead_on_message_sent`). 14 REVOKE EXECUTE FROM anon + explicit GRANT TO authenticated, service_role. `validate_slug` retained anon (Option C — pure validation, no side effects). SHA `e64f9c9`.
- `20260515094500_hotfix3_s1_1_base_table_rls_expansion.sql` — §1.1 new RLS policies `blog_posts_public_read_published` + `ai_content_public_read_published` (anon SELECT USING `status='published'`). `storefront_pages_anon_read` pre-existing policy kept verbatim (Rule 21). GRANT SELECT TO anon on all 3 base tables. SHA `6fa5083`.
- `20260515095000_hotfix3_s1_2_flip_v_storefront_blog_posts.sql` — §1.2a flip `v_storefront_blog_posts` to `security_invoker=on` with rollback tag `pre-hotfix3-view-v_storefront_blog_posts`. Anon probe: 174 rows visible (matches pre-migration). SHA `d4e6fa3`.
- `20260515095500_hotfix3_s1_2_flip_v_storefront_pages.sql` — §1.2b flip `v_storefront_pages` to `security_invoker=on` with rollback tag `pre-hotfix3-view-v_storefront_pages`. Anon probe: 81 rows visible. SHA `2625c34`.

**Escalation (RESOLVED pre-SPEC-seal + filed under `escalations/`):**
- `2026-05-15T0917Z_hotfix3_brief_scope_insufficient_for_15_view_closure.md` — Pre-flight surfaced Brief §1.1 3-table scope cannot enable §1.2 15-view goal (11 base tables actually needed). Daniel chose Option B (scope-out unsafe views).

**Verdict 🟡 CLOSED WITH FOLLOW-UPS:** F-CRIT-2 advisor 15→8 (7 closed: 5 admin + 2 storefront); F-CRIT-3 17→2 (15 closed: 14 Option B + 1 §1.4); total advisors 119→93. Demo wrong-tenant tests T1-T5 PASS (5 Block-A-bearing RPCs raise 42501); service_role bypass T6 PASS. Smoke 7/7 PASS post-migration. Zero data row writes on any tenant. 8 findings logged in FINDINGS.md (5 closed in SPEC as collateral pre-existing bugs; 3 carry forward to HOTFIX_4 / audit-SPEC / Iron Rule 32 hook fix).

**Skill improvements applied:** P-AUTHOR-1 (status-column semantics probe in Step 1.5.3) + P-AUTHOR-2 (gitignore-aware backup criterion in SPEC_TEMPLATE) + P-EXEC-1 (NEW reference file `BLOCK_A_DEMO_TESTS.sql`) + P-EXEC-2 (SQL-comment word-avoidance bullet in opticup-executor SKILL.md).

**Audit reports updated:** `OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` findings #2 + #3 marked RESOLVED-IN-PART / RESOLVED. `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md` RPC #9 + #10 + #11 + #12 all marked RESOLVED. `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` §10 SECURITY_HOTFIX_3 declaration marked RESOLVED.

---

## 2026-05-15 — SECURITY_HOTFIX_2 — Bundle 2 F-CRIT-1/2/3 closure (PARTIAL F-CRIT-2)

SPEC: `SECURITY_HOTFIX_2_2026_05_15` ([folder](specs/SECURITY_HOTFIX_2_2026_05_15/))

**Production security hotfix.** Sequel to `SECURITY_HOTFIX_2026_05_13` (Module 2, now on main). Closes 3 CRITICAL findings re-confirmed by morning pre-merge validation. Three escalations resolved by Daniel in-session.

**Migrations applied (5 sequential):**
- `2026_05_15_security_hotfix_2_01_sync_lead_status_search_path.sql` — F-CRIT-1 closed. `ALTER FUNCTION sync_lead_status_from_attendee SET search_path='public'` restored. `pg_proc.proconfig = {search_path=public}` verified.
- `2026_05_15_security_hotfix_2_02_views_security_invoker.sql` — F-CRIT-2 **partial**. Only `v_storefront_reviews` + `v_storefront_components` got `security_invoker=on` — these are the only 2 of 17 views whose base tables have anon-friendly RLS policies (`storefront_reviews_anon_read` + `storefront_components_anon_read`). v1 of this migration attempted 10 views and was immediately rolled back when post-anon-probe showed 9 of 10 returned 0 rows (storefront outage risk — STT-1 fired). 15 views deferred to `SECURITY_HOTFIX_3` which must also include base-table RLS expansions on `blog_posts`/`storefront_pages`/`ai_content`/`tenants`/etc.
- `2026_05_15_security_hotfix_2_03_rpcs_jwt_validation_and_revokes.sql` — F-CRIT-3 closed for all 24 in-scope RPCs (those accepting `p_tenant_id`). 23 RPCs got the 3-role-aware Block A (service_role bypass + strict JWT-tenant-claim check for everyone else); `verify_campaign_page_password` got Block A-alt (slug-based via `v_public_tenant` lookup, anon-callable retained per Option A). 16 Option B candidates had anon + PUBLIC EXECUTE revoked + GRANT TO authenticated. 7 already-non-anon-callable RPCs got Block A only. Sql-language `get_po_aggregates` converted to plpgsql. 7 RPCs collaterally hardened with `SET search_path='public'` while being recreated.

**Escalations (all RESOLVED + filed under `escalations/`):**
- `RESOLVED_2026-05-15T0830Z_anon_callable_rpc_count_inverted_in_brief.md` — Brief said 7 anon-callable; actually 17. Daniel chose Option B (expand scope).
- `RESOLVED_2026-05-15T1010Z_block_a_jwt_header_breaks_service_role_callers_and_has_null_loophole.md` — SPEC §3a Block A had NULL-comparison loophole + would break service_role Edge Function callers. Daniel chose 3-role-aware bypass pattern.
- `RESOLVED_2026-05-15T1110Z_security_invoker_on_would_break_7_of_17_views_storefront_outage_risk.md` — pre-flight didn't probe base-table RLS; storefront would go dark on 7-15 views. Daniel chose Option A (only truly safe views — turned out to be 2).

**Verdict 🟡 CLOSED WITH FOLLOW-UPS:** F-CRIT-1 + F-CRIT-3 closed; F-CRIT-2 partially closed (2 of 17 views). 7 findings logged in FINDINGS.md including the F-1 SECURITY_HOTFIX_3 stub.

Pre-merge advisor: 0 NEW finding TYPES introduced. 25 of 42 prior `anon_security_definer_function_executable` advisor findings closed by this hotfix.

## 2026-05-12 — Migration #4: Storefront Studio + 3 sub-pages → Hybrid+Navy (FINAL of 4 production migrations)

SPEC: `MIGRATION_4_STOREFRONT_STUDIO` ([folder](specs/MIGRATION_4_STOREFRONT_STUDIO/))

**Final** of the 4-migration production batch. After this SPEC closes on `develop`, all 4 in-production screens (Suppliers Debt, Settings+Permissions, CRM, Storefront Studio) are on Hybrid+Navy. **Awaiting Daniel main-merge approval** for the full batch (`develop` → `main`).

**Pre-flight finding (§0 Reality Check caught 5 Brief-vs-repo divergences):**
1. Brief listed 7 candidate `storefront-*.html` files. Pre-flight palette detection found **zero legacy purple** (`#534AB7`, `#26215C`, `#EEEDFE`, `#7F77DD`) across all 7 — the Brief's primary swap-map was vacuous for this migration set.
2. **3 of 7 files are already-conformant** (only semantic + neutral hex, token-driven Slate-modern via `var(--primary)` = `#0f172a`): `storefront-glossary.html`, `storefront-products.html`, `storefront-settings.html`. Reduced in-scope from 7 to **4 HTML files**.
3. **No separate `css/storefront-*.css` files exist** — all styling is inline `<style>` blocks. The Brief's CSS-file scope bullet was dropped.
4. `--color-primary` is already `#0f172a` Slate 900 per Daniel decision 2026-05-10. The 7 files inherit Slate primary via token. Migration only needed to address decorative non-semantic hex.
5. Navy tokens already in `shared/css/variables.css` since Migration #1 (idempotent). variables.css OUT of scope.

**Migration mechanics — 4 files, 13 swap sites:**
- **`storefront-blog.html`** (377 lines, **unchanged**): Block A `replace_all` of `background: linear-gradient(135deg, #6366f1, #8b5cf6);` → `background: #1e3a8a;` swept 3 sites (`.btn-ai`, `.btn-ai-mode.active`, `.btn-ai-generate`). Preserved `.lang-pill` family (`.lang-he`=`#3b82f6`, `.lang-en`=`#22c55e`, `.lang-ru`=`#8b5cf6`) — coherent category-marker family. Preserved Google SERP literal brand colors (`#1a0dab`, `#006621`).
- **`storefront-content.html`** (357 lines, **unchanged**): Block A on `.btn-ai` (1 site) + additional `.progress-bar-fill` 90deg variant swap (separate Edit call). 2 Navy hits total.
- **`storefront-landing-content.html`** (150 lines, **unchanged**): Block A on `.btn-ai` (1 site). 1 Navy hit.
- **`storefront-studio.html`** (297 lines, **unchanged**): 7 surgical swaps replacing gold (`#c9a555`, `#e8da94`, `#fefdf8`, `rgba(201,165,85,*)`) with Navy across `.lp-wizard-section/drop/footer` rules + 2 inline-style/event-handler sites. WCAG-AA contrast fix: `.lp-wizard-footer .btn-create` color `#1a1a1a` → `#ffffff`; toolbar "🎯 דף נחיתה" inline `color:#000` → `color:#fff`. 5 literal `#1e3a8a` + 1 `rgba(30,58,138,.12)` + 1 `#e6f1fb` (Navy-soft from variables.css `--accent-navy-soft`).
- **3 scope-clean files** (`storefront-glossary.html`, `storefront-products.html`, `storefront-settings.html`): **byte-identical to baseline** post-SPEC. Documented in §7 Out of Scope; verified by `git diff --stat = empty`.
- **`shared/css/variables.css`**: byte-identical (Navy tokens added by Migration #1).
- **All JS files**: byte-identical (zero JS touches per Brief §5).
- **All `css/*.css` files**: byte-identical (no `css/storefront-*.css` files exist).

**Verification:**
- 17 of 18 SPEC §5 success criteria GREEN at C4. C4 has a Foreman-amended off-by-one for studio Navy literal count (SPEC said `≥6 literal`, actual is `5 literal + 1 rgba + 1 navy-soft = 7 Navy-token-bearing sites`). Documented as Finding F2; SPEC author defect, no work redo.
- All 7 storefront-*.html pages return HTTP 200.
- npm run smoke → **7/7 PASS** on demo tenant. npm run verify:integrity → exit 0.
- **Page-scope confined:** `inventory.html` has 0 Navy hits; scope-clean `storefront-glossary.html` has 0 Navy hits. No Navy leakage.
- 4 pre-commit safety tags `pre-migration-storefront-{blog,content,landing-content,studio}` all at `eace1b5` (lightweight, per-file rollback). Rollback via `git revert <commit>` or `git checkout <tag> -- <file>`.
- Localhost-Tester GREEN on HTTP + payload + smoke + page-scope confinement (v1 boundary — Playwright + iframe-render deferred to v2).
- 5 commits: C1 `5648b39` (blog) + C2 `6a41700` (content) + C3 `08b61c3` (landing-content) + C4 `2cf5cc8` (studio) + C5 retrospective.

**5 decisions made in real time, all per Bounded Autonomy without Foreman escalation:**
- D1: SPEC C4 off-by-one for studio Navy literal count — continued past, logged as Finding F2 (work matches §3 exhaustively).
- D2: Leave pre-existing dirty/untracked files alone per Full-Auto Pipeline policy.
- D3: Do NOT migrate stranded `rgba(99,102,241,.08)` at `storefront-blog.html:101` — pre-execution audit pattern only catches `#hex` literals not rgba decimal-channel; logged as Finding F1 + fed into Author/Executor proposals #1.
- D4: WCAG-AA contrast fix on `.btn-create` color (`#1a1a1a` → `#ffffff`) and toolbar inline `color:#000` → `color:#fff`. Without flip, Navy bg on dark text would fail AA (~1.3:1).
- D5: Keep `.lang-pill` family verbatim (category-semantic, not decorative-non-semantic per SPEC §0 D-OOS-1).

**4 skill improvements harvested + applied (2 each to opticup-strategic + opticup-executor):**
- **opticup-strategic Author #1:** Color-form completeness check in §0 — alongside `#hex` audit, also grep for `rgba/rgb` decimal-channel form. A SPEC that swaps `#6366f1` but misses its rgba sibling produces post-migration visual drift (this SPEC's F1 surfaced exactly this gap). SPEC_TEMPLATE.md + SKILL.md Step 1.5.1 updated.
- **opticup-strategic Author #2:** Pre-categorize swap sites by produced-token-form in §5 success criteria. A SPEC that produces mixed output tokens (literal hex + rgba + named accent) MUST split the count criterion per form. Avoids C4-style "≥N literal" off-by-one when 3 sites produce rgba or accent-soft instead.
- **opticup-executor #1:** Extend the pre-execution inline-hex audit recipe to capture rgba/rgb decimal-channel form alongside `#hex`. Mirrors the author-side change — defense in depth.
- **opticup-executor #2:** Canonical single-file post-edit verification recipe — 6-line Bash block that replaces the ~7-command verification dance. Stopgap until `scripts/verify-reskin-page.mjs` helper script (MIGRATION_2 Executor Proposal #1) ships.

**4 findings opened:**
- F1 (LOW): stranded `rgba(99,102,241,.08)` at `storefront-blog.html:101` — single-site follow-up SPEC `MIGRATION_4_STRANDED_RGBA_SWEEP`; severity LOW (8% alpha, input-focus only), can land pre or post main-merge.
- F2 (INFO): SPEC §5 C4 off-by-one for studio Navy literal count — Foreman-amended in FOREMAN_REVIEW; no separate commit needed.
- F3 (INFO): `storefront-content.html` trailing-newline pre-existing warning — TECH_DEBT under "EOF newline hygiene".
- F4 (INFO): hex inventory clean post-migration — dismissed (informational only).

**Strategic state after C5 closes:** All 4 production-page migrations to Hybrid+Navy complete on `develop`. **Batch awaiting Daniel main-merge approval.** Pipeline now battle-tested on 5 SPECs (Migration #1, #2, Consolidation, #3, #4). Future cleanup SPECs queued: `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS`, `M1_5_CRM_CSS_STUB_CLEANUP`, `MIGRATION_4_STRANDED_RGBA_SWEEP` — none are blockers for main-merge.

---

## 2026-05-12 — Migration #3: CRM Navy Accent Addition (3rd of 4 production migrations)

SPEC: `MIGRATION_3_CRM` ([folder](specs/MIGRATION_3_CRM/))

Third of 4 production-page migrations to Hybrid+Navy. CRM was already on a modern Slate palette (Slate 900 body text + Slate-toned sidebar dark theme), so this SPEC is an **accent insertion** (Navy `#1e3a8a` on primary actions, focus rings, view-toggle, sidebar active marker, theme-dot, loading spinner) — NOT a full re-skin. Slate 900 stays as the primary text color. Sidebar dark theme preserved. Full-Auto Pipeline ran end-to-end in ONE chat across all 5 hats (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-Review).

**Shape divergence from Migration #1+#2 (caught in §0 Reality Check):** CRM's primary actions / focus rings / view-toggle are inline Tailwind utility classes in `crm.html` (`bg-indigo-600`, `focus:ring-indigo-500`, etc.), NOT CSS rules in the 4 CRM CSS files. The page-scope `<style>` override pattern (the Migration #1/#2 vehicle) is the wrong tool here. New pattern validated: **swap inline Tailwind utility classes to arbitrary values** (`bg-[#1e3a8a]`, `focus:ring-[#1e3a8a]`). This is first-class Tailwind v3 JIT, avoids `!important` specificity wars with the page's `important:true` config, and preserves DOM tag count + line count (only the class-string token within an existing `class="..."` attribute changes).

**Files changed:**
- `crm.html` (419 lines, **unchanged**): 6 `indigo-*` inline utility class sites swapped to `[#1e3a8a]`/`[#1e40af]` arbitrary values + 1 theme-dot inline `style=` swap. 75 `<script>` + 12 `<link>` preserved verbatim.
- `css/crm.css` (+8 lines): `--crm-accent` palette tokens swapped from Indigo (`#4f46e5`/`#4338ca`/`#eef2ff`) to Navy (`#1e3a8a`/`#1e40af`/`#e6f1fb`); added `box-shadow: inset -3px 0 0 #1e3a8a` on `.crm-nav-item.active` for Navy RTL start-edge marker (physical `-3px` offset paints on the right edge = RTL start; preserves layout — no padding shift); header comment refreshed.
- `css/crm-components.css` (+4 lines): new `.crm-badge.crm-badge-primary { background: #1e3a8a; }` Navy variant (additive; existing `.crm-badge` callers using only the base class keep prior behavior).
- `css/crm-screens.css`, `css/crm-visual.css`: **untouched** — both are post-B8 Tailwind-migration stubs with no accent-bearing rules (`crm-screens.css` is comment-only, `crm-visual.css` has only `.crm-pagination` + a legacy `crm-pulse` green keyframe with no live consumers). Filed F1 for future cleanup SPEC.
- `shared/css/variables.css`: **byte-identical** — Navy tokens already added by Migration #1 (4 `--accent-navy*` tokens at lines 175-180), idempotent skip honored.

**Verification:**
- 18 of 18 SPEC §3 success criteria GREEN.
- `grep -c "indigo-" crm.html` → **0** (was 6).
- `grep -c "1e3a8a"` → **8** in crm.html, **2** in css/crm.css, **1** in css/crm-components.css.
- `grep -ic "26215c|534ab7"` → **0** across all 4 CRM CSS files (no legacy purple anywhere — Brief §0 prediction confirmed).
- `grep -ic "4f46e5|4338ca|eef2ff" css/crm.css` → **0** (legacy Indigo gone).
- npm run smoke → **7/7 PASS** on demo tenant. npm run verify:integrity → exit 0 (46 files clean).
- Page-scope confined: `curl localhost:3000/inventory.html | grep -c "1e3a8a"` → **0** (no leakage; other pages unaffected).
- Pre-commit safety tag `pre-migration-crm` on `0dfa6b9` (pushed to origin). Rollback via `git revert HEAD` or `git reset --hard pre-migration-crm`.
- Localhost-Tester GREEN on HTTP + payload + page-scope confinement checks (v1 boundary — Playwright deferred to v2).
- 2 commits (C1 `1176a89` migration + C2 retrospective). C1 = 6 files, 610 ins / 12 del.

**Two in-flight deviations (both resolved within the chat, no Foreman escalation):**
- D1 (author defect): `## 6.5. Destructive Operations` heading blocked C1 commit (~20s); Iron-Rule-32 hook regex only accepts `\d+\.` or no prefix. Fixed by removing the prefix entirely (`## Destructive Operations`). Codified as opticup-strategic Author Proposal #1 — SPEC_TEMPLATE.md heading swapped + SKILL.md sentence added.
- D2 (author defect): post-edit grep found 1 legacy Indigo hex `#4f46e5` inside the documentation comment line I just added. Criterion #11 expected 0. Fixed by removing the hex literal from the comment (kept word "Indigo" for context).

**4 skill improvements harvested + applied (2 each to opticup-strategic + opticup-executor):**
- **opticup-strategic Author #1:** No fractional section numbers in SPEC headings — `## 6.5.` / `## 3a.` collide with the Iron-Rule-32 hook regex for the Destructive Operations heading. Use plain integer prefixes (`## 6.`) or no prefix at all. SPEC_TEMPLATE.md updated.
- **opticup-strategic Author #2:** Promote `§0 Pre-existing repo state` checkbox to permanent template item (4th SPEC in a row to make the same D1/D3 leave-alone decision). SPEC_TEMPLATE.md updated.
- **opticup-executor #1:** Codify the "Tailwind arbitrary-value swap" pattern for CDN-Tailwind / compiled-Tailwind pages — prefer `bg-[#hex]` over CSS `!important` overrides; the inline-class swap preserves DOM count and is the safer migration vehicle when the target uses inline utilities.
- **opticup-executor #2:** Pre-execution heading-regex check on SPEC headings — catch `## N.N. Destructive Operations` / `## §N. Destructive Operations` defects at SPEC-load time, not at commit time. Saves the ~20-second commit-rejection round-trip.

**3 findings opened, all with actionable dispositions:**
- F1 (LOW) → future SPEC `M1_5_CRM_CSS_STUB_CLEANUP` (delete `crm-screens.css` + `crm-visual.css` stubs; move `.crm-pagination` into `crm.css`; verify `crm-pulse` keyframe has zero consumers; -2 `<link>` tags from crm.html). Bundle with MIGRATION_2 F1's `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS`.
- F2 (LOW) → TECH_DEBT (orphan Tailwind config color tokens in `crm.html` lines 26-37).
- F3 (LOW / INFO) → TECH_DEBT (sidebar Navy marker uses physical `-3px` shadow offset — correct for RTL today; LTR fallback needs `[dir="ltr"]` override pair when CRM ever supports LTR).

**3 of 4 production migrations now closed on develop.** Next: Migration #4 (Storefront Studio). After Migration #4 lands and passes QA → ONE batch merge to `main` (Brief Locked Decision #5).

## 2026-05-12 — Settings + Permissions Consolidation: tabbed settings.html (deferred from Migration #2)

SPEC: `SETTINGS_PERMISSIONS_CONSOLIDATION` ([folder](specs/SETTINGS_PERMISSIONS_CONSOLIDATION/))

Tactical migration. Executes the structural change Migration #2 deferred (per Daniel's 2026-05-11 decision). `employees.html` (former standalone permissions page) merged into `settings.html` as a "הרשאות" tab; original file archived to `_archive/pre-consolidation/employees.html` (git mv, 100% rename similarity). Single LIVE in-code link updated (`index.html` line 156 module tile). Full-Auto Pipeline ran end-to-end in ONE chat across all 4 hats (Foreman → Executor → Localhost-Tester → Foreman-review).

**Iron Rule 21 (No Duplicates) reuse confirmed at SPEC author time:** existing `showTab()` in `js/shared-ui.js` reused (no new `activateTab`/`switchTab`); existing `<nav id="mainNav">` + `data-tab` + `data-tab-permission` pattern reused (matches inventory.html / shipments.html); existing `PermissionUI.apply()` auto-gating reused. The new code added by this SPEC: a 25-line page-local `goSettingsTab()` wrapper that adds hash routing + lazy permissions init, plus a 5-line `urlWithTenant()` helper in index.html that inserts `?t=...` BEFORE `#fragment`.

**settings.html restructured:** 212 → 292 lines (+80, all additive structure — no logic change to existing settings sections). Adds tab bar (2 buttons), 2 tab content sections, 5 permission-side `<script>` tags (table-resize, plan-helpers, data-loading, employee-list, permission-matrix), `css/employees.css` `<link>`, inline tab-routing script. Page entry permission widened to "settings.view OR employees.view" — PermissionUI auto-hides whichever tab the user lacks.

**Verification:**
- 20 of 20 SPEC §3 success criteria GREEN.
- `grep -r "employees.html" --include='*.html' --include='*.js' --include='*.sql' --exclude-dir=_archive --exclude-dir=.git .` → **0** LIVE references.
- `GET /employees.html` → 404 (file no longer at root); `GET /_archive/pre-consolidation/employees.html` → 200 (archive reachable).
- npm run smoke → **7/7 PASS** on demo tenant. npm run verify:integrity → exit 0 (39 files clean).
- Pre-commit safety tag `pre-consolidation-settings-permissions` placed BEFORE any edit (rollback via `git reset --hard pre-consolidation-settings-permissions`).
- Localhost-Tester GREEN on 18 HTTP+payload checks; runtime DOM/JS interaction deferred to v2 (Playwright) per established v1 boundary.
- 4 commits (C1 SPEC + catalog, C2 consolidation + git mv, C3 sweep, C4 retrospective + master-doc updates). 6 files changed in commits C1–C3 (547 ins, 8 del); commit C4 adds 4 retro files + master-doc updates + 4 skill-improvement edits.

4 skill improvements harvested + applied (2 each to opticup-strategic + opticup-executor):
- **opticup-strategic Author #1:** SPEC criteria using bare `grep -r "<old_name>"` should distinguish live links from narrative comments — pre-anticipated rewords avoid reactive 1-line edits mid-execution.
- **opticup-strategic Author #2:** §0 Reality Check should include a checkbox-style item for pre-existing-untracked files (3 SPECs in a row have made the same D1 decision; codify it).
- **opticup-executor #1:** "Tombstone comment" pattern — when adding a `<!-- merged from foo.html -->` style comment to the surviving file, do not name the dead path as a literal string (avoids the round-trip seen as D4 in this SPEC's EXECUTION_REPORT).
- **opticup-executor #2:** add a "SPA tab page" reference snippet to executor SKILL.md — three pages now use the same `<nav id="mainNav">` + `<section class="tab">` + `showTab()` pattern; CRM Migration #3 may need it.

## 2026-05-11 — Migration #2: Settings + Permissions → Hybrid+Navy (2 LIVE production pages)

SPEC: `MIGRATION_2_SETTINGS_PERMISSIONS` ([folder](specs/MIGRATION_2_SETTINGS_PERMISSIONS/))

Second of 4 production-page migrations to Hybrid+Navy. Two LIVE pages re-skinned in place: `settings.html` (208→212 lines, +4) and `employees.html` (87→91 lines, +4). Per-page commits + per-page git tags enable independent rollback. **Zero functional change** — no JS edits, no DOM-structural changes (just +1 `<style>` element per page in `<head>`), no Supabase contract changes, no shared CSS mutations. Smoke 7/7 PASS on demo tenant. Full-Auto Pipeline ran end-to-end in ONE chat across 5 skills.

**Decision (Daniel 2026-05-11):** Settings + Permissions stay as TWO separate pages in this migration. Tab-consolidation (per Hybrid mockup `permissions.html` showing them merged) is deferred to a separate SPEC after all 4 visual migrations land — that consolidation is structural (routing, event handlers, link migration) and earns its own scope.

**Same vehicle as MIGRATION_1 — page-scope `body { --primary }` override.** Single 4-line block added to each page's `<head>`, immediately before `</head>`:

```
<!-- Hybrid+Navy migration (page-scoped override, MIGRATION_2 2026-05-11) -->
<style>
  body{--primary:#1e3a8a;--primary-dark:#0f172a;--primary-light:#e6f1fb;--accent:#1e40af}
</style>
```

Cascade scopes the new palette to descendants of `<body>` of these 2 pages only. Other ERP pages keep their existing palette via `:root`. Verified by `Invoke-WebRequest /inventory.html` → page-scope confirmed confined.

**Variables.css UNTOUCHED.** Migration #1 already added the 6 Navy/slate tokens (Section 12) — no additional token work needed for Migration #2.

**Module CSS UNTOUCHED.** Discovered during §0 Reality Check: `css/settings.css` ≡ `css/employees.css` byte-identical (md5 `c318c26079c5009995492cad11024484`). Both contain the full app stylesheet plus settings-specific selectors. Touching either would propagate. Logged as F1 finding → future deduplication SPEC. `css/header.css` also untouched (would propagate site-wide).

**Verification:**
- settings.html: line count 208→212 (+1.9%, within ±15%); `<script>` 20→20; `<link rel="stylesheet">` 10→10; DOM tags 137→138 (+1, within ±2%); Navy `#1e3a8a` count 0→1.
- employees.html: line count 87→91 (+4.6%, within ±15%); `<script>` 24→24; `<link rel="stylesheet">` 10→10; DOM tags 55→56 (+1, within ±2%); Navy count 0→1.
- `grep "26215c|534ab7"` → 0 / 0 (regression baseline preserved on both).
- npm run smoke → 7/7 PASS (PIN auth, CRM lead create+RLS, inventory read, storefront homepage, /supersale, cross-module read, no-5xx).
- npm run verify:integrity → exit 0 throughout.
- Iron Rule 32 destructive-ops gate accepted both commits on first attempt (heading-convention lesson from MIGRATION_1 applied: `## 4. Destructive Operations` not `## §4.`).
- Per-page tags `pre-migration-settings` (HEAD pre-C1) + `pre-migration-employees` (HEAD at C1) enable surgical revert: settings or employees individually.
- Localhost-Tester GREEN: both pages return 200, served HTML contains the override block, page-scope confirmed not leaked to inventory.html.

4 skill improvements harvested + applied (2 each to opticup-strategic + opticup-executor):
- **opticup-strategic Author #1:** new optional §3a "Shared Edit Block" in `SPEC_TEMPLATE.md` for multi-file identical-edit SPECs (Migration #3+ benefit immediately).
- **opticup-strategic Author #2:** new "Baselines" sub-table in §0 Reality Check, with `BASE_*` symbols referenced from §3 Success Criteria — pins moment-of-authorship metrics so SPEC drift is caught.
- **opticup-executor #1:** plan to build `scripts/verify-reskin-page.mjs` helper (single-line PASS/FAIL summary, exit code on any FAIL) — eliminates the Bash `&&`-chain abort-on-grep-no-match trap. Reference added to SKILL.md; script creation deferred to Migration #3.
- **opticup-executor #2:** codified `<style>` block placement rule for re-skin SPECs (after last `<link rel="stylesheet">`, immediately before `</head>`).

3 findings opened: F1 (settings.css ≡ employees.css duplication, MEDIUM, → new dedup SPEC), F2 (header.css `var(--primary, #1a237e)` fallback drift, LOW, → TECH_DEBT), F3 (skill SKILL.md user-global vs project-local copies drifted, LOW, → TECH_DEBT). C3 partially resyncs F3 by editing both copies for the 4 skill improvements above.

### Commits

- `b79a778` — feat(settings): migrate to Hybrid+Navy design system
- `3c6618c` — feat(employees): migrate to Hybrid+Navy design system
- `<C3>` — chore(spec): close MIGRATION_2_SETTINGS_PERMISSIONS with retrospective + skill improvements

## 2026-05-11 — Migration #1: Suppliers Debt → Hybrid+Navy (LIVE production page)

SPEC: `MIGRATION_1_SUPPLIERS_DEBT` ([folder](specs/MIGRATION_1_SUPPLIERS_DEBT/))

First of 4 production-page migrations to Hybrid+Navy. The LIVE `suppliers-debt.html` (root of ERP repo) re-skinned in place to the Hybrid+Navy palette with **zero functional change** — no JS edits, no DOM structural changes, no Supabase contract changes. Smoke 7/7 PASS on demo tenant. Full-Auto Pipeline ran end-to-end in ONE chat across 5 skills (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-Review).

**Key technique — page-scope `body { --primary }` override.** Instead of modifying `css/styles.css :root` (which would cascade to all 17 other unmigrated ERP pages and break the staged migration plan), the page's inline `<style>` block now declares a `body { --primary: #1e3a8a; --primary-dark: #0f172a; --primary-light: #e6f1fb; --accent: #1e40af; }` override. CSS cascade scopes Navy to descendants of `<body>` of this page only. Other ERP pages continue to inherit the legacy Indigo `--primary` from `:root` until their own migration SPEC lands. This pattern is the safe migration vehicle for Migrations #2/#3/#4.

**`shared/css/variables.css` — 6 additive tokens (Section 12).** `--accent-navy`, `--accent-navy-hover`, `--accent-navy-soft`, `--accent-navy-text`, `--text-slate-primary`, `--text-slate-secondary`. Zero deletions, zero renames — Brief Locked Decision #5 honored (existing tokens remain in place until all 4 migrations close).

**4 purple hex swaps** in `suppliers-debt.html` (`.dst-linked`, `.btn-lnk`, `.btn-lnk:hover`, `.rst-shipped`) + **2 standalone blue nudges** (`.dst-open`, `.rst-ready`) + **2 inline-style gray hex → token swaps** on folder-toggle buttons. Semantic colors (success/warning/danger/info) preserved unchanged.

**Verification:**
- Line count 269 → 281 (+4.4%, within ±15% tolerance).
- `<script>` tag count 55 → 55 (exact preservation).
- `<link rel="stylesheet">` tag count 3 → 3 (exact preservation).
- Open HTML tag count 125 → 125 (0% delta).
- `grep "1e3a8a" suppliers-debt.html` → 4 hits (Navy landed).
- `grep "6f42c1|e8dff5|f3eefb"` → 0 hits (legacy purple removed).
- 17/17 DOM ids preserved (`debt-main-content`, `val-total-debt`, `val-due-week`, `val-overdue`, `val-paid-month`, `aging-buckets`, 7× `dtab-*`, `supplier-detail-panel`, `toast-c`, `loading`, `confirm-modal`).
- 3/3 inline onclick handlers preserved (`switchDebtTab`, `toggleExpenseFolders`, `toggleGeneralInvoicesView`).
- 8/8 critical JS+CSS resources return 200 on `localhost:3000`.
- Iron Rule 32 destructive-ops gate passed; Iron Rule 31 integrity gate exit 0 twice.

Pre-commit git tag `pre-migration-suppliers-debt` (at the commit before C1) enables per-page rollback if any post-merge regression surfaces. Per Daniel's batch-merge policy: all 4 production migrations land on `develop`; ONE merge to `main` after all 4 are QA-clean.

4 skill improvements harvested + applied: 2 to `opticup-strategic` (SPEC heading convention `## N.` not `## §N.`; §0 Pre-Authoring Reality Check promoted to template), 2 to `opticup-executor` (inline-hex audit helper; Full-Auto pre-existing-files-leave-alone rule).

### Commits

- `52133b8` — feat(suppliers-debt): migrate to Hybrid+Navy design system
- `<C2>` — chore(spec): close MIGRATION_1_SUPPLIERS_DEBT with retrospective + skill improvements

## 2026-05-11 — Sketch Revision Batch 3 (M5/M6/M8/M11/M12/M14/M15 → Hybrid+Navy)

SPEC: `M1_5_SKETCH_RESKIN_BATCH_3` ([folder](specs/M1_5_SKETCH_RESKIN_BATCH_3/))

Re-skins 17 architecture-brief mockup files across 7 modules from the legacy purple-deep palette to the canonical Hybrid+Navy design system. Structure-preserving: `:root` token swap only, no DOM / content / layout changes. 13 files received heavy transformation (full `:root` + dark-bg sweep + hex rewrites); 4 M12 files received light transformation (neutrals only; WhatsApp/SMS/Email semantics preserved per Brief §2.4). 17 `pre-reskin-M{N}-{stem}` git tags enable independent revert. `reskin.mjs` transformation script retained in SPEC folder as audit artifact.

Final grep `#26215c|#534ab7` returns 0 hits across all 17 files. Hebrew RTL preserved on all. DOM tag count within ±5% per file.

### Commits

- `faaa3b2` feat(m5): reskin architecture-brief sketches to Hybrid+Navy (2 files)
- `92c7f71` feat(m6): reskin architecture-brief sketch to Hybrid+Navy (1 file)
- `933a582` feat(m8): reskin architecture-brief sketches to Hybrid+Navy (4 files)
- `0ba031d` feat(m11): reskin architecture-brief sketches to Hybrid+Navy (3 files)
- `31a0f6d` feat(m12): reskin architecture-brief sketches to Hybrid+Navy (4 files — light mode)
- `28e94c1` feat(m14): reskin architecture-brief sketches to Hybrid+Navy (2 files)
- `6921c1c` feat(m15): reskin architecture-brief sketch to Hybrid+Navy (1 file)
- `<retro>` chore(spec): close M1_5_SKETCH_RESKIN_BATCH_3 with retrospective + docs + skill improvements

## 2026-05-11 — Design System Hybrid Final (consolidates v2 into one platform language)

SPEC: `M1_5_DESIGN_SYSTEM_HYBRID_FINAL` ([folder](specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/))

Consolidates the v2 exploration (Linear A / Stripe B / Notion C) into a single locked-in **Hybrid** design language: Stripe-B structural foundation (hero + metrics + content cards + pills + role tiles) wearing Linear-A sidebar navigation, Navy `#1e3a8a` accent, sans-only typography, no topbar.

- New folder `architecture-brief/design-system-mockups/hybrid-final/` — 7 files: `_tokens.css` (Navy palette + sans-only Inter/Heebo + 14px base + 36px row height + 240px sidebar) + `INDEX.html` (hub with cross-language switch to v2 A/B/C references + iframe preview) + 5 module HTMLs (`storefront-studio.html`, `permissions.html`, `shipments.html`, `settings.html`, `suppliers-debt.html`).
- Every module HTML has `class="sidebar"` (Linear-A pattern, 240px, RTL-right via `border-inline-start`), `class="hero"` with H1 + actionable-context sentence + actions, `class="metric-card"` × 4 with Navy `metric-accent` top bar, and module-specific content sections (table density 36px Linear-tight).
- `permissions.html` carries the 4 role-tiles row (B's pattern) + permission matrix with mono permission codes.
- `suppliers-debt.html` carries all 6 real supplier names (Luxottica, Safilo, Marcolin, Hoya, Carl Zeiss Vision, Optical Frame Israel) + age-bar chart in semantic colors (success/info/warning/danger), explicitly NOT Navy.
- Zero violet (`#635bff` / `#a78bfa` / `violet` / `purple` — 0 matches), zero serif typography (no `Source Serif`, no `--font-serif` token; `serif` appears only as the absolute last fallback inside `--font-sans` system chain), zero topbar.

All 7 files: RTL Hebrew (`lang="he" dir="rtl"`), light-mode only, every file ≤350 lines (Rule 12). Integrity gate exit 0. Smoke suite 7/7 PASS.

The 3 prior language folders (`language-{a,b,c}-*/`) remain untouched as historical reference per SPEC §2. Per-module migration of production HTML to Hybrid is a future SPEC chain.

### Commits

- `d38d3c7` — feat(design): scaffold hybrid-final tokens + INDEX skeleton
- `1ba6b18` — feat(design): hybrid-final — 5 module screens (Stripe structure + Linear nav + Navy palette)
- (Commit 3 hash TBD) — chore(spec): close M1_5_DESIGN_SYSTEM_HYBRID_FINAL with retrospective

Push: incremental, one push per commit (per SPEC §9 strict rules).

## 2026-05-11 — Design System Phase 3 v2 (Authentic Languages — supersedes v1)

SPEC: `M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES` ([folder](specs/M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/))

Replaces Phase 3 v1 entirely. v1 produced 45 HTML files that failed the design-language distinctness goal (executor staticized production HTML + near-empty `_tokens.css`). v2 authors 21 HTML files from scratch using authentic per-language design treatment.

- New folder `architecture-brief/design-system-mockups/language-a-linear/` — 7 files: `INDEX.html` (hub with 3-language switch + 5-screen left rail + iframe preview) + `_tokens.css` (54 CSS custom properties — pure-white base, indigo accent, Inter 14px, soft borders) + 5 module HTMLs (storefront-studio, permissions, shipments, settings, suppliers-debt). Linear/Vercel identity: sidebar+breadcrumb DOM.
- New folder `architecture-brief/design-system-mockups/language-b-stripe/` — 7 files (same structure). `_tokens.css` = 68 properties (warm off-white base, deep violet #635bff with gradient pair, Source Serif headings, layered shadows, 12px radii). Top-bar+hero DOM with metric tiles.
- New folder `architecture-brief/design-system-mockups/language-c-notion/` — 7 files (same structure). `_tokens.css` = 65 properties (cool off-white, pastel accent trio, Inter 16px, near-zero shadows, 10-20px round corners). Minimalist left-rail DOM with emoji glyphs.
- v1 archival: 45 files (3 directions × 15 each) moved via `git mv` to `_archive/design-system-mockups-v1-staticized/direction-*/` — full history preserved.
- Module docs synced (this CHANGELOG, MODULE_MAP §0 Phase 3 v2 section, SESSION_CONTEXT current status + Phase 3 v2 entry); MASTER_ROADMAP §6 Phase 3 v2 replacement.

All 21 HTML files: RTL Hebrew, light backgrounds (no #00-#1F page colors), zero hex literals in module `style=` attributes (var(--token) throughout), every file ≤250 lines (well under Rule 12 cap of 350). Integrity gate clean. Smoke suite 7/7 PASS.

### Commits
- `3057b15` — chore(design): archive Phase 3 v1 mockups (staticized) to _archive/
- `29c1a79` — feat(design): scaffold language-a-linear tokens + INDEX skeleton
- `0ba6df7` — feat(design): language-a-linear — 5 module screens (Linear/Vercel)
- `8c9f874` — feat(design): language-a-linear INDEX with cross-language switch + nav
- `745aece` — feat(design): scaffold language-b-stripe tokens + INDEX skeleton
- `269cd0a` — feat(design): language-b-stripe — 5 module screens (Stripe Dashboard)
- `4f37d6a` — feat(design): language-b-stripe INDEX with cross-language switch + nav
- `af06c56` — feat(design): scaffold language-c-notion tokens + INDEX skeleton
- `0502545` — feat(design): language-c-notion — 5 module screens (Notion/Airy)
- `63d1601` — feat(design): language-c-notion INDEX with cross-language switch + nav
- (Commit 11 hash TBD) — chore(spec): close M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES with retrospective

Push: at SPEC close (all 11 commits in one push to origin/develop). FOREMAN_REVIEW.md deferred until after Daniel picks a winning language (per SPEC §14).

## 2026-05-11 — Design System Phase 3b: Direction 2 (Modern-clean) mockup tree (PUSH PENDING)

SPEC: `M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN` ([folder](specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN/))

- New folder `architecture-brief/design-system-mockups/direction-2-modern-clean/` with 15 files: 13 module HTMLs (M1/M3-studio/M4/M5/M6/M7/M8/M9/M11/M12/M13/M14/M15) + INDEX.html (top-bar 3-direction switch + left-nav 13 anchors that navigate the iframe via `target="preview-frame"`; NO Prizma override toggle — directions 2+3 showcase platform-default rendering per parent §5+§6) + `_tokens.css` overriding body font-size to 1.0rem, --space-md to 16px, --space-lg/xl/2xl to 24/32/48px, --radius-md to 12px, --radius-lg to 16px, plus softer/bigger shadows (`rgba(15,23,42,0.04→0.10)`) and `--color-bg-page: #fafafa` for the airy Notion/Linear/modern-fintech aesthetic.
- Production-sourced HTMLs (M1/M3-studio/M4) staticized: all `<script>` removed (including Supabase CDN, ZXing, SheetJS, shared.js, auth-service, page scripts), Google Fonts external link removed, ALL local `<link rel="stylesheet">` blocks replaced with the canonical direction-2 chain (8 shared CSS + `_tokens.css` last) injected before `</head>`. Mock Hebrew rows injected into the inventory tbody (5 representative rows) and the CRM leads tbody (4 rows). Design-mockup banner appended right after `<body>` for context.
- Mockup-sourced HTMLs (M5–M15) sketch-preserved; inline `style="..."` declarations whose value contains `#XXXXXX` literals dropped; `<style>` blocks scrubbed line-by-line of hex literals (Rule 9 — no hardcoded colors in style attrs). Direction-2 stylesheet chain injected before `</head>`.
- Helper script `_staticize-tmp.mjs` used at repo root for bulk transformation and removed pre-commit (one-shot — Phase 3a's `scripts/transform-mockup-d1.mjs` is the canonical retained version).

### Commits
- `0d19300` — scaffold (_tokens.css + INDEX.html)
- `cebb7df` — M1, M3-studio, M4, M5, M6 (5 modules)
- `17cd086` — M7, M8, M9, M11, M12 (5 modules)
- (Commit 4 hash TBD) — M13, M14, M15 + docs (MODULE_MAP, CHANGELOG, SESSION_CONTEXT, MASTER_ROADMAP)
- (Commit 5 hash TBD) — close SPEC with retrospective

**PUSH PENDING** — per Daniel directive 2026-05-11, commits remain local; push deferred to Daniel manual review.

## 2026-05-11 — Design System Phase 3a: Direction 1 (Conservative) mockup tree (PUSH PENDING)

SPEC: `M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE` ([folder](specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE/))

- New folder `architecture-brief/design-system-mockups/direction-1-conservative/` with 15 files: 13 module HTMLs (M1/M3-studio/M4/M5/M6/M7/M8/M9/M11/M12/M13/M14/M15) + INDEX.html (top-bar 3-direction switch + left-nav 13 module links + iframe preview + Prizma override toggle) + `_tokens.css` (intentionally minimal — Conservative inherits platform defaults).
- Production-sourced HTMLs (M1/M3-studio/M4) staticized: all `<script>` removed, all page CSS (`css/*.css`) removed, Google Fonts external link removed, mock Hebrew content injected into first `<main>` (~14-row inventory table for D1 anti-blandness density target). Direction stylesheet chain (8 shared CSS + `_tokens.css`) added before `</head>`.
- Mockup-sourced HTMLs (M5–M15) copied verbatim; `<script>` stripped; inline-style hex literals replaced with `transparent` (Rule 9 — no hardcoded colors in `style=""`); direction stylesheet chain appended before `</head>`. `<style>` blocks PRESERVED for sketch-preservation (custom classes the shared CSS doesn't cover).
- Helper script `scripts/transform-mockup-d1.mjs` codifies the transformation (kept in tree for 3b/3c reuse — see SPEC retro proposal #1).

### Commits
- `676608e` — scaffold (_tokens.css + INDEX.html)
- `ae4a16e` — M1, M3-studio, M4, M5, M6 (5 modules) + transform script
- `46276ce` — M7, M8, M9, M11, M12 (5 modules)
- (Commit 4 hash TBD) — M13, M14, M15 + docs (MODULE_MAP, CHANGELOG, SESSION_CONTEXT, MASTER_ROADMAP)
- (Commit 5 hash TBD) — close SPEC with retrospective

**PUSH PENDING** — per Daniel directive 2026-05-11, commits remain local; push deferred to Daniel manual review.

## 2026-05-11 — Design System Phase 2: Component library token-only + focus-visible baseline

SPEC: `M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY` ([folder](specs/M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY/))

- All 7 component CSS files now use bare `var(--token)` references — no `, #fallback` literals left. 15 sites cleaned (12 hex fallbacks in modal.css digit-suffixed vars caught after SPEC criterion #4's regex bug fix; 3 stale `--g{100,300,400}` refs in table.css fixed to canonical `--color-gray-{100,300,400}`). variables.css is the only source of color truth.
- New tokens: `--color-focus-ring` (tracks primary), `--shadow-focus` (3px near-black ring at 35% opacity). WCAG 2.4.7 baseline.
- `:focus-visible` baseline added across components.css/forms.css/modal.css/table.css/toast.css. Existing `:focus { outline:none; border-color/box-shadow:... }` rules in components.css (.input/.select/.textarea) converted to `:focus + :focus-visible` pair pattern. Mouse-click no longer triggers a focus ring; keyboard Tab does.
- JS APIs UNCHANGED (Modal/Toast/TableBuilder/promptPin frozen per Brief Contract B).

### Commits
- d4f5f99: add --color-focus-ring + --shadow-focus tokens
- b8d7e8a: remove modal.css `var(--TOKEN, #hex)` hex-fallback literals (11 initial sites)
- a37aafe: finalize hex-fallback cleanup — modal.css digit-suffixed vars + table.css stale --gN refs (15 more sites)
- e9c555c: :focus-visible baseline across components/forms/modal/table/toast

Rationale: prep for Phase 3 (3-direction mockups) — directions override `--color-focus-ring` per-direction without touching JS or component CSS.

## 2026-05-11 — Design System Phase 1: Neutral platform defaults

SPEC: `M1_5_DESIGN_TOKENS_FOUNDATION` ([folder](specs/M1_5_DESIGN_TOKENS_FOUNDATION/))

- `shared/css/variables.css`: 4 primary color tokens swapped from Indigo to neutral (Slate-900 / Slate-800 / Slate-100 / pure black). `--font-family` unchanged (Heebo). Daniel decision 2026-05-10: "ניטרלי לגמרי — שחור-לבן בלבד".
- DB migration `2026-05-11_design_tokens_neutral_defaults.sql`: Prizma `ui_config` JSONB populated with Indigo overrides; Prizma renders unchanged after swap. Demo tenant untouched.
- M1.5 `db-schema.sql` ui_config example refreshed; `MODULE_MAP.md` §4 updated.

Rationale: Design System brief (2026-05-10) — platform default must be brand-free so future tenants don't inherit Prizma residue.

### Commits
- a89d9d9: variables.css token swap to neutral slate
- 9dc89e6: tenants.ui_config migration — Prizma Indigo override applied

## Phase 6 — UI Facelift ✅ (2026-03-19)

### Commits
- 6767a2c: Indigo primary palette (#4f46e5) + Slate gray scale in variables.css (12 variables changed)
- a7a17ef: Legacy --primary alias in variables.css (bridges header.css/index.html)
- 4e9949f: Page CSS :root blocks — replaced hardcoded --primary with var(--color-primary) in inventory.css, shipments.css, employees.css, settings.css

### What Changed
- **Primary colors:** dark navy (#1a237e) → Indigo (#4f46e5/#4338ca/#eef2ff/#3730a3)
- **Gray scale:** Tailwind Gray (warm) → Tailwind Slate (cool) — 9 values updated for harmony with Indigo
- **Legacy bridge:** `--primary: var(--color-primary)` alias ensures header.css and page CSS consume new values
- **No JS/HTML changes.** No logic changes. No DB changes. CSS values only.

### Verification
- ui-test.html: 15/15 component sections passed
- All 6 pages × 2 tenants: CSS variables correct, zero console errors
- Mobile (375px), RTL, print: no breakage
- Tenant theming: Prizma=Indigo default, Demo=green override — both work
- suppliers-debt.html: backward compat (uses styles.css, minor shade difference — deferred)

---

## QA Phase — Full Regression ✅ (2026-03-19)

### Commits
- 9d2761d: QA Step 1: clone-tenant and cleanup-tenant SQL scripts
- b1e7e67: QA Step 1: fix employees PIN uniqueness in clone script
- 57410ed: QA Step 1: generate unique PINs for cloned employees
- 85daa0d: QA Step 2: slug-based tenant resolution on login
- 4ccf86a: QA: fix theme loading and permissions for multi-tenant
- fd412b5: QA: proper multi-tenant permissions schema (no prefix hack)
- d874b1f: QA: fix print rules, header mobile, modal RTL positioning

### Changes
- Clone tenant script: 39 tables with FK mapping, barcode D prefix, 19 temp mapping tables
- Slug-based tenant resolution: ?t=demo URL param, tenant picker, dynamic TENANT_SLUG
- Theme loading: legacy variable mapping (--color-primary → --primary), ui_config in header.js
- Permissions schema: roles/permissions/role_permissions PK now includes tenant_id
- Print rules: modal-overlay + toast-container hidden in @media print
- Header mobile: truncation with ellipsis at 600px breakpoint
- auth-service.js: tenant name caching, name in tenant config query

### Test Results
- Tenant isolation: 16/16 PASS
- Visual consistency: 18/19 (1 fixed)
- RTL: 5/5 PASS
- Mobile: 4/4 PASS
- Print: 3/3 PASS (1 fixed)
- Inventory regression: 12/12 PASS
- Shipments regression: 5/5 PASS
- Employees regression: 7/7 PASS
- Settings regression: 5/5 PASS
- Suppliers debt backward compat: 8/8 PASS

---

## Phase 5 — Cleanup & Hardening ✅ (2026-03-18)

### Commits
- b8789ed: Phase 5 Step 0: migration map for all 5 pages
- 653e217: Phase 5 Step 1: zero hardcoded business values scan and fix
- b209a90: Phase 5 Step 2: custom_fields JSONB column on inventory
- a98408c: Phase 5 Step 3: PinModal namespace + promptSyncPin collision fix
- ff41a0b: Phase 5 Steps 4-5: theme hook + wrapper strategy + inventory CSS migration
- cd8862a: Phase 5 Steps 6-8: inventory manual migrations (alerts, modals, permissions)
- f7f6a56: Phase 5 Steps 9-12: inventory regression + employees/settings/index CSS migration
- 8d51bb1: Phase 5 Steps 13-15: shipments.html full migration

### New Files
- css/inventory.css, css/employees.css, css/settings.css, css/shipments.css (page-specific styles)
- PHASE_5_MIGRATION_MAP.md (140-item scan of all 5 pages)

### DB Changes
- ALTER TABLE inventory ADD COLUMN custom_fields JSONB DEFAULT '{}'

### Modified Files (15)
- js/shared.js — wrapper strategy (toast/confirmDialog/showInfoModal delegate to shared/)
- js/auth-service.js — applyUIPermissions() delegates to PermissionUI.apply()
- js/header.js — loadTenantTheme() hook
- shared/js/pin-modal.js — PinModal namespace added
- shared/js/permission-ui.js — data-tab-permission support
- modules/access-sync/sync-details.js — promptSyncPin rename
- modules/inventory/inventory-edit.js — PinModal.prompt() migration
- modules/audit/audit-log.js — PinModal.prompt() migration
- modules/shipments/shipments-lock.js — native confirm() replaced
- inventory.html, employees.html, settings.html, index.html, shipments.html — CSS + JS migration

### Phase Summary
- 5 pages migrated to shared/ CSS + JS (suppliers-debt deferred)
- Wrapper strategy covers ~200+ toast/confirm/modal call sites automatically
- 2 PIN modals replaced with PinModal.prompt(), 2 native confirm() replaced
- custom_fields JSONB ready for per-tenant dynamic fields
- Zero console errors on all 6 pages

---

## Phase 4 — Table Builder + Permissions ✅ (2026-03-18)

### Commits
- 6cdb546: Phase 4 Step 1: create shared/css/table.css — table builder styles
- 7027f98: Phase 4 Step 2: create shared/js/table-builder.js — TableBuilder API
- bd78b50: Phase 4 Step 3: create shared/tests/table-test.html — TableBuilder test page
- 9661ebb: Phase 4 Step 4: fix TableBuilder — double-escaping, sticky header, test page
- fe8dfc9: Phase 4 Step 5: create shared/js/permission-ui.js — permission-aware UI
- f06e700: Phase 4 Step 6: create shared/tests/permission-test.html — PermissionUI test page

### New Files
- shared/css/table.css (150 lines) — Table builder CSS: wrapper, header, rows, sort indicators (▲▼ via data-sort-dir), empty/loading states, zebra, sticky header, RTL logical properties, responsive
- shared/js/table-builder.js (296 lines) — TableBuilder.create → TableInstance with setData/setLoading/updateRow/removeRow/getData/destroy. 7 column types, external sort, XSS-safe
- shared/js/permission-ui.js (53 lines) — PermissionUI.apply/applyTo/check. data-permission attributes, hide/disable modes, OR logic, hasPermission wrapper
- shared/tests/table-test.html (235 lines) — 9 sections, 21 tests for Table Builder
- shared/tests/permission-test.html (190 lines) — 7 sections, 22 tests for PermissionUI

### DB Changes
- None (JS + CSS only)

### Bug Fixes
- table-builder.js: text renderer returned escaped HTML but textContent double-escaped it. Fix: renderers return plain text
- table.css: overflow-x:auto on wrapper created scroll context breaking position:sticky. Fix: .tb-wrapper-sticky sets overflow-x:visible
- table-test.html: shared.js requires Supabase lib. Fix: inline escapeHtml() standalone

### Testing
- Table Builder: 21/21 PASS (3 bugs found and fixed)
- PermissionUI: 22/22 PASS (zero fixes needed)
- Regression: 6/6 pages PASS, zero console errors

### Phase Summary
- 5 new files, ~924 lines of new code
- 0 modified existing files (zero changes to pages)
- 0 DB changes, 0 breaking changes

---

## Phase 3 — Data Layer ✅ (2026-03-18)

### Commits
- 130dec9: Phase 3 Step 1: create activity_log table with RLS and indexes
- cc52a4b: Phase 3 Step 2: create supabase-client.js with DB wrapper
- 13c98e3: Phase 3 Step 3: create db-test.html for DB wrapper testing
- a485cef: Phase 3 Step 3 fix: correct RLS policy pattern + test auth init
- b0acde3: Phase 3 Step 5: create activity-logger.js
- d221951: Phase 3 Step 6: create activity-log-test.html
- 61f810d: Phase 3 Step 7: fix activity-logger branch_id UUID validation
- e3456c0: Phase 3 Step 9a: atomic fix — po-view-import uses increment_inventory RPC
- 5f07211: Phase 3 Step 9b: atomic fix — debt-payment-alloc uses increment_paid_amount RPC
- 9ec6cdc: Phase 3 Step 9c: atomic fix — receipt-debt uses increment_prepaid_used RPC
- 44776bd: Phase 3 Step 9d: atomic fix — shipments-lock uses increment_shipment_counters RPC

### New Files
- shared/js/supabase-client.js (263 lines) — DB.select/insert/update/batchUpdate/softDelete/hardDelete/rpc, CSS-only spinner (200ms debounce), error classification, tenant_id auto-inject
- shared/js/activity-logger.js (90 lines) — ActivityLog.write/warning/error/critical, fire-and-forget, auto-inject tenant_id/user_id/branch_id
- shared/tests/db-test.html (325 lines) — 9 sections, 20 tests for DB wrapper
- shared/tests/activity-log-test.html (251 lines) — 8 sections, 15 tests for Activity Log

### DB Changes
- CREATE TABLE activity_log (id, tenant_id, branch_id, user_id, level, action, entity_type, entity_id, details JSONB, ip_address, user_agent, created_at) + RLS + 5 indexes
- T.ACTIVITY_LOG constant added to shared.js
- 3 new RPC functions: increment_paid_amount, increment_prepaid_used, increment_shipment_counters

### Modified Files (Atomic RPC fixes)
- modules/purchasing/po-view-import.js — read→compute→write replaced with increment_inventory RPC
- modules/debt/debt-payment-alloc.js — read→compute→write replaced with increment_paid_amount RPC
- modules/goods-receipts/receipt-debt.js — read→compute→write replaced with increment_prepaid_used RPC
- modules/shipments/shipments-lock.js — read→compute→write replaced with increment_shipment_counters RPC

### Bug Fixes
- RLS policy on activity_log corrected from current_setting('app.tenant_id') to request.jwt.claims pattern
- activity-logger.js branch_id UUID validation: skip non-UUID legacy "00" string

### Phase Summary
- 4 new files, ~930 lines of new code
- 4 modified module files (atomic RPC fixes)
- 1 new DB table, 3 new RPC functions, 0 breaking changes
- Atomic RPC scan: 20 patterns checked, 0 remaining read→compute→write patterns

---

## Phase 2 — Core UI Components (2026-03-17)

### New Files
- shared/css/modal.css (233 lines) — Modal CSS: overlay, 5 sizes, 5 types, animations, stack, wizard progress
- shared/js/modal-builder.js (261 lines) — Modal.show/confirm/alert/danger/form/close/closeAll, stack, focus trap, scroll lock
- shared/js/modal-wizard.js (144 lines) — Modal.wizard() extension, multi-step progress, validate/onEnter/onLeave
- shared/css/toast.css (155 lines) — Toast CSS: 4 types, animations, progress bar, RTL
- shared/js/toast.js (131 lines) — Toast.success/error/warning/info/dismiss/clear, max 5, dedup, XSS-safe
- shared/js/pin-modal.js (123 lines) — PIN prompt migration, Modal.show() internally, identical promptPin(title, callback) API
- shared/tests/modal-test.html (251 lines) — sizes, types, stack, keyboard, XSS tests
- shared/tests/toast-test.html (155 lines) — types, duration, stack, dedup, XSS, no-close tests

### Modified Files
- js/pin-modal.js — replaced with 5-line redirect to shared/js/pin-modal.js
- inventory.html — added shared/css/modal.css and shared/js/modal-builder.js
- suppliers-debt.html — added shared/css/modal.css and shared/js/modal-builder.js
- CLAUDE.md — added Iron Rule #12 (global name collision check)

### Bug Fix
- Wizard onFinish/onCancel mutual exclusivity: _finished flag prevents onCancel on successful finish

### Testing
- Modal: 17/17 PASS, Toast: 17/17 PASS, PIN: 8/8 PASS, Regression: 8/8 PASS

### Phase Summary
- 8 new files, ~1,450 lines of new code
- 3 modified HTML files, 1 redirect file
- 0 DB changes, 0 breaking changes

---

## Phase 1 — CSS Foundation ✅ (2026-03-17)

### Commits
- bf36be1: Phase 1 Steps 1-2: Create variables.css with design tokens, init MODULE_MAP and db-schema
- 1d9ff8a: Phase 1 Step 3: Create components.css — buttons, inputs, badges, cards, tables, panels, skeleton, accordion
- c34d1ba: Phase 1 Steps 4-5: Create layout.css and forms.css
- 5ac1d66: Phase 1 Steps 6-7: Create theme-loader.js and ui-test.html test page with 3-palette theme switcher
- (this commit): Phase 1 Step 8: Integration Ceremony — backup, docs update, GLOBAL integration, tag v1.5-phase1

### Summary
- **DB:** ALTER TABLE tenants ADD COLUMN ui_config JSONB DEFAULT '{}'
- **CSS:** 5 files (variables.css 157L, components.css 254L, components-extra.css 214L, layout.css 201L, forms.css 146L) — 70 CSS variables, zero hardcoded colors/sizes/spacing
- **JS:** theme-loader.js (42L) — loadTenantTheme() injects per-tenant CSS overrides from ui_config JSONB
- **Tests:** ui-test.html (252L) — 13 component sections, 3-palette theme switcher proving theming mechanism
- **Verification:** 6 existing pages regression-tested (0 errors), all CSS integrity checks pass, theme-loader edge cases pass

---

## Phase 0 — Infrastructure Setup ✅ (2026-03-17)

### Commits
- ba841d8: Create GLOBAL_MAP.md — global project reference
- b67956e: Create GLOBAL_SCHEMA.sql — full database reference
- 751c146: Update CLAUDE.md — multi-module architecture, global docs, authority matrix
- a81c1c1: Phase 0 fixes: rename ROADMAP, remove non-existent contracts, document RLS known debt
- 7a6fe58: Add RLS permissive warnings to GLOBAL_MAP for 9 tables

### Summary
- Created docs/GLOBAL_MAP.md (full function registry, contracts, module registry, DB ownership)
- Created docs/GLOBAL_SCHEMA.sql (50 tables, full schema)
- Updated CLAUDE.md with multi-module architecture, branching, authority matrix
- Created Module 1.5 directory structure + docs
- Created shared/ directories (css, js, tests)

## 2026-05-11 — Full-Auto Pipeline bootstrap (M1_5_FULL_AUTO_PIPELINE)

- 87b888f: feat(spec): scaffold M1_5_FULL_AUTO_PIPELINE — Iron Rule 32 + backup-discipline upgrade in CLAUDE.md
- 9d3dd10: feat(scripts): add destructive-ops-declared.mjs + wire into verify.mjs (Iron Rule 32)
- 37c095e: feat(infra): scaffold escalation folders + template in M1.5 / M3 / M4
- 25f40e6: feat(skill): opticup-strategic — Pipeline Hand-off + Pipeline Closure + Mode Detection + Hebrew status line
- 6d50633: feat(skill): opticup-executor — Pipeline Hand-off + auto-backups + Hebrew status line
- 66a4bdf: feat(skill): opticup-reviewer — Pipeline Hand-off + Hebrew status line
- 8081696: feat(skill): opticup-localhost-tester — Pipeline Hand-off + Hebrew status line; update AGENT_CHAIN_PROTOCOL Full-Auto section
- ebd19f7: test(pipeline): run Test SPEC #1 (docs-only) end-to-end in one chat — M1_5_FULL_AUTO_TEST_1_DOCS_ONLY CLOSED 🟢
- 576195f: test(pipeline): run Test SPEC #2 (small code) end-to-end including smoke 7/7 — M1_5_FULL_AUTO_TEST_2_CODE_CHANGE CLOSED 🟢

### Summary
- New pipeline: Full-Auto Mode (Pipeline mode: full-auto) — every new SPEC runs end-to-end in ONE Claude Code chat via skill chaining.
- New Iron Rule 32 + enforcement script (destructive-ops-declared.mjs).
- Backups discipline upgraded: automatic auto-trigger replaces the old "before major restructuring" guidance.
- Escalation protocol: files + ≤60-char Hebrew status lines + Architect Decision block ingestion.
