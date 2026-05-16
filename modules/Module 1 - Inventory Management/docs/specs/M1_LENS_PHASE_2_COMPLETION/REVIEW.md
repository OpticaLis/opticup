# REVIEW — M1_LENS_PHASE_2_COMPLETION

> **Reviewer:** opticup-reviewer (Stage 6 of Night Pipeline 2026-05-15→16, Claude Code Windows-desktop, opus-4-7[1m])
> **Trigger:** Executor closed Parts A/B/C/D at commits e8b3b23 / 93c1b91 / dd4415c / e92fe64.
> **Commit range:** `a1c74a3..e92fe64` (5 Pipeline commits, all on develop).
> **Verdict:** 🟢 **PASS** — ready for Stage 7 Localhost-Tester.

---

## 1. Verdict

🟢 **PASS** — all 7 Foreman spot-check priorities verified against live state. No CRITICAL or HIGH findings. 2 LOW informational findings logged (do not block).

The Pipeline executed cleanly:
- Part A: A2-defer (Tier 3) correctly invoked per SPEC §0.C decision rule; empirical evidence comprehensive (FINDINGS F-1).
- Part B: RPC harmonization technically sound — twin RPCs now share Block A JWT guard, reason_id FK validation, stock_adjustment audit insert, record_stock_movement delegation, ACL pattern.
- Part C: 31 partial FK indexes applied cleanly; advisor probe verifies 0 unindexed remaining in scope.
- Part D: shared navigation widget + 1 menu card + 7 page edits; HTTP 200 on all 8 affected pages.
- All 4 Parts: Prizma untouched (0/4/0/0 invariant held); main branch untouched; Iron Rule 31 gate clean across every commit.

---

## 2. Live-state verification (Reviewer's independent probes)

### 2.1 — Part B: RPC harmonization

| Check | Expected | Actual | Verdict |
|---|---|---|---|
| `record_adjustment_found` signature | `(uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric) → uuid` (10 args) | EXACT match | ✅ |
| `record_adjustment_found` has Block A canonical JWT guard | body contains `v_jwt_tenant` or `Block A` | true | ✅ |
| `record_adjustment_found` has reason_id direction check | body references `stock_adjustment_reason` + `direction` | true | ✅ |
| `record_adjustment_found` has stock_adjustment audit insert | body contains `INSERT INTO stock_adjustment` | true | ✅ |
| `record_adjustment_found` delegates to record_stock_movement | body calls `record_stock_movement` | true | ✅ |
| `record_adjustment_found` ACL | `{postgres=X,authenticated=X,service_role=X}` — anon NOT in proacl | EXACT | ✅ |
| `record_adjustment_lost` signature | unchanged 11-arg `(uuid,uuid,uuid,uuid,integer,uuid,uuid,text,numeric,numeric,numeric)` | EXACT match | ✅ |
| `record_adjustment_lost` body unchanged | byte-length 2714 (would be visibly different if body re-written) | matches Foreman snapshot expectation | ✅ |

**Independent probe SQL:** `SELECT proname, pg_get_function_identity_arguments(oid), proacl::text, (pg_get_functiondef(oid) LIKE '%Block A%')::text AS has_block_a, octet_length(pg_get_functiondef(oid)) AS body_bytes FROM pg_proc WHERE proname IN ('record_adjustment_found','record_adjustment_lost') AND pronamespace='public'::regnamespace`.

### 2.2 — Part C: FK index sweep

| Check | Expected | Actual | Verdict |
|---|---|---|---|
| M1 Lens scope unindexed FK count post-Part-C | 0 | 0 | ✅ |
| Reviewer re-ran the §0.D probe verbatim and got the same result the Executor reported | match | match | ✅ |

### 2.3 — Part D: menu wiring + widget

| Check | Expected | Actual | Verdict |
|---|---|---|---|
| `shared/js/lens-nav-strip.js` exists with `LENS_PAGES` array of 7 entries | 7 entries (lens-inventory, lens-goods-receipt, lens-purchase-order, lens-pos-list, lens-pricing, lens-active-designs, lens-catalog-admin) | EXACT match — 7 entries at lines 23-30 | ✅ |
| All 7 lens HTML pages return HTTP 200 from `localhost:3000` | 7/7 PASS | 7/7 PASS | ✅ |
| index.html returns HTTP 200 | 200 | 200 | ✅ |
| Widget JS reachable | 200 | 200 (verified by Executor in §D6) | ✅ (re-verified inline) |

### 2.4 — Global guarantees

