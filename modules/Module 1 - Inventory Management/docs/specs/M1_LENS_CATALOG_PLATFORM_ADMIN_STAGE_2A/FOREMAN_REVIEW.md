---
spec_id: M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A
reviewer: opticup-strategic (Foreman, Claude Code Opus 4.7 1M)
reviewed: 2026-05-18 evening (Path X, same session as Executor + Reviewer + Tester)
status: 🟡 CLOSED-WITH-FOLLOWUPS — Stage 2A of 5
brief: modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_BRIEF.md
---

# FOREMAN_REVIEW — M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A

## 1. Verdict

🟡 **CLOSED-WITH-FOLLOWUPS — Stage 2A ships with all VISUAL + STRUCTURAL goals met; ONE pre-existing architectural blocker (T-BLOCK-2) carries forward to a separate Architect SPEC.**

**What shipped (9 commits on `develop`):**
- 1 DB migration: `lens_design.version` column NOT NULL DEFAULT 1, backfilled to all 145 existing global designs.
- 4 Executor feat commits implementing the SPEC's mockup-faithful 4-column Platform Catalog Admin screen with 2 product-type tabs (glasses + contact_lens), 4 creation modals, version badge, adoption count, save bar, disabled Excel buttons with "זמין בשלב 2ב" tooltips.
- 1 Foreman hotfix (R-M2): consistent escapeHtml on tenant-select UUID + slug.
- 1 Reviewer report commit (REVIEWER_REPORT.md).
- 1 Localhost-Tester report commit (TEST_REPORT.md + 12 PNG screenshots).
- 1 Foreman hotfix (Tester findings): T-BLOCK-1 brand→design click chain + T-MED-1 counts badge refresh + T-MIN-1 detail-pane meta defensive lookup.

**Why 🟡 and not 🟢:**
- All 34 Executor-measurable §3 criteria PASS (Reviewer independently re-verified all 34).
- 4 of 6 Tester-observable §3 VFV criteria PASS after hotfix (S-VFV-GLASSES-TAB, S-VFV-CONTACTS-TAB, S-VFV-EMPTY-STATE, S-VFV-NO-CONSOLE).
- 2 of 6 Tester-observable §3 VFV criteria PARTIAL after hotfix (S-VFV-POPULATED + S-VFV-CREATION-FLOWS) — the canonical user-path now works (T-BLOCK-1 hotfix restored brand→design chain), but brand/series/variant modal SUBMIT still returns RLS 403 due to T-BLOCK-2 (pre-existing architectural gap, NOT introduced by Stage 2A).
- Mockup fidelity: 16 match / 1 minor / 1 critical drift (T-BLOCK-1) per Tester §4. T-BLOCK-1 fixed in `a34b09c` (post-Tester); fidelity tally now 17 match / 1 minor / 0 critical drift.
- 0 BLOCKERs introduced BY Stage 2A. T-BLOCK-1 (regression) introduced by Stage 2A Commit 2 (`4fb4ec3`) and fixed in `a34b09c` before closure — net effect at HEAD = no Stage 2A regression. T-BLOCK-2 is pre-existing and Stage 2A merely SURFACES it via the new modal UI (the old `window.prompt()` flow silently failed; the new modals fail-loudly via toast).

**The 🟡 verdict reflects honest accounting:** Stage 2A's IN-SCOPE goals are 🟢 (visual chrome + structural extensions + 2 tabs + modals + versioning + permission gating UI). One ESCALATED scope item (architectural RLS policy bypass for platform-admin write paths on global tables) requires a separate Architect SPEC. Documented for Daniel + Architect in §7 below.

## 2. SPEC Quality Audit (self-audit of my own SPEC.md authoring)

