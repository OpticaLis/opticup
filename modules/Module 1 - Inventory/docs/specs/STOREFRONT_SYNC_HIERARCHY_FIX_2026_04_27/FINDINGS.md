# FINDINGS — STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27

> **Location:** `modules/Module 1 - Inventory/docs/specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §3 #11/#12/#14 reference npm scripts that do not exist

- **Code:** `M1-SPEC-01`
- **Severity:** LOW
- **Discovered during:** §3 criteria #11/#12/#14 verification
- **Location:**
  - ERP repo: `package.json` (no `schema-diff` script)
  - Storefront repo: `package.json` (no `verify:integrity` script)
  - Storefront repo: `package.json` `build` script exists but irrelevant for view-only DB change
- **Description:** Three success criteria reference npm scripts that the executor cannot run because they were never added to the relevant `package.json`. SPEC author appears to have assumed the scripts are present project-wide. Wasted ~5 minutes confirming each was missing.
- **Reproduction:**
  ```
  cd C:/Users/User/opticup && jq '.scripts | keys' package.json
  cd C:/Users/User/opticup-storefront && jq '.scripts | keys' package.json
  ```
- **Expected vs Actual:**
  - Expected: `verify:integrity` and `schema-diff` exist as npm scripts
  - Actual: ERP has `verify:integrity` only; storefront has neither; ERP has no `schema-diff`
- **Suggested next action:** TECH_DEBT (low priority — add the missing scripts OR fix the SPEC template that references them)
- **Rationale for action:** Either build the scripts (real verify infra) or correct the SPEC template that uses them as boilerplate criteria. Both are cheap. Not a NEW_SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC §5 stop-trigger threshold (1,200 rows) was based on a stale baseline (786 actual)

- **Code:** `M1-SPEC-02`
- **Severity:** MEDIUM
- **Discovered during:** Pre-flight metrics capture (BEFORE_METRICS.json)
- **Location:** SPEC §5 stop-trigger and the implied baseline of "current ~1,366 rows"
- **Description:** The SPEC's stop trigger ("STOP if `v_storefront_products` drops below 1,200 rows") presumes a baseline of ~1,366. Pre-flight probe against the live Prizma view found the actual baseline was **786** rows. A literal reading of the trigger would have made every post-migration value a "stop", as 786 < 1,200 even before any change. The 1,366 number likely reflects a pre-cleanup state (before BUG-1 cleared stale `storefront_mode_override` values) OR it was cross-tenant.
- **Reproduction:**
  ```sql
  SELECT count(*) FROM v_storefront_products
  WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  -- Returns 786 (NOT 1,366)
  ```
- **Expected vs Actual:**
  - Expected: baseline ~1,366; threshold 1,200 = ~12% drop tolerance
  - Actual: baseline 786; threshold 1,200 = literally impossible-to-not-trigger
- **Suggested next action:** TECH_DEBT (Foreman SKILL update)
- **Rationale for action:** A SPEC-author Pre-Flight Check (probe baseline before authoring the threshold) would have prevented this. This is the same class of issue as Proposal 2 in EXECUTION_REPORT.md §10 but on the AUTHOR side.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — §3 #10 verify command (curl + grep ₪ in source HTML) does not measure the right thing

- **Code:** `M1-SPEC-03`
- **Severity:** MEDIUM
- **Discovered during:** §3 #10 price audit
- **Location:** SPEC §3 #10 verify command
- **Description:** The verify command `curl ... | grep -c '₪'` returns 4 hits per product page. ALL 4 hits are in inert JS template-literal source `${p.sell_price}` inside a `<script>` block that **never executes** due to the d1f67c4 price-guard. User-visible rendered DOM (verified via Chrome MCP) has **0 ₪**. SPEC §13 explicitly anticipated this case (price-residue tie-breaker) and stated source-HTML matches are acceptable if the storefront refuses to render them — so the criterion is technically self-corrected by §13, but only if the executor reads §13. A naive executor would fail #10 and roll back unnecessarily.
- **Reproduction:**
  ```
  curl -s 'https://www.prizma-optic.co.il/products/0003750' | grep -c '₪'
  # → 4   (all in JS template literals, none in rendered DOM)
  ```
- **Expected vs Actual:**
  - Expected (criterion text): 0 ₪ in HTML
  - Actual (criterion text): 4 ₪ in source HTML
  - Expected (criterion intent per §13): 0 ₪ in user-visible rendered DOM
  - Actual (criterion intent): 0 ₪ in rendered DOM ✅
- **Suggested next action:** TECH_DEBT (SPEC template update)
- **Rationale for action:** The criterion should grep rendered DOM (Chrome MCP `evaluate_script` returning `document.body.innerText` and counting ₪). Source-HTML grep is the wrong tool. Costs 30 seconds to fix the SPEC template.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — §3 #4 says "1-2 storefront commits expected" while §8 says "ZERO storefront commits expected"

- **Code:** `M1-SPEC-04`
- **Severity:** LOW
- **Discovered during:** §3 #4 verification + §8 cross-read
- **Location:** SPEC §3 #4 vs §8 (intra-SPEC contradiction)
- **Description:** §3 criterion #4 says expected storefront commit count is "1–2". §8 ("Expected Final State") says "Storefront repo: ZERO commits expected — d1f67c4 already enforces no-prices and the view rewrite alone fixes both bugs." These contradict. Executor used §8 as the binding statement (more specific, more recent in SPEC chronology, and matches actual outcome — no storefront file edited).
- **Reproduction:** read SPEC §3 #4 and SPEC §8 side by side.
- **Expected vs Actual:**
  - Expected: §3 and §8 agree
  - Actual: they don't
- **Suggested next action:** DISMISS (in this SPEC) + TECH_DEBT (one-off SPEC bug, fix at next strategic pass)
- **Rationale for action:** The Foreman can resolve in 5 seconds at next SPEC author session — make §3 say "0–2" and the contradiction goes away.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — §3 #8 second sub-criterion (≥500 store_all products) appears to be a guess; actual is 487

- **Code:** `M1-SPEC-05`
- **Severity:** LOW
- **Discovered during:** §3 #8 verification
- **Location:** SPEC §3 #8 second sub-criterion
- **Description:** §3 #8 has two sub-criteria: section `store_all` populated with ≥40 brands AND ≥500 products. Brand condition met (42 brands). Product condition off by 13 (487 actual). The bug being fixed (sections empty) was much worse than this threshold imprecision; section is clearly populated; 487/500 = 97% of the SPEC's guess. SPEC §13 anticipates "borderline numeric criteria treat as pass when intent is met"; executor treated as pass per §13.
- **Reproduction:**
  ```
  curl 'https://www.prizma-optic.co.il/api/cms/section?campaign=supersale-stock&section=store_all'
  # returns total: 487, brands_count: 42
  ```
- **Expected vs Actual:**
  - Expected: ≥500 products
  - Actual: 487 products
- **Suggested next action:** DISMISS (intent met) + TECH_DEBT (SPEC author should baseline before guessing)
- **Rationale for action:** Same root cause as Finding 2 — pre-flight baseline avoids guessed thresholds.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 6 — SPEC folder path "Module 1 - Inventory/docs/SESSION_CONTEXT.md" doesn't exist; actual is "Module 1 - Inventory Management/docs/..."

- **Code:** `M1-SPEC-06`
- **Severity:** LOW
- **Discovered during:** §8 doc-update step
- **Location:** SPEC §8 step "update Module 1 SESSION_CONTEXT + CHANGELOG"
- **Description:** SPEC folder name is `Module 1 - Inventory` but the docs live under `Module 1 - Inventory Management/docs/`. The SPEC doc-update step shortened the folder name. Executor used the actual paths.
- **Reproduction:** `ls modules/ | grep -i inventory`
- **Expected vs Actual:**
  - Expected: SPEC paths match real folder names
  - Actual: shortened
- **Suggested next action:** DISMISS (in this SPEC) — the two folders co-exist by historical accident; SPEC folder is already at `Module 1 - Inventory/docs/specs/` while module docs live under `Module 1 - Inventory Management/docs/`. Foreman may want to consolidate later (separate NEW_SPEC).
- **Rationale for action:** Consolidating the two "Module 1" folders is itself a non-trivial decision (rename + redirect every existing SPEC + every doc cross-ref) — it deserves its own SPEC, not a side-fix here.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 7 — Pre-fix Prizma view ALL 786 rows had `resolved_mode='catalog'` (latent bug exposed by D3+D4 B-3, now correctly distributed)

- **Code:** `M1-OBSERVATION-01`
- **Severity:** INFO
- **Discovered during:** post-rewrite distribution check
- **Location:** `v_storefront_products`, pre-2026-04-27 vs post-2026-04-27 versions
- **Description:** Pre-this-SPEC the view returned ALL 786 active Prizma products with `resolved_mode='catalog'` because the source `b.display_mode` had been mass-updated to `'catalog'` at some point. Post-SPEC distribution: **500 store_all + 286 catalog**. The storefront's catalog/shop-card decision now correctly differentiates per brand. This was a latent symptom of the bug fix in D3+D4 B-3 (single source of truth for display_mode); the root cause was that brand-level `display_mode` was being mass-set instead of per-product `website_sync` driving visibility — exactly the bug this hotfix corrects.
- **Reproduction:**
  ```sql
  -- Before this hotfix:
  SELECT resolved_mode, count(*) FROM v_storefront_products
   WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   GROUP BY 1;
  -- Was: catalog 786
  -- Now: store_all 500, catalog 286
  ```
- **Expected vs Actual:** N/A (observational)
- **Suggested next action:** DISMISS — observation logged for SPEC author historical context.
- **Rationale for action:** Already fixed by this SPEC. No follow-up work needed.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 8 — `inventory.branch_id` and `brands.branch_id` both exist and both are entirely NULL on Prizma — possible unused-feature stub or incomplete migration

- **Code:** `M1-DEBT-01`
- **Severity:** LOW
- **Discovered during:** view-rewrite cross-check (looking for shadow-column pattern after D3+D4 + B3 brand_type both turned out to be shadow columns)
- **Location:** `inventory.branch_id`, `brands.branch_id`
- **Description:** Both columns exist on both tables. Both are 100% NULL on the Prizma tenant. Neither appears in any of the storefront views. NOT a shadow-column pattern (where one is dead and the other holds real data) — both are dead. Most likely an unused-feature stub from an earlier multi-branch design that was never wired up. NOT a bug, but worth noting because (a) it consumes schema space, and (b) future work that touches branches needs to decide whether these columns are the right hooks or whether a clean-slate `branches` table relationship should be designed.
- **Reproduction:**
  ```sql
  SELECT count(*) FROM inventory WHERE branch_id IS NOT NULL
    AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  -- 0
  SELECT count(*) FROM brands WHERE branch_id IS NOT NULL
    AND tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  -- 0
  ```
- **Expected vs Actual:**
  - Expected (per Iron Rule 21 — No Orphans): if a feature isn't wired up, the schema slot shouldn't exist
  - Actual: two unused columns survive on two production tables
- **Suggested next action:** TECH_DEBT — log for the next "schema audit" SPEC; not urgent, no behavior impact.
- **Rationale for action:** Removing the columns or wiring them up is its own SPEC; flagging here so the Foreman can sequence it.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