| Check | Expected | Actual | Verdict |
|---|---|---|---|
| G6 Prizma `stock_adjustment` rows | 0 (pre = post) | 0 | ✅ |
| G6 Prizma `stock_adjustment_reason` rows | 4 (pre = post) | 4 | ✅ |
| G6 Prizma `stock_lot` rows | 0 (pre = post) | 0 | ✅ |
| G6 Prizma `stock_movement` rows | 0 (pre = post) | 0 | ✅ |
| G7 main branch unchanged | main = pre-Pipeline SHA, ≠ develop | main = `966eb5bc8110fe2f229b4456fc04ba7e95e9afbf`, develop = `e92fe6451659c0af2531fb87d621c625c7669f9e` | ✅ (no merge / push / commit to main) |
| Pipeline commit count | 5 (per Executor) | 5: a1c74a3, e8b3b23, 93c1b91, dd4415c, e92fe64 | ✅ |
| Iron Rule 31 integrity gate | exit 0 on every commit | hook output "All clear — N files scanned" on each of the 5 commits | ✅ |
| Iron Rule 32 destructive-ops gate | each commit passes | each commit landed cleanly (no `--no-verify` used) | ✅ |
| Per-Part tags present | post-part-B, post-part-C, post-part-D + pre-night-2026-05-15-part-A-deferred + pre-night-pipeline-2026-05-15 anchor | all 5 present + pre-part-A + pre-part-B-done (pre-tag for Part B) | ✅ |

---

## 3. Iron Rule Compliance (per changed file)

### Part B (RPC redefinition)
- **Rule 14, 15:** N/A — no new tables; existing `stock_adjustment`/`stock_adjustment_reason` tables already have canonical RLS pair from GAP_CLOSURE.
- **Rule 18:** N/A — no new UNIQUE constraints.
- **Rule 11:** ✅ — sequential numbers (`next_lot_number`) called inside SECDEF RPC.
- **Rule 21:** ✅ — Executor honored the Foreman's intent by DROP + CREATE OR REPLACE (the only honest way to harmonize when signatures differ).
- **Rule 22:** ✅ — RPC body uses JWT-claim tenant guard; never trusts caller's `p_tenant_id` without verification.
- **Rule 23:** ✅ — no secrets.

### Part C (FK index sweep)
- **Rule 14, 15, 18:** N/A — `CREATE INDEX` is additive, no constraint changes.
- **Naming:** ✅ — `idx_<table>_<col>` lowercase pattern matches existing project convention. Longest = 60 chars (under 63-char identifier limit).
- **WHERE clause partial:** ✅ — every index has `WHERE <col> IS NOT NULL`, matching SPEC §3 C3.

### Part D (menu wiring)
- **Rule 6:** ✅ — index.html stays at repo root; only modified, not moved.
- **Rule 8:** ✅ — `shared/js/lens-nav-strip.js` uses `textContent` for the dynamic label string + template-strings with static-only content for the wrapper HTML (icon emoji + active class are static). No `innerHTML` with user input. Re-verified by reading the widget.
- **Rule 9:** ✅ — no hardcoded business values; the LENS_PAGES config is project-wide structural metadata, not tenant-specific.
- **Rule 10:** ✅ — `window.LensNavStrip` and `LENS_PAGES` are namespaced (LensNavStrip on window) and IIFE-wrapped — no global pollution beyond the one expected window property.
- **Rule 12:** ✅ — widget = 122 lines (target 300, max 350).
- **Rule 21:** ✅ — widget replaces 6 inline `<nav id="mainNav">` placeholders with one shared component; net consolidation.

---

## 4. Findings (severity-classified)

### CRITICAL
None.

### HIGH
None.

### MEDIUM
None this review. (FINDINGS F-1 from Part A is already HIGH-classified by Executor — Foreman to decide reframing path in Stage 9.)

### LOW
- **L-REV-1 (LOW):** lens-catalog-admin.html does NOT load `js/shared.js` / `js/auth-service.js`, so on that page the widget's `hasPermission()` calls always fall through to the 5-second timeout. The widget renders correctly (only the catalog-admin entry shows for super_admins via the `is_platform_super_admin` RPC), but the 5-second wait is visible to the user. Executor flagged this in EXECUTION_REPORT D5 as an in-flight decision. **Recommendation:** future SPEC could either (a) load auth-service.js on catalog-admin too (would unify the auth surface), or (b) shorten the widget's `hasPermission` wait when it detects it's on catalog-admin (e.g., via a body-class probe). Either is a 5-minute fix in a follow-up cleanup SPEC. Not blocking — does not affect correctness, only perceived latency on a low-traffic page (super_admins only).
- **L-REV-2 (LOW):** the Iron-Rule-32 hook flagged a pending-architect-entry warning on each of the 5 Pipeline commits (`_archive/architect-pending-entries/2026-05-15_m1_close_ceremony_skill_updates.md`). This is pre-existing state unrelated to Part A/B/C/D and was correctly left alone by the Executor under Full-Auto Pipeline pre-existing-files protocol. **Recommendation:** Foreman or next Architect session should sweep the pending-entries folder per the existing protocol; not blocking this Pipeline.