**Strengths:**
- §0.2 D-FIX-1/D-FIX-2/D-FIX-3 caught three Brief drift points BEFORE the Executor started, preventing rework. The Brief author (Architect, Cowork) conflated `shared/catalog-private-admin` with `modules/lens-catalog-admin/`; named the wrong discriminator column (`lens_type` vs `product_type`); and listed a non-existent `diameter` column for `contact_lens_variant`. Executor's EXECUTION_REPORT §1 confirms the SPEC's corrections were unambiguous and they did NOT relitigate any of the three.
- §0.4 DB Schema Rehearsal was thorough on COLUMN-level reality (NOT NULL, defaults, types) and the data-shape for `tenant_active_offerings` adoption query. This let the Executor wire the adoption-count semantics correctly on the first pass.
- §0.6 lessons table cited and applied 7 prior FOREMAN_REVIEW proposals. The hard-rule "NO polish-by-validation" got an ACTIVE stop-trigger (§5), not soft language. Daniel's binding memory respected.
- §0.7 untracked-files survey explicitly listed 10 pre-existing untracked + 4 modified-tracked files. The Executor honored selective `git add` discipline across all 4 commits; the Reviewer + Tester confirmed no scope sweep in any commit.
- §1.5 Schema Impact constrained the DDL to ONE column (`lens_design.version`) — the leanest pattern matching mockup §COL 4. Avoided history-table over-design.
- §3 produced 40 measurable criteria with EXACT verify commands. 34 Executor-measurable + 6 Tester-measurable cleanly separated. Executor self-scored on every one; Reviewer independently spot-checked; Tester ran the 6 deferred.
- §8 included EDITABLE SKELETONS for all 3 new files per Stage 1 P-AUTHOR-1. Executor first-draft hit LOC budgets without trim cycle.
- §11 Cross-Reference Check declared 0 collisions / 12 names introduced — clean.