### INFO
- **I-REV-1 (INFO):** demo tenant carries 2 stock_adjustment rows + 2 stock_lot rows + 2 stock_movement rows post-Part-B (1 pre-existing from `M1_LENS_PHASE_1B_GAP_CLOSURE` smoke artifact + 1 from this Pipeline's Part B smoke). These follow the M1A-DEBT-04 smoke-artifact lineage and are explicitly expected per the Foreman's SPEC §3 B6 success criterion (which created them deliberately).

---

## 5. Comparison to peer Pipelines

| Pipeline | Reviewer verdict | Notes |
|---|---|---|
| M1B0_PURCHASE_ORDER_SCHEMA | 🟢 PASS | Textbook execution |
| M1_LENS_PHASE_1B_FOUNDATION | 🟢 PASS | First customer-facing Pipeline |
| M1_LENS_PHASE_1B_PROCUREMENT | 🟡 PASS WITH FOLLOW-UPS | 3 HIGH findings (became GAP_CLOSURE) |
| M1_LENS_PHASE_1B_GAP_CLOSURE | 🟢 PASS | Closed Procurement's gaps + introduced 2 own (per-column probe + apply_migration fallback — both became SKILL.md additions) |
| **M1_LENS_PHASE_2_COMPLETION** | **🟢 PASS** | First M1 Pipeline with Tier 3 deferral (Part A) handled cleanly; rest of Pipeline ran textbook. The Tier 3 mechanism worked exactly as designed — honest deferral, comprehensive finding for the Foreman, Parts B/C/D unaffected. |

The trajectory continues: each successive M1 Pipeline has either closed its predecessor's gaps OR (this one) used the Tier 3 deferral mechanism that the Foreman built in for exactly this scenario. Bounded Autonomy + expanded recovery autonomy demonstrably works at scale.

---

## 6. Reviewer's own self-assessment

- **Coverage:** 7/7 Foreman-priority spot-checks performed live against DB + filesystem. 4 additional global guarantees (G5/G6/G7 + Iron Rule 31) also verified.
- **Independence:** Reviewer's probes did not duplicate the Executor's smoke — different angles (e.g., reviewer counted LENS_PAGES entries via grep, not via Executor's claim; reviewer pulled the body bytes from the live RPC, not from MIGRATION.md).
- **Honesty:** the 2 LOW findings are real and worth logging even though they don't block this Pipeline. The 1 INFO note about demo smoke artifacts is documented so it doesn't get flagged as drift later.
- **Score: 9/10** — deducted 1 because the reviewer did not exercise the widget's actual rendering in a browser (deferred to Stage 7 Localhost-Tester per Pipeline plan); that's a coverage gap by design (this stage is server-side only).

---

## 7. Recommendations for Stages 7-9

1. **Stage 7 Localhost-Tester:** focus on (a) `npm run smoke` baseline 7/7 PASS (already verified by Executor post each Part — repeating in a fresh session is the Tester's job), (b) Chrome MCP screenshots of all 7 lens pages including the rendered nav widget, (c) per-page console-error check (SC D4 deferred from Stage 5), (d) verify the widget's permission-gating actually hides links for non-CEO users on demo tenant.
2. **Stage 8 Sentinel:** Missions 1+8+10 — expect ZERO new CRITICAL/HIGH alerts; possibly NEW MEDIUM for the catalog-admin auth asymmetry pattern + L-REV-2 pending-entries warning. The new `shared/js/lens-nav-strip.js` file should be reflected in any file-count tracking.
3. **Stage 9 Foreman:** the FOREMAN_REVIEW.md should comment on (a) the SPEC §7 parenthetical that incorrectly assumed CREATE OR REPLACE replaces overloads (P-AUTHOR candidate for next harvest), (b) D-M1-09 reframing recommendation from FINDINGS F-1 (decide between "RESOLVED — reframed" vs "re-author as UX-consistency mandate"), (c) skill-improvement proposals for both opticup-strategic and opticup-executor harvested from this Pipeline.

---

*End of REVIEW.md. Verdict 🟢 PASS — Pipeline ready to advance to Stage 7 (Localhost-Tester) without remediation commits.*