**Weaknesses (each generates a P-AUTHOR proposal below):**
- **§0.4 DB Schema Rehearsal did NOT probe RLS WRITE-PATH semantics.** I listed RLS policies generically as "tenant_id OR platform-admin role" without grepping the actual USING clauses. Tester finding T-BLOCK-2 reveals the policies have NO platform-admin write bypass — only `service_role`. A 5-minute `SELECT polname, polcmd, qual FROM pg_policies WHERE tablename IN ('lens_brand','lens_design','lens_variant','contact_lens_variant')` at author time would have caught this. **P-AUTHOR-1 below codifies this**.
- **§0.5 Permission gating was incomplete.** I declared `is_platform_super_admin` RPC sufficient because the UI gate works. But UI gate ≠ write-path gate. The SPEC should have probed BOTH layers at author time. **Same root cause as §0.4 weakness above — P-AUTHOR-1 covers both.**
- **§3 success criteria over-trusted static grep.** S-19 (`grep -c "window.prompt(" → 0`) confirms code-level cleanup but doesn't catch the runtime callback-cache miswire that broke 3 of 4 creation flows. The Tester caught it via runtime check on `typeof window.__catalogOnBrandSelected`. A `grep -A 3 'wireXxxCol\(state, on' modules/lens-catalog-admin/*.js` would have flagged the asymmetry. **P-AUTHOR-2 below codifies a "sibling-pattern symmetry" verification**.

**Verdict on SPEC quality: 7/10.** The structural design (file scoping, D-FIX corrections, hard rules, untracked discipline) held cleanly. The two §0 weaknesses are author-skill improvement targets that the proposals below address.

## 3. Execution Quality Audit

**Strengths (per Executor's EXECUTION_REPORT + git log audit):**
- 34 of 34 Executor-measurable §3 criteria PASS, independently re-verified by Reviewer (who spot-checked all 34, not just a sample).
- Selective `git add` honored on every commit. `git show --stat` for all 4 Executor commits confirms only declared files staged; no surprises.
- Iron Rule 21 (no orphans/duplicates) — Executor pre-checked for `openModal`/`closeModal`/`wireModal` collisions; verified ES-module scope vs `js/shared.js` classic-script global (the Reviewer's R-INFO-1 documents this coexistence as non-violating).
- Iron Rule 32 destructive-ops declaration matched diff exactly: 0 destructive ops, additive-only DDL.
- LOC budgets honored — every new/modified JS file ≤ 350 (max 320 on catalog-detail-pane.js, within hard cap).
- Self-trim discipline: caught at author time when one file approached cap; no Reviewer findings on file-size.
- Hard rule held: real code + DB migration shipped, +1293 / -254 LOC across 11 files. Well over the SPEC's S-NO-POLISH threshold of "≥800 LOC".
- 4-commit compression vs SPEC's 5-commit plan was a principled choice (per Executor §5 "physical coherence"); Foreman concurs — feature + closure in one merged commit chain is cleaner than artificial split.

**Weaknesses:**
- **T-BLOCK-1 regression (catalog-brands-col.js wireBrandsCol missing cache-init):** the Executor extended this file in Commit 2 (`4fb4ec3`) but dropped a sibling-pattern line that should have been preserved. Both `wireSuppliersCol` and `wireDesignsCol` retain the cache-init; only `wireBrandsCol` lost it. **Real defect, not test gap.** Fixed in `a34b09c` (1-line restoration). Root cause: when the Executor refactored `wireBrandsCol` to add the new modal-trigger handler, they restructured the function and inadvertently moved the cache-init out of position; never reviewed the diff for sibling-symmetry. **Why missed at Reviewer pass: REVIEWER_REPORT.md was a STATIC code review and could not catch a runtime callback miswire.** The Tester's runtime VFV is precisely the layer that exists to close this gap. P-EXEC-1 below proposes a sibling-symmetry pre-stage check.
- **T-MED-1 (counts badge stale on tab swap):** Executor's `switchProductTab` reset the downstream selections but did not refresh the counts badge. This is a wiring-completeness oversight; the SPEC §3 criteria did not explicitly require counts-badge-on-swap (S-9 only required `activeProductTab` state exists, not that all consumers refresh). Honest gap in my §3 criteria + Executor's tab-switch flow. Fixed in `a34b09c`. P-AUTHOR-2 + P-EXEC-2 below address.
- **T-MIN-1 (detail-pane "מותג" meta empty when state.selectedBrand null):** Executor relied on state propagation always being correct; didn't defend against state-restore paths that skip a brand-card click. Fixed defensively in `a34b09c`. Low severity; lesson is "render functions should defend against partial state restores".

**Verdict on Execution quality: 8/10.** The execution was thorough and high-discipline. The 3 defects all fall in the same class (runtime/wiring gaps not catchable at the SPEC's static-grep verify level). Tester caught them in 1 session; hotfix loop closed cleanly in 1 commit. The Executor + Reviewer pipeline cannot be expected to catch every runtime defect — Tier C VFV is built precisely for that.

## 4. Reviewer Report Audit (REVIEWER_REPORT.md `4ccd385`)

**Verdict alignment:** Reviewer declared 🟡 PASS-WITH-FOLLOWUPS. Foreman concurs.

**Reviewer's findings (re-evaluation):**

| Finding | Severity | Reviewer disposition | Foreman concurs? | Final status |
|---|---|---|---|---|
| **R-M1** — `catalog-detail-pane.js` at 313 LOC (300-350 MEDIUM zone) | MEDIUM | "Proactive split in Stage 4 watchlist" | YES | TECH_DEBT entry recommended for Stage 4 close. After hotfix it's 320 LOC; verify gate emitted 1 soft warning (under hard cap). |
| **R-M2** — tenant-select UUID + slug unescaped | LOW | "MUST FIX in follow-up commit, 3-char change" | YES — fixed in `c913ea9` before Tester ran | RESOLVED |
| **R-INFO-1** — `closeModal` global namespace overlap with `js/shared.js:297` (ES-module export vs classic-script global, incompatible signatures, technically coexist) | INFO | "documented coexistence" | YES | TECH_DEBT entry: refactor to single canonical modal API (low priority; bundles with Module 1.5 modal-consolidation if/when authored). |

**Reviewer's re-evaluation of Executor's 4 findings: all agreed.** Foreman also concurs with the Executor's dispositions for F-1 through F-4.

**Foreman observation on Reviewer scope:** The Reviewer correctly stayed in their static-code-review lane. They flagged a callback-cache risk INDIRECTLY via R-INFO-1's "global namespace concerns" framing, but did NOT runtime-verify the wireBrandsCol callback resolution. This is expected — Tier C VFV (Tester) owns runtime verification. The pipeline divides labor correctly; T-BLOCK-1 was caught at the right step.

## 5. Tester Report Audit (TEST_REPORT.md `05faa9a`)

**Verdict alignment:** Tester declared 🔴 FAIL pre-hotfix. Recommended Path A (1 hotfix commit to address T-BLOCK-1 + T-MED-1 + T-MIN-1). Foreman applied Path A in `a34b09c`. **Post-hotfix verdict re-evaluation: 🟡 CLOSED-WITH-FOLLOWUPS** (T-BLOCK-2 + T-INFRA-1 documented as separate concerns).

**Tester's 5 findings (re-evaluation):**

| Finding | Severity | Tester disposition | Foreman action | Final status |
|---|---|---|---|---|
| **T-BLOCK-1** — wireBrandsCol missing cache-init → brand→design chain broken | 🔴 BLOCKER (regression) | "Path A: 1-line fix" | FIXED in `a34b09c` line 18 of catalog-brands-col.js | RESOLVED |
| **T-BLOCK-2** — RLS write-policy gap (no platform-admin bypass on global lens tables) | 🔴 BLOCKER (architectural, pre-existing) | "ESCALATE to Architect — 3 options A/B/C" | ESCALATED via new Brief stub (see §7 strategic flag below). NOT fixed in Stage 2A — out of scope per Brief §7 "tenant-side untouched" interpretation extended to RLS policies. | DEFERRED — Architect SPEC `M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS` to be authored. |
| **T-MED-1** — counts badge stale on product-tab swap | 🟡 MEDIUM | "5-line update to switchProductTab" | FIXED in `a34b09c` line 117 of lens-catalog-admin.js | RESOLVED |
| **T-MIN-1** — detail-pane "מותג" meta shows "—" when state.selectedBrand null | 🟢 MINOR | "1-line defensive lookup" | FIXED in `a34b09c` lines 30-35 of catalog-detail-pane.js | RESOLVED |
| **T-INFRA-1** — `inventory-shell-lens.js gatePlatformAdminTabs` doesn't honor `?dev=1` | 🔵 INFO | "Mirror catalog-auth dev-bypass OR document workaround" | DEFERRED — file out of Stage 2A scope (`inventory-shell-lens.js` belongs to inventory-shell, not lens-catalog-admin). Recommend Architect bundles with T-BLOCK-2 SPEC OR opens a dedicated `M1_INVENTORY_SHELL_DEV_BYPASS_CONSISTENCY` micro-SPEC. | DEFERRED to Architect. |

**Tester self-improvement proposals (2):** both excellent and directly applicable.
- **P-TEST-1** (per-modal SUBMIT verification, not just OPEN): adopted into Tester skill recommendation queue.
- **P-TEST-2** (cache wire-up audit — `typeof window.__<callback>`): adopted; would have caught T-BLOCK-1 in 5 seconds. Worth promoting into Tester's mandatory checklist for any SPEC with a callback wiring chain.

## 6. Findings Processing — Consolidated

| Finding | Source | Severity | Disposition |
|---|---|---|---|
| **F-1** — `display_id` NOT NULL no-default-no-trigger on lens_variant + contact_lens_variant; client-side enforced by modal but Rule 11 (sequential numbers via atomic RPC) suggests future `next_*_display_id` RPCs | Executor | MEDIUM | TECH_DEBT entry: `#M1_LENS_DISPLAY_ID_SEQUENTIAL_RPC` — for Stage 4 or dedicated SPEC. Not blocking Stage 2A because modal validation gates it before insert. |
| **F-2** — `lens_design.version` not in FIELD_MAP in js/shared.js (Iron Rule 5) | Executor | LOW | DEFER to Integration Ceremony at Stage 5 close. Platform-admin field; FIELD_MAP exists primarily for tenant-side flows. Same disposition pattern as Stage 1's F-1. |
| **F-3** — catalog-import.js exports unused during Stage 2A (button disabled per SPEC §7) | Executor | INFO | AUTO-RESOLVES in Stage 2B when buttons re-enabled. No action. |
| **F-4** — lens_design.lens_type has no CHECK constraint enforcing enumeration | Executor | INFO | TECH_DEBT entry: `#M1_LENS_TYPE_CHECK_CONSTRAINT` — bundles with the M1_LENS_DESIGNS_TOGGLE Group C work that already touches this column. |
| **R-M1** — catalog-detail-pane.js at 320 LOC (after hotfix) — soft warning, under hard cap | Reviewer | MEDIUM | TECH_DEBT entry: `#M1_CATALOG_DETAIL_PANE_SPLIT_AT_STAGE_4` — split into renderer + variants-table on next material change. |
| **R-M2** — tenant-select UUID + slug unescaped | Reviewer | LOW | RESOLVED in `c913ea9` |
| **R-INFO-1** — `closeModal` ES-module export vs classic-script global coexistence | Reviewer | INFO | TECH_DEBT entry: `#OPTICUP_MODAL_API_CONSOLIDATION` — Module 1.5 modal-consolidation pickup. Low priority. |
| **T-BLOCK-1** — wireBrandsCol cache-init missing | Tester | CRITICAL (regression) | RESOLVED in `a34b09c` |
| **T-BLOCK-2** — RLS write-policy gap (architectural, pre-existing) | Tester | CRITICAL (architectural) | **ESCALATE to Architect** — new Brief stub at `architecture-brief/PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md` (drafted in §7 strategic flag below). Decision required: Option A (RLS bypass policy) vs Option B (SECURITY DEFINER RPCs) vs Option C (server-side admin UI separate from inventory.html mount). |
| **T-MED-1** — counts badge stale on tab swap | Tester | MEDIUM | RESOLVED in `a34b09c` |
| **T-MIN-1** — detail-pane meta empty | Tester | MINOR | RESOLVED in `a34b09c` |
| **T-INFRA-1** — inventory-shell dev-bypass inconsistency | Tester | INFO | DEFER — bundle with T-BLOCK-2 Architect SPEC OR dedicated micro-SPEC. |

**Summary:** 0 BLOCKER unresolved at close (T-BLOCK-1 fixed in `a34b09c`). 1 architectural carry (T-BLOCK-2) escalated to Architect. 1 INFO carry (T-INFRA-1) bundles with the same Architect SPEC. 4 TECH_DEBT entries to register (F-1, F-4, R-M1, R-INFO-1) — defer to a dedicated housekeeping session within 48h per same pattern as Stage 1 F-1 disposition.

## 7. Strategic Flag — Architect Brief for T-BLOCK-2

Stage 2A surfaces a pre-existing architectural gap that must be resolved before the Platform Catalog Admin screen can be USED for its intended purpose by an Optic Up team member.

**The gap:** RLS policies on the 4 global lens-catalog tables (`lens_brand`, `lens_design`, `lens_variant`, `contact_lens_variant`) have NO recognition of a "platform-super-admin" non-service JWT. The `is_platform_super_admin` RPC controls UI VISIBILITY but does NOT bypass RLS on WRITE paths. Inserts will fail with 403 for ALL real platform admin users (Google OAuth path) because their JWTs are anon-level for table access; only the `service_role` key bypasses RLS, and that key MUST NOT be embedded in browser code per Iron Rule 23.

**Architectural options (no decision in this Foreman closure; Architect picks):**

- **Option A — RLS policy bypass for platform admins.** Add `platform_admin_bypass` policy on each of the 4 tables: `USING (((current_setting('request.jwt.claims', true))::json ->> 'is_platform_super_admin')::boolean = true) WITH CHECK (...)`. Requires the `pin-auth` Edge Function (or its Google-OAuth equivalent) to mint a `is_platform_super_admin` claim for super-admins. ~30 min SPEC scope.
- **Option B — SECURITY DEFINER RPCs.** Author 4 new RPCs (`platform_catalog_create_brand`, `..._design`, `..._lens_variant`, `..._contact_lens_variant`) that internally check `is_platform_super_admin()` and perform inserts under function-owner role. Modals POST to RPC instead of `.from(...).insert(...)`. ~45 min SPEC scope.
- **Option C — Document server-side admin UI as separate concern.** The inventory.html mount stays read-only for now; platform admin creates rows via Cowork/Claude Code dispatch + service_role API. Lowest implementation cost; worst UX.

**Foreman recommendation:** Option A. It generalizes to other future SECURITY DEFINER-free flows AND is the canonical RLS pattern per Iron Rule 15. Daniel decides.

**Brief stub (to be written by Architect, not Foreman):** `modules/Module 1 - Inventory Management/architecture-brief/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md`. Should bundle T-BLOCK-2 + T-INFRA-1 (the inventory-shell dev-bypass inconsistency is in the same operational class — both gate platform-admin tooling).

## 8. Master-doc Update Checklist

| Doc | Updated? | Where |
|---|---|---|
| `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` | ✅ (Executor at close commit `a9c9790`) + Foreman block to be added in this commit | Top-of-file Stage 2A closure entry supersedes Stage 1 + Stage 1 partial-close entries |
| `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` | ✅ (Executor) | Stage 2A section appended |
| `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` | ✅ (Executor) | 4 new rows: catalog-modal-helpers.js + catalog-variant-modal.js + lens-catalog-admin-tabs-modals.css + migration |
| `MASTER_ROADMAP.md` (root) | N/A — no module-level status change | M1 lens-catalog stays "in rebuild" (Stage 5 closes the module). |
| `docs/GLOBAL_MAP.md` | N/A | No new shared functions (modal helpers + variant modal are module-scoped). |
| `docs/GLOBAL_SCHEMA.sql` | N/A | DEFERRED to Stage 5 Integration Ceremony. `lens_design.version` lives in migration file. |
| `docs/FILE_STRUCTURE.md` | ⚠ NOT updated — same disposition as Stage 1 F-1: TECH_DEBT for housekeeping session within 48h | Recommend bundling with other deferred FILE_STRUCTURE updates from prior SPECs. |
| `TECH_DEBT.md` | ⚠ NOT updated this SPEC — pre-existing modifications in working tree from prior sessions are in the way. Defer 4 new entries (F-1, F-4, R-M1, R-INFO-1) to dedicated housekeeping session within 48h. | Same disposition pattern as Stage 1. |

## 9. Self-Improvement Proposals

### Two `opticup-strategic` (author skill) proposals

#### P-AUTHOR-1 — `§0.4 DB Schema Rehearsal` MUST include RLS-policy WRITE-path probe for tables touched by the SPEC

**Anchor:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" Step 5.3 "Runtime semantics rehearsal" — add sub-bullet:

```
- **RLS-policy WRITE-path probe (any SPEC that inserts/updates a non-service-role table).**
  Before sealing the SPEC, run `SELECT polname, polcmd, qual, with_check FROM pg_policies
  WHERE tablename IN (<list>)` for every table the SPEC writes to. Verify a policy exists
  that PERMITS the intended caller's JWT (anon / PIN-tenant / platform-admin) to insert/update.
  If the caller class doesn't appear in any policy's USING/WITH CHECK clause, the SPEC's
  modals/writes WILL fail at runtime with 403. SPEC §0.5 (or equivalent) MUST capture
  the actual USING clause text per affected table, not a generic "RLS will gate".
```

**Rationale:** Stage 2A's SPEC §0.5 declared `is_platform_super_admin` RPC "covers" the gating — true for UI gate, FALSE for table-write gate. Tester finding T-BLOCK-2 took ~10 minutes at runtime to surface; 5 minutes of `pg_policies` SELECT at author time would have caught it AND let the SPEC ship Option A or B in the same Stage. The runtime-semantics rehearsal in `Step 5.3` already covers NULL-comparison traps for SECURITY DEFINER functions — extending it to RLS WRITE-path coverage is a natural addition.

**Acceptance test (when applied):** Next 3 SPECs that introduce inserts/updates on non-service-role tables include a §0.4 sub-table "RLS WRITE-path probe" listing policy name + USING clause + verdict per table. Zero "T-BLOCK-2-class" Tester findings.

**Derived from:** my §2 weakness #1 + Tester finding T-BLOCK-2.

#### P-AUTHOR-2 — Add "sibling-pattern symmetry verify" criterion for SPECs that EXTEND an existing module with N parallel surfaces

**Anchor:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §3 Success Criteria — add example pattern:

```
| #  | S-SIBLING-SYMMETRY | For files that follow a sibling pattern (multiple wireXxxCol /
| ...|                    | renderYyyZzz / loadAaaBbb), verify the EXTENDED files share the
| ...|                    | same upfront-cache-init / state-setup / event-binding structure |
| ...|                    | `diff <(grep -A 2 'wireSuppliersCol(state' file1) <(grep -A 2 'wireBrandsCol(state' file2)`
| ...|                    | OR runtime check `typeof window.__<callback> === 'function'` |
```

**Rationale:** Stage 2A's Executor refactored `wireBrandsCol` in Commit 2 without diffing against `wireSuppliersCol` / `wireDesignsCol`. Result: 1-line cache-init dropped, brand→design click-chain broken in production, 3 of 4 creation modals unreachable. The Reviewer's static code review couldn't catch a runtime callback miswire; the Tester caught it via P-TEST-2 cache-audit. A SPEC §3 criterion that EXPLICITLY requires sibling-pattern symmetry would have prompted the Executor to diff before stage. The same class of bug fires whenever multiple parallel column/section wiring functions exist; it's worth a permanent §3 template.

**Acceptance test:** Next 3 SPECs that EXTEND an existing N-column / N-section module include a S-SIBLING-SYMMETRY criterion. Zero T-BLOCK-1-class regressions.

**Derived from:** my §2 weakness #3 + Tester P-TEST-2.

### Two `opticup-executor` (executor skill) proposals

#### P-EXEC-1 — Pre-stage `diff` of EXTENDED sibling files (catch-cache-init-asymmetry pattern)

**Anchor:** `opticup-executor` SKILL.md §"Pre-Commit Discipline" → add sub-bullet "Sibling-pattern symmetry diff":

```
- **Sibling-pattern symmetry diff** (for SPECs that EXTEND a module with N parallel wireXxx / renderYyy / loadZzz functions).
  Before staging the commit that extends the file:
  ```
  for f in <list-of-sibling-files>; do echo "===" $f "==="; grep -A 5 '^export function wire' $f | head -20; done
  ```
  Visually scan: do all N functions have the same upfront-cache-init / event-binding structure?
  If one differs from its siblings → audit the diff carefully before stage.
```

**Rationale:** Executor's `wireBrandsCol` lost its `window.__catalogOnBrandSelected = onBrandSelected;` line during the Stage 2A refactor. The other 2 wire functions retained theirs. A 30-second sibling-grep before stage would have shown the asymmetry instantly. The integrity gate + Iron Rule 12 LOC checks + grep-based §3 criteria all caught structural drift but not behavioral asymmetry. This proposal closes that gap.

**Source:** Foreman §3 weakness #1 + Tester finding T-BLOCK-1.

#### P-EXEC-2 — When a SPEC introduces tab/state-swap behavior, audit ALL consumers of the swapped state for refresh-on-swap

**Anchor:** `opticup-executor` SKILL.md §"Visual / UI Patterns" → add sub-bullet "State-swap consumer audit":

```
- **State-swap consumer audit** (for SPECs that add a top-level tab/state swap that other consumers depend on — counts, badges, displayed lists, filters).
  When implementing the swap handler (e.g., switchProductTab), enumerate ALL consumers of
  the swapped state via `grep -rn "state.<swapped-key>\|state\\.activeXxxTab" modules/<module>/`.
  For each consumer, verify it either (a) re-reads state at render time (auto-refresh) OR
  (b) is explicitly called from the swap handler (explicit refresh).
  A consumer that captures state at bootstrap and never re-reads is a stale-data bug
  (T-MED-1 pattern: counts badge captured `state.activeProductTab` at boot, never refreshed).
```

**Rationale:** Stage 2A's `switchProductTab` correctly reset downstream lists + selections but did NOT refresh the counts badge — which captured `state.activeProductTab` at bootstrap. T-MED-1 surfaced as "counts locked to glasses values after switching to contacts". A 1-minute consumer audit at commit time would have caught all state-dependent renderers and let the Executor wire `await loadCountsBadge()` in the same commit. The fix is trivial; the discipline is "remember every state consumer when adding a swap".

**Source:** Foreman §3 weakness #2 + Tester finding T-MED-1.

## 10. Verdict (closing)

🟡 **CLOSED-WITH-FOLLOWUPS — Stage 2A ships clean for IN-SCOPE goals.**

- 9 commits on `origin/develop` (`96dcb22` → `a34b09c` excluding `2a368c1` which is unrelated M4 work).
- Stage 2A's visual + structural goals 🟢: mockup-faithful 4-column screen, 2 product-type tabs, 4 creation modals (open + form correct), versioning (lens_design.version column + badge), adoption count, save bar w/ 3 buttons, disabled Excel buttons with tooltips. **Brief §10 Deliverables 1-3 + 5-7 fully met.**
- 34/34 Executor-measurable §3 criteria PASS (after R-M2 hotfix). 4/6 Tester-measurable §3 VFV criteria PASS (after Tester-finding hotfix). 2/6 Tester-measurable PARTIAL (S-VFV-POPULATED + S-VFV-CREATION-FLOWS) — canonical user-path now works; modal submit fails for write-paths due to T-BLOCK-2 architectural carry.
- 0 BLOCKERs unresolved at close (T-BLOCK-1 regression fixed in `a34b09c`; T-BLOCK-2 escalated to Architect via §7 above).
- 11 findings disposed: 4 RESOLVED (R-M2, T-BLOCK-1, T-MED-1, T-MIN-1); 5 TECH_DEBT (F-1, F-2, F-4, R-M1, R-INFO-1) deferred to housekeeping; 1 INFO carry (T-INFRA-1) bundled with T-BLOCK-2 Architect SPEC; 1 architectural escalation (T-BLOCK-2).
- 4 self-improvement proposals harvested (2 author + 2 executor), all with concrete anchors + acceptance tests.

**Strategic Flag for Architect (§7):** T-BLOCK-2 + T-INFRA-1 require an Architect Brief authoring (`M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md`). 3 options stated; Foreman recommends Option A (canonical RLS policy bypass per Iron Rule 15).

**5-stage plan progresses 1/5 → 2/5.** Stage 2B (Excel import dialog) is next once the Architect resolves T-BLOCK-2.

---

_Authored 2026-05-18 evening (IDT) by opticup-strategic (Foreman). Pipeline closed — lock release follows this commit._
