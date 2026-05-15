# Session Context — Module 1: Inventory Management

## Last Updated
M1_LENS_PHASE_1B_PROCUREMENT — 2026-05-15 (🟡 closing — 11 commits, Phase 1B procurement-half done)

## 2026-05-15 — M1_LENS_PHASE_1B_PROCUREMENT (🟡 CLOSED WITH FOLLOW-UPS — Full Auto Pipeline single chat)

**Goal:** Ship Phase 1B procurement-half — 3 write-heavy screens (Purchase Order, Active POs List, Goods Receipt) wiring M1B0 RPCs through user-facing UI + replace foundation Inventory ➕➖ stubs with real wiring. Closes Phase 1B (paired with M1_LENS_PHASE_1B_FOUNDATION).

**What shipped (11 commits):** SPEC seal → permission seed (12 perms + 34 role_perms across demo + prizma per §0.D matrix) → root-allowlist → PO screen (HTML + 6 JS) → POs List screen (HTML + 4 JS) → GR screen (HTML + 8 JS) → ➕➖ wiring on lens-inventory-modals.js (32 → 195 lines, foundation grid file untouched per SPEC §7) → 5 JS bug fixes from smoke discovery → fetchAll signature fix → TEST_REPORT → close commit.

**Smoke results:**
- Phase A (functional, demo + JWT-direct via SET LOCAL): 11/14 PASS, 1 partial, 2 fail (variant-less manual K2-rejected; ➖ adjust missing infrastructure).
- Phase B (UI-level, Chrome MCP, Prizma CEO @ localhost:3000?t=prizma): 4/4 screens render with zero console errors. P-AUTHOR-1 counter 1/3 → 2/3 (session-cache staleness fired exactly as predicted).
- Phase C (permission OUTCOME matrix replicating getEffectivePermissions): 36/36 (18 positive CEO × 6 keys + 18 negative non-CEO × 6 keys on demo).

**3 HIGH findings queued for Phase 2 SPECs (all M1B0/M1A foundational gaps, out of scope per §7):**
- F-1 — `m1_create_receipt_from_box` doesn't update PO.status nor PO_line.qty_received nor discrepancy_qty → SPEC `M1_K2_RECEIPT_COMPLETION` queued.
- F-2 — K2 cannot accept variant-less manual receipt lines (stock_lot.variant_id NOT NULL) → SPEC `M1_RECEIPT_VARIANT_LESS_LINES` queued.
- F-3 — ➖ adjust flow has no functioning RPC (no record_adjustment_lost RPC, no stock_adjustment table) → SPEC `M1_STOCK_ADJUSTMENT_INFRA` queued.

**Iron Rules:** 17/17 in-scope rules PASS. Iron Rule 32 §Destructive Operations = `None.` held throughout. Integrity Gate exit 0 across all 11 commits.

**Status:** 🟡 Executor scope CLOSED. Awaiting Reviewer + Foreman. 75% of GR/PO use cases work today; 3 Phase 2 SPECs needed to unblock the remaining 25%. Daniel logout/login required on real-user sessions before screens are accessible (P-AUTHOR-1 known cache-staleness).

**Next:** Reviewer re-runs §3 SCs against live state + advisors-for-objects sweep + 3 spot-checks; Foreman writes FOREMAN_REVIEW.md + queues 3 Phase 2 SPEC stubs + Hebrew status line; Module 1 Close Ceremony triggered per opticup-architect SKILL.md.

---

## 2026-05-15 — M1B_FOUNDATION_PERMISSIONS_HOTFIX (🟢 closing — Full Auto Pipeline single chat, 8/8 smoke PASS)

**Goal:** Close the Foundation Pipeline's discipline gap — Daniel's real-user PIN-auth on demo hit "אין הרשאה למסך זה (lens.inventory.view)" on all 3 new lens screens despite Foundation declaring 9/9 smoke PASS. Foundation seeded the 6 `permissions` rows but never seeded any `role_permissions` assignments because Foundation's smoke ran in JWT-direct context and never exercised the real client-side `hasPermission()` cache.

**Scenario:** B (Phase A §0 probes A1-A7 pinned at SPEC author time) — keys exist on both tenants, but 0 role_permissions assignments. Fix = 18 INSERTs to role_permissions per the role-tier matrix (ceo + manager: all 3 lens.* keys; team_lead + viewer + worker: lens.inventory.view only).

**What shipped (4 commits, ~25 min wall-clock):**

- `8c1e593` chore(spec): open M1B_FOUNDATION_PERMISSIONS_HOTFIX — SPEC + ROLLBACK + MIGRATION skeleton
- `c938ab5` feat(m1): seed lens role_permissions (5 roles × 3 keys matrix × 2 tenants) — 18 rows
- `6b40d2f` test(m1): UI-level real-user smoke (5+2+1) — closes Foundation discipline gap
- _(this commit)_ chore(spec): close — EXECUTION_REPORT + SESSION_CONTEXT

**Pipeline stats:**

- 1 MCP migration applied to live Supabase (`m1b_foundation_permissions_hotfix_seed_lens_role_permissions`, single block emitting 18 INSERTs with ON CONFLICT idempotency, both tenants in one call).
- 8 smoke sub-cases on demo — all PASS at executor scope:
  1. Server-side correctness × 5 roles (ceo+manager: 3 lens.* keys each; team_lead/viewer/worker: lens.inventory.view only) ✓
  2. JWT-mint positive — PIN 12345 (ceo equivalent) → 59 keys total, all 3 lens.* booleans true ✓
  3. JWT-mint negative — PIN 090001 (worker) → 18 keys total, lens.inventory.view=true, .manage keys=false ✓
  4. Static HTML access-gate markers in all 3 screens (3/3 hits) ✓
  5. Total post-fix row count = 18 (demo=9, prizma=9) ✓
- 0 escalations to Foreman/Daniel. 0 destructive ops (Iron Rule 32 §7=`None.` held). 0 main-branch modifications. 0 Prizma data writes beyond the 9 row-set authorized by SPEC.
- 14 success criteria + 6 process criteria = 20 measurable PASS at executor scope + 4 deferred to Reviewer/Foreman (REVIEW.md verdict, FOREMAN_REVIEW.md verdict + counter 1/3 proposal, Hebrew status line).
- 5 findings logged: F-1 (HIGH — the Foundation discipline gap, becomes skill-improvement proposal counter 1/3); F-2/F-4/F-5 (INFO); F-3 (LOW).

**Status:**

- 🟢 Executor scope CLOSED. Awaiting Reviewer + Foreman.
- ✅ 3 lens screens (Inventory display, Active Designs, Catalog & Pricing) unblocked for real-user PIN-auth on demo + prizma. ceo + manager roles see full screens; team_lead + viewer + worker see Inventory display only; worker users correctly hit access-gate on Pricing/Designs screens (negative test).
- 🟡 Final-mile manual click-through pending Daniel's verification on real browser (standard per CLAUDE.md §1 project pattern). Procurement Pipeline held until 🟢 + Daniel manual PASS.

**Next:** Reviewer re-runs §3 criteria against live state + spot-checks Prizma role-tier discrimination; Foreman writes FOREMAN_REVIEW.md (logs the discipline gap as counter 1/3 skill-improvement proposal) + Hebrew status line to Daniel.

---

## 2026-05-15 — M1_LENS_PHASE_1B_FOUNDATION (🟢 closing — Full Auto Pipeline single chat, 9/9 smoke PASS)

**Goal:** Ship the foundation half of M1 Lens Phase 1B — 3 read-heavy screens (Inventory display, Active Designs toggle, Catalog & Pricing) + 3 metadata RPCs (toggle_active_offering, upsert_pricing_overlay, bulk_apply_pricing_overlay) + 3 permission keys × 2 tenants seeded. Mandatory functional smoke 9/9 PASS on demo before close.

**What shipped (10 commits, ~90 min wall-clock):**

- `dfa5e81` chore(spec): open SPEC + MIGRATION + ROLLBACK
- `112435f` Block 1: 6 permission rows seeded (3 lens.* keys × demo + prizma)
- `4a939c7` Block 2: toggle_active_offering RPC (v1) — atomic UPSERT on tenant_active_offerings
- `0d6a032` Block 3: upsert_pricing_overlay RPC — SELECT-then-UPDATE-or-INSERT preserving exactly-one-scope CHECK
- `af92916` Block 4: bulk_apply_pricing_overlay RPC — atomic INSERT...SELECT FROM unnest
- _(commit)_ Screen #1: lens-inventory.html + 5 JS files (main, filters, grid, lot-pane, modals) + root-allowlist
- _(commit)_ Screen #2: lens-active-designs.html + 3 JS files (main, tree, toggle)
- _(commit)_ Screen #3: lens-pricing.html + 5 JS files (main, filters, grid, inline-edit, bulk)
- _(commit)_ test(m1): functional smoke 9/9 PASS + Block 2 v2 fix (constraint→index inference)
- _(this commit)_ chore(spec): close — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + FILE_STRUCTURE + SESSION_CONTEXT + CHANGELOG

**Pipeline stats:**

- 5 MCP migrations applied to live Supabase (4 blocks + 1 v2 fix; no `supabase/migrations/*.sql` per TD-2 precedent).
- 9 functional smoke cases on demo tenant — all PASS at executor scope:
  1. Inventory display fixtures (1+1+1 brand/design/variant, 3 TLS, 7 stock_lot) ✓
  2. toggle_active_offering INSERT-then-UPDATE round-trip (1 row, is_active=false after toggle) ✓
  3. effective_price = 100 (no overlay, no VAT-link on demo offering) ✓
  4. upsert_pricing_overlay 10% → final 90 ✓
  5. bulk_apply_pricing_overlay 1 row inserted + empty-array 0 ✓
  6. Anon-reject all 3 RPCs (42501) ✓
  7. Cross-tenant reject all 3 RPCs + Prizma untouched ✓
  8. Permission gate present in all 3 main JS files (lens.*.* keys via hasPermission()) ✓
  9. JS syntax all 13 files pass node --check; live-browser final-mile deferred to Daniel manual QA ✓
- 1 mid-pipeline pivot: Block 2 v1 used `ON CONFLICT ON CONSTRAINT` but the partial unique index isn't a constraint — v2 CREATE OR REPLACE switched to `ON CONFLICT (cols) WHERE pred` index-inference. SPEC §0 D11 pre-authorized both directions; no escalation needed.
- 5 findings logged: F-1 (resolved in-pipeline), F-2 (Iron Rule 7 carve-out — refine SPEC criterion for future), F-3 (fixture content vs smoke assertion — promote to next-harvest A2 sub-step), F-4 (sparse demo catalog — extend M1A-DEBT-04), F-5 (effective_price pre-existing 2-line JWT guard — out of scope, batch into future hardening SPEC).
- 0 escalations to Foreman/Daniel. 0 destructive ops (Iron Rule 32 §7=`None.` held across all 9 commits). 0 main-branch modifications. 0 Prizma data writes.
- 30 success criteria: 28 PASS at executor scope + 2 deferred to Reviewer (criterion 21 `verify --full`; criterion 30 last 2 lifecycle files written by Reviewer + Foreman).
- 4 author-proposals + 4 executor-proposals from prior FOREMAN_REVIEWs were inherited from frozen-skill state (`M1_SKILL_IMPROVEMENT_HARVEST` ca823e3) and demonstrably reduced mid-execution pivots.

**Status:**

- 🟢 Executor scope CLOSED. Awaiting Reviewer + Foreman.
- ✅ Phase 1B foundation unblocked for Daniel manual QA on demo.
- 🟡 Smoke artifacts persist on demo (M1A-DEBT-04 lineage extended): 1 tenant_active_offerings row (is_active=false), 2 pricing_overlay rows (10% inline + 5% bulk, status=active). Sibling SPEC `M1_LENS_PHASE_1B_PROCUREMENT` reuses or extends.

**Next:** Reviewer re-runs §3 criteria against live state + runs scripts/audit/advisors-for-objects.mjs against the 3 new RPCs; Foreman writes FOREMAN_REVIEW.md + Hebrew status line to Daniel.

---

## 2026-05-15 — M1B0_PURCHASE_ORDER_SCHEMA — Previous entry below
## Previous Last Updated
M1B0_PURCHASE_ORDER_SCHEMA — 2026-05-15

## 2026-05-15 — M1B0_PURCHASE_ORDER_SCHEMA (🟢 closing — Full Auto Pipeline single chat, 6/6 smoke PASS)

**Goal:** Phase 1B prerequisite — ship the 3 schema objects Phase 1A skipped (`purchase_order`, `purchase_order_line`, `supplier_debt`) + 5 supporting RPCs + 2 FK back-pointers + K2 extension wiring debt creation at receipt close (D-M1-11). Schema-only — no UI. Mandatory functional smoke before SPEC close.

**What shipped (8 commits, ~80 min wall-clock):**

- `0c23a15` chore(spec): open SPEC + ROLLBACK skeleton
- `df338c4` 3 tables (purchase_order + purchase_order_line + supplier_debt) — canonical 2-policy RLS + tenant-scoped UNIQUE partial indexes + Iron Rule 19 enum CHECK constraints + table-level multi-column CHECKs for line `source` rules
- `621b807` Block 4 — FK back-pointers on stock_lot + purchase_receipt (clauses on pre-existing Phase 1A columns) + supporting indexes
- `441c1f7` Blocks 5-8 — 4 PO RPCs: next_purchase_order_number (distinct from legacy next_po_number(uuid,text) via Iron Rule 21 divergence), place_purchase_order, mark_po_sent, cancel_purchase_order. All SECDEF + search_path=public + JWT-claim guard + REVOKE/GRANT discipline
- `362a330` Blocks 9+10 — m1_create_supplier_debt_from_receipt (idempotent via ON CONFLICT with WHERE on partial UNIQUE) + K2 extension (CREATE OR REPLACE — added subtotal accumulator inside LOOP + active-IL-VAT lookup with `effective_until IS NULL` filter + 18% computation + 5-arg call to debt RPC)
- `46ff2d2` T.PURCHASE_ORDER + T.PURCHASE_ORDER_LINE + T.SUPPLIER_DEBT in shared.js + 3 Hebrew-keyed FIELD_MAP entries
- `bb39599` test(m1): demo functional smoke — 6/6 PASS
  - Case 1: place_purchase_order(3 lines) → PO-000001 draft 3 lines sources match ✓
  - Case 2: mark_po_sent → status=sent + sent_at set ✓
  - Case 3: K2 (m1_create_receipt_from_box) → 2 receipt_line/2 lot/2 movement/1 debt row at total_amount=234.82 vat_amount=35.82 + idempotency PASS (2nd debt RPC returns same id) ✓
  - Case 4a-c: cancel-flow → success on draft + 42501 on cancelled + 42501 on partial ✓
  - Case 5a-e: anon-reject on all 5 new RPCs → 42501 ✓
  - Case 6: cross-tenant Prizma JWT → 42501 + 0 Prizma rows + 20 legacy purchase_orders rows on demo unchanged ✓
- _(this commit)_ chore(spec): close — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + SESSION_CONTEXT + CHANGELOG

**Pipeline stats:**

- 10 MCP migrations applied to live Supabase (no `supabase/migrations/*.sql` per TD-2 precedent).
- 6 functional smoke cases (incl. 3+5 sub-cases in cases 4-5) on demo tenant. All PASS.
- 0 escalations. 0 Foreman amendments. SPEC was author-clean — every probe in §0 surfaced reality before DDL, including 3 Brief-vs-reality divergences (D1 `next_po_number` name conflict → renamed to `next_purchase_order_number`, D2 `vat_rates.active` column absent → use `effective_until IS NULL`, D3 `purchase_receipt.purchase_order_id` already exists → just add FK clause).
- 2 author-proposals from M1A FOREMAN_REVIEW applied in §0: orchestrator call-arity audit (3 audits clean) + smoke-touched schema audit (11 tables audited).
- Zero Prizma data written. Zero destructive ops (Iron Rule 32 §7=None held across all 8 commits). Zero main-branch modifications.
- 30 success criteria all measurable; 28 PASS at executor scope + 2 deferred to Reviewer (advisor lint detail review + final cross-tenant probe with smoke artifact age).

**Status:**

- 🟢 Executor scope CLOSED. Awaiting Reviewer + Foreman.
- ✅ Phase 1B unblocked — customer-facing screen SPECs can build on verified schema + RPCs.
- 🟡 Smoke artifacts persist on demo (M1A-DEBT-04 lineage extended): 2 surviving PO rows, 1 receipt row, 1 debt row at `ab9cdc83-006a-4ced-8a51-e15ec2c08260`. Phase 1B's §0 reuses or re-seeds.

**Next:** Reviewer re-runs §3 criteria against live state; Foreman writes FOREMAN_REVIEW.md + Hebrew status line to Daniel.

---

## 2026-05-15 — M1A_OPERATIONS_RPCS_FIX (🟢 closing — Full Auto Pipeline single chat, 6/6 smoke PASS)

**Goal:** Close 8 post-Phase-1A operations-layer bugs surfaced by Strategic + Code reviews (B-01 lot double-add, B-02 ON CONFLICT inference, A-01 view anon grants, C-1/C-2/C-3 SECDEF EXECUTE creep, D-3 K3 idempotency, E-2 view ACL, F-1/F-2 lens-catalog-import config + gate) — all in one Pipeline before Phase 1B starts.

**What shipped (12 commits, ~110 min wall-clock):**

- **Original 8 fixes (8 commits):**
  - `b0d44c1` (open SPEC + MIGRATION + ROLLBACK)
  - `54ede72` (Fix #1+#2 — record_stock_movement double-add + ON CONFLICT WHERE)
  - `279b12b` (Fix #4 — REVOKE/GRANT on 10 SECDEF fns)
  - `0024dd3` (Fix #5 — next_lens_variant_display_id JWT guard)
  - `18697f4` (Fix #3 — v_suppliers_for_m9 ACL)
  - `8fe2a1a` (Fix #8 — K3 idempotency UNIQUE + ON CONFLICT DO NOTHING)
  - `474cc6b` (Fix #7 — lens-catalog-import fail-closed gate, v1→v2)
  - `7e52bb8` (Fix #6 — config.toml block)

- **Mid-pipeline Amendments (2 commits, Foreman-authorized):**
  - `826fc12` (Amendment #1 / Fix #9 — record_transfer 17→19 positional args after smoke Case 3 surfaced 42883)
  - `60d4cd2` (Amendment #2 / Fix #10 — record_adjustment_found 20→19 positional args + position-11 self-ref alignment after smoke Case 5 surfaced 42883; Foreman granted broad pre-authorization for any further same-class defects — none surfaced)

- **Smoke + close (2 commits):**
  - `cc95157` test(m1): demo functional smoke — 6/6 PASS
  - _(this commit)_ chore(spec): close — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + SESSION_CONTEXT + CHANGELOG

**Pipeline stats:**
- 7 MCP migrations applied to live Supabase (no `supabase/migrations/*.sql` per TD-2 precedent).
- 1 EF (`lens-catalog-import`) redeployed v1→v2 via CLI fallback (MCP deploy 5xx — Pattern A5 pre-authorized).
- 6 functional smoke cases on demo tenant (8d8cfa7e-…): record_stock_movement('receipt') + m1_create_receipt_from_box + record_transfer + next_lens_variant_display_id anon-reject (2 sub-cases) + record_adjustment_found + effective_price. All PASS.
- 2 mid-pipeline escalations to Foreman (both critical pre-existing orchestrator defects); both resolved in-pipeline via Foreman amendments.
- 0 Prizma data touched. 0 destructive ops. 0 main-branch modifications.
- 25 success criteria (23 measurable PASS in executor scope + 2 deferred to Reviewer).
- §7 Destructive Operations = `None.` per Iron Rule 32 — held throughout 12 commits.

**Status:**
- 🟢 Executor scope CLOSED. Awaiting Reviewer (re-verify §3 success criteria against live state) then Foreman post-execution review (FOREMAN_REVIEW.md + Hebrew status line to Daniel).
- ✅ All 8 SPEC-enumerated fixes + 2 amendment fixes live.
- ✅ Phase 1B unblocked — orchestrator chain (receipt + transfer + adjustment_found) runnable end-to-end on demo.
- 🟡 Demo lens-catalog seed fixtures persist (F-3+F-8 — log as `M1A-DEBT-04`); Phase 1B can re-use.

**Next:** Reviewer verification, then Foreman review + 1-line Hebrew status to Daniel.

---

## 2026-05-15 — M1A Debt Sweep (✅ CLOSED — Full Auto Pipeline single chat, 🟢 verdict)

## 2026-05-15 — M1A Debt Sweep (✅ CLOSED — Full Auto Pipeline single chat, 🟢 verdict)

**Goal:** Close 3 tracked debts from Phase 1A + currencies-hotfix FOREMAN_REVIEWs, plus apply 4 accumulated skill self-improvement proposals — all in one consolidated maintenance Pipeline, before Phase 1B starts.

**What shipped (12 commits, ~50 min wall-clock):**

- **Commit Group A — 4 skill self-improvements applied BEFORE SPEC authoring (Locked Decision #2):**
  - `4aa7ecd` — opticup-strategic: new reference `RLS_PATTERN_GLOBAL_REFERENCE.md` (5-policy pattern for universal-data tables) + Architectural Principle #10.
  - `eed7ad4` — opticup-strategic: SPEC Authoring Step 5.3 "DDL boundary scan" (Path A MCP-only-apply vs Path B Daniel-bypass pre-decision).
  - `27cddac` — opticup-executor: proactive `node scripts/verify.mjs --staged` before EVERY git commit (paid off on this Pipeline's very first run — surfaced the rule-15 dependency).
  - `b3b58f9` — opticup-executor: Level-3a destructive-pattern execution playbook (MIGRATION.md in SPEC folder pattern).

- **Commit Group B — 3 debt commits (REORDERED to B3 → B1 → B2 per Executor real-time decision after proactive verify surfaced a rule-15 dependency that B3 had to fix first):**
  - `913fa47` (B3) — `fix(verify): close M1_5_VERIFY_HOOKS_REGEX_FIXES`. rule-15 policyRE accepts both `\w+` and `"[^"]+"` (quoted policy names). rule-21 PATTERNS anchor at `^` with `/gm` (top-level only). 38 false positives eliminated.
  - `fdf3e2c` (B1) — `fix(m1,schema): close M1A-DEBT-02`. 4 UNIQUE constraints get tenant_id (document_links, payment_allocations, conversation_participants, message_reactions). Phase 1A 17-table + 9-RPC + K3 + K5 summary appended. 2 doc-sync adaptations: line-767 comment + expense_folders RLS lines.
  - `52088ed` (B2) — `feat(shared): close M1A-DEBT-03`. T.CURRENCIES + 6-column FIELD_MAP entry.

- **Commit Group C — close (this commit):**
  - FOREMAN_REVIEW.md + MASTER_ROADMAP §5 (3 RESOLVED rows) + TECH_DEBT.md (RULE18-COMMENT-FALSE-POSITIVE entry) + this SESSION_CONTEXT sweep section.

**Pipeline stats:**
- Auth + RLS + CRM + Storefront baseline smoke: 7/7 PASS on demo tenant (`e36283f` TEST_REPORT).
- Reviewer verdict: 🟢 PASS at `74435ed`. 5 spot-checks all PASS.
- Foreman verdict: 🟢 CLOSED. 3 additional spot-checks all PASS (8/8 total).
- 4 findings logged, all disposed: 3 dismissed in-pipeline + 1 promoted to TECH_DEBT (RULE18-COMMENT-FALSE-POSITIVE).
- 0 escalations to Daniel. 0 destructive ops. 0 main-branch modifications.
- §4 Destructive Operations declared `None.`; Iron Rule 32 implicit-forbid satisfied.

**Status:**
- ✅ 3 debts closed (M1A-DEBT-02, M1A-DEBT-03, M1_5_VERIFY_HOOKS_REGEX_FIXES) — MASTER_ROADMAP §5 reflects.
- ✅ 4 skill improvements applied — proposals from 2 prior FOREMAN_REVIEWs now in SKILL.md / references.
- ✅ Verify hooks now accept quoted policy names + reject only top-level orphans (false-positive rate ~0).
- ✅ Phase 1B unblocked — customer-facing screen SPECs can start without pre-existing M1 doc-schema blockers.
- 🟡 RULE18-COMMENT-FALSE-POSITIVE open as low-priority TECH_DEBT (1 known occurrence, surgically worked around).

**Next:** Phase 1B SPEC authoring (`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/`).

---

## 2026-05-14 — M1A Currencies Global Hotfix (✅ SHIPPED — Full Auto Pipeline single chat)

**Goal:** Close M1A-DEBT-01 from Phase 1A FOREMAN review — convert `public.currencies` from per-tenant to GLOBAL ISO-4217 reference table so tenant-2 onboarding is no longer blocked.

**What shipped:**
- Migration applied via Supabase MCP (`m1a_currencies_global_hotfix`): DROP tenant_id + id + is_default + old constraints + old RLS policies; ADD decimal_digits INT NOT NULL DEFAULT 2; PK on `code`; 5 new RLS policies (read_anywhere + write/update/delete gated on `is_platform_super_admin()` + service_bypass); seed ILS/USD/EUR with Hebrew names.
- 25 success criteria verified: 10 DB-state criteria PASS, 11 file/commit criteria PASS, smoke 2/2 PASS (anon SELECT = 3 rows; anon INSERT denied — handled by Localhost-Tester).
- Rule 14 `GLOBAL_SINGLETON_EXEMPT` extended to include `currencies` (second category: universal reference table; first was `lens_variant_display_seq` singleton).
- D-M1-16 logged in `decisions/M1.md`.

**Decisions logged:**
- New RLS pattern (read_anywhere + write_platform_only via `is_platform_super_admin()`) — first instance project-wide; Iron Rule 15 canonical-pattern doc update deferred to a dedicated constitution-edit chat.
- Migration applied via MCP only (no `supabase/migrations/*.sql`) — Iron Rule 32 boundary; consistent with pre-existing TD-2 (git drift).
- Module's `docs/db-schema.sql` update deferred per Phase 1A precedent (5 pre-existing rule-18 violations) — finding linked to M1A-DEBT-02.
- T.CURRENCIES constant + FIELD_MAP entry deferred (no current consumer reads via `DB.fetchAll`) — finding for future cleanup.

**Status:**
- ✅ Migration live on Supabase (project tsxrrxzmdxaenlvocyit).
- ✅ `MASTER_ROADMAP.md` §3 + §5 marked resolved.
- ✅ Canonical docs aligned (`GLOBAL_SCHEMA.sql`, `DB_TABLES_REFERENCE.md`).
- ✅ Tenant-2 onboarding unblocked.
- 🟡 Awaiting Reviewer + Localhost-Tester + FOREMAN_REVIEW.

---

## 2026-05-14 — M1 Lens Inventory Phase 1A — Schema + Platform Catalog Admin (✅ SHIPPED)

**Goal:** Ship the schema half of M1's lens expansion so M7 (Orders) and M9
(Lab/KDS) can be built. Architect's recommended 2-sub-phase split:
- **Phase 1A** (this session): 17 new tables + 9 RPCs + K3 trigger + K5 view +
  Platform Catalog Admin screen + lens-catalog-import EF + 17 T-constants +
  FIELD_MAP entries + global docs merge.
- **Phase 1B** (sibling SPEC, deferred): 6 customer-facing screens. Will be
  authored after Phase 1A FOREMAN_REVIEW.

**Architecture (3 layers + governance + M9 contracts):**
GLOBAL CATALOG (platform-owned) → COMMERCIAL (tenant) → RETAILER (tenant) →
OPERATIONS (FIFO + receipts) + GOVERNANCE + M9 contracts (K2/K3/K5).

**Open question resolutions** (Brief §7):
- **Q1:** option (c) divergence — new `purchase_receipt` for lenses; legacy
  `goods_receipts` untouched. Code reuse via product_category dispatcher in 1B.
- **Q2:** UUID PK + `display_id TEXT UNIQUE` LV-NNNNNN via atomic RPC.
- **Q3:** 2 sub-phases per Architect rec.
- **Q4:** Structured xlsx Phase 1A; LLM agent Phase 2+.

**SPEC adaptations** (logged in FINDINGS.md): M1A-SPEC-01..05 + M1A-INFRA-01..03.

**Status:**
- ✅ All 17 new tables in live DB; RLS + canonical patterns verified
- ✅ 9 RPCs + K3 trigger + K5 view + EF + Platform Catalog Admin shipped
- ✅ 17 T-constants + FIELD_MAP entries; global docs merged
- ✅ ROADMAP updated (Lens-1A → ✅, Lens-1B → ⬜)
- 🟡 Awaiting FOREMAN_REVIEW

**Smoke test (demo tenant):** RLS isolation verified — cross-tenant read denied.

---

## 2026-05-06 — Goods Receipt Form: 3-fix bundle from branch manager

3-item hotfix bundle to the receipt form in `inventory.html`, addressing
items 13/14/15 from the Prizma branch manager's written list. Together
they ship the **prevention** for the 2026-05-05 receipt 8119464877
mis-pricing (4 MiuMiu rows, +3,710.64 ₪ over invoice) by surfacing a
real-time invoice-vs-system total comparison.

**What shipped:**
- **Item 13** — sort lock by default. New 🔒/🔓 toggle button next to
  the search/import controls; clicking column headers no longer scrambles
  the manager's tray order. Implementation in new file
  `modules/goods-receipts/receipt-form-validate.js` (split out of
  `receipt-form-items.js` per Amendment 1 — Iron Rule 12 file-size).
- **Item 14** — line-total per row + invoice-total compare + confirm
  gate. New `<th>סה"כ לשורה</th>` column shows `qty × cost` live; new
  header input `סה"כ חשבונית` shows ✅/❌ status with delta; clicking
  "אשר קבלה ועדכן מלאי" while invoice-total disagrees by >1 ₪ triggers
  a confirmation dialog. Empty invoice-total = no gate (back-compat).
- **Item 15** — `sort_order INT` column + idx_rcpt_items_sort on
  `goods_receipt_items` (migration 068). Items written with
  `sort_order = idx + 1` (1-based DOM order). 3 SELECT sites updated to
  read in `sort_order ASC, id ASC` order: confirmReceiptCore,
  openExistingReceipt, exportReceiptBarcodes. Legacy receipts
  (sort_order=NULL) deterministically fall back to id ASC.

**Bundle:** 3 feature commits (`c0391ef` → `02a5884` → `0d27c81`) + 1
close commit. Migration 068 applied via Supabase MCP (idempotency
verified). RLS unchanged (canonical 2-policy pair preserved).

**Mid-execution Foreman escalations (2):**
1. Iron Rule 12 contradiction caught at pre-flight: `receipt-form-items.js`
   was already 357 lines (over the 350 hard max) BEFORE any edit. Foreman
   issued Amendment 1 — split sort-lock + invoice-compare into new file
   `receipt-form-validate.js` ("one responsibility per file"). Final state:
   items=344, validate=120, all under 350.
2. Pre-commit hook fired 50 false-positive violations on commit 3 (42
   rule-15-rls on quoted policy names + 2 rule-21-orphans on local
   `const X = (...)` + 5 rule-18 + 1 file-size warning). Foreman authorized
   Option 1: rename one local const to dodge rule-21 collision + defer
   db-schema.sql doc-sync to a follow-up SPEC after the hook regex is
   fixed. 2 NEW_SPEC findings logged: HOOKS_FIX_RULE_15 (HIGH) +
   HOOKS_FIX_RULE_21 (MEDIUM).

**Out of scope (deliberate):** the 4 mis-priced rows on receipt
8119464877 — Daniel corrects manually. The data correction is NOT in
this SPEC.

**Manual UI QA owed on Demo:** §12 has 11 walk-through steps that
require browser interaction post-deployment (sort-lock click, line-total
display, invoice-compare match/mismatch, confirm gate, save+reload+
export order preservation, back-compat, console errors). Code-level
verification done; live walk-through scheduled for Daniel/QA.

SPEC folder:
`modules/Module 1 - Inventory Management/docs/specs/RECEIPT_FORM_FIXES_FROM_MANAGER/`.

## 2026-04-27 (very late night) — Permissions Phase 3: CSS Gating Fix

User-visible bug: manager (with inventory.edit) could not see +/− qty buttons
in inventory.html — JS guards (PHASE2 fix) were correct, but a legacy
`.admin-mode` body-class CSS rule still hid `.qty-btns`. Body class only
toggles when `settings.edit` is granted, which manager doesn't have.

Audit found 5 `.admin-mode`-gated CSS classes across 5 duplicate stylesheets
(employees/inventory/settings/shipments/styles.css). Mapping:
- `.qty-btns` → REMAPPED to new `.has-inventory-edit` body class.
- `.admin-col` → KEPT (dead class, no HTML uses it).
- `.admin-tab` → KEPT (settings.edit correct; double-gated via data-tab-permission).
- `.cost-col` + `.cost-field` → KEPT (cost data, settings.edit is correct).

`applyUIPermissions` in `js/auth-service.js` now toggles BOTH `admin-mode`
(settings.edit) AND `has-inventory-edit` (inventory.edit) on the body.
Admin gets both classes (no regression); manager gets only the inventory
class (qty-btns visible, cost-col still hidden).

Verified live with side-by-side screenshots:
- manager-inventory-before.png: 50 qty-btns in DOM, 0 visible (the bug)
- manager-inventory-after.png: 50 qty-btns visible (the fix)
- admin-inventory-before/after.png: 50 visible both before and after (no regression)

SPEC folder: `specs/PERMISSIONS_PHASE3_CSS_GATING_2026_04_27/`.

## 2026-04-27 (late night) — Permissions Hotfix Null Bytes

## 2026-04-27 (late night) — Permissions Hotfix (matrix render bug)

User reported the perm matrix hung on "טוען..." after PHASE2 deployment.
Investigation: SPEC blamed null-byte file truncation in `employee-list.js`,
but the file was healthy on disk + in git (0 null bytes anywhere). Real
root cause: `escapeAttr()` ReferenceError in `permission-matrix.js` —
function only defined in storefront repo, not loaded on employees.html.
Introduced by PHASE2 commit `7d37e62` when the matrix UI was extracted.

Fixed by replacing 5 `escapeAttr()` calls with `escapeHtml()` (already
global, semantically equivalent for HTML attribute escaping).

Verified live via Chrome MCP: matrix renders 55 perm rows × 5 roles =
275 checkboxes + 110 bulk buttons. Manager bulk-bug also re-verified
end-to-end (Demo manager PIN 090004 → inv-admin-bar visible →
bulk-bar visible after row select). Phase 2 fix is solid.

Iron Rule 31 strengthened by adding `npm run test:integrity-gate` —
4-case regression test for null-byte detection at EOF/mid/start/clean.
The gate already caught nulls anywhere via `buf.indexOf(0x00)` — the
test codifies that guarantee.

SPEC folder: `specs/PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27/`.

## 2026-04-27 (night) — Permissions Phase 2 Fix (HOTFIX bundle, 8 commits)

## 2026-04-27 (night) — Permissions Phase 2 Fix (HOTFIX bundle, 8 commits)

Bundled fix for the user-visible "manager doesn't get bulk inventory ops"
bug + 6 related permissions cleanups identified by PERMISSIONS_AUDIT_PHASE1.

**Primary fix:** decoupled the stateful `isAdmin` global from `settings.edit`.
~10 inventory bulk-edit guards now use `hasPermission('inventory.edit')` (or
`.delete`) directly. Manager role on Demo + Prizma can now bulk-edit
inventory despite not having `settings.edit`. CSS coupling on `.admin-mode`
body class preserved by moving the toggle to `applyUIPermissions` in
`js/auth-service.js`.

**Cleanups:**
- 3 unused test-store tenants deleted (test-store-qa/v2/verify) +
  cascade — 728 rows across 13 tables. Surviving tenants: prizma + demo.
- 14 long-form permission keys renamed to canonical short form on Prizma+Demo
  (`purchase_order.* → purchasing.*`, `goods_receipt.* → receipts.*`,
   `debt.documents.{create,edit,cancel} → debt.{create,edit,cancel}`,
   `debt.payments.{create,cancel} → debt.payment_{create,cancel}`,
   `debt.prepaid.manage → debt.prepaid`).
  28 perms rows + 80 role_permissions rows renamed atomically via CTE.
- HARMFUL bypass in `modules/debt/ai/ai-config.js` replaced with
  `hasPermission('ai.config')` (was: direct `role === 'ceo' || 'manager'`).
- `ROLE_BADGES` + `ROLE_HIERARCHY` now loaded from DB per tenant at
  `loadEmployeesTab()` time. New `loadRolesFromDB()` function.
- "הכל" / "כלום" buttons added to every permission row in matrix —
  single batch UPSERT per click. Extracted matrix UI to
  `modules/permissions/permission-matrix.js` (file-size compliance).
- Stale `shared/tests/permission-test.html` deleted (referenced 3 dead keys).

**DB delta:** 281 → 110 perms rows; 833 → 371 role_permissions rows;
89 → 55 distinct perm ids; 5 → 2 tenants; 25 → 10 roles.

**Tech-debt logged for future SPECs:**
- Super-admin sub-role employees model — defer to dedicated SPEC.
  Daniel wants `is_super_admin` to remain separate from per-tenant roles
  but eventually wants employees with cross-tenant access at lower
  privilege than full super-admin.
- `LEGACY_ROLE_MAP` admin→ceo bridge in `js/auth-service.js:21` — kept;
  remove when all employees are migrated to `employee_roles` rows.
- Refactor `.admin-mode` CSS rules to use `[data-perm-settings-edit]`
  attribute selector (Proposal 11 from PERMISSIONS_AUDIT_PHASE1).

SPEC folder: `specs/PERMISSIONS_PHASE2_FIX_2026_04_27/`.

## 2026-04-27 (late evening) — Permissions Audit Phase 1 (READ-ONLY DIAGNOSTIC)

## 2026-04-27 (late evening) — Permissions Audit Phase 1 (READ-ONLY DIAGNOSTIC)

Read-only diagnostic of the permissions system. Zero DB writes, zero code
changes. Deliverable: 611-line DIAGNOSIS_REPORT.md (10 sections §A–§J)
identifying that the "281 permissions" figure is misleading (89 distinct
ids ✕ ~5 tenants), and that Daniel's user-visible bug ("manager doesn't
see what admin sees") is caused by a stateful `isAdmin` global in
`js/shared.js:124` that gates ~10 inventory bulk-edit functions on
`settings.edit` instead of `inventory.edit`. Manager has all 54 inventory
keys but lacks `settings.edit` → `isAdmin=false` → bulk ops denied.
13 numbered consolidation proposals + Phase 2 SPEC outline (recommended
minimum: decouple `isAdmin` from `settings.edit`, ~10 lines / 60 min).
SPEC folder: `specs/PERMISSIONS_AUDIT_PHASE1_2026_04_27/`.

## 2026-04-27 (evening) — Studio Brands Visibility Rework (HOTFIX)

Brand editor in Studio reworked: 3 overlapping controls (`display_mode`,
`exclude_website`, `brand_page_visibility`) replaced by ONE radio-group with
4 explicit modes (full / hide-card / hide-customer-keep-seo / hide-all).
Added bulk-mode action (`bulkApplyBrandModeToProducts`) — confirmation-gated
update of `inventory.website_sync` for every product of a brand. Added
visible CSS spinner during AI content generation. Removed dead "🏷️ מותגים"
nav link from Studio top-nav. Restored Alexander McQueen visibility
(`exclude_website=true → false`, `brand_page_enabled=false → true`) — 9
inventory rows untouched. SPEC folder:
`specs/STUDIO_BRANDS_VISIBILITY_REWORK_2026_04_27/`.

## 2026-04-27 — Storefront Sync Hierarchy Fix (HOTFIX)

`v_storefront_products` and `v_storefront_brands` rewritten to drive storefront
visibility from `inventory.website_sync` (per-product) instead of
`brands.display_mode` (brand-level seed). Implements Daniel's 4-level hierarchy:
display_mode_override > brand_page_visibility > website_sync > [no fallback].
Fixed 313 mis-classified `display` products (now correctly 'catalog') and
restored supersale-stock section 2 (was 0 brands, now 11). Storefront repo
untouched; price-guard d1f67c4 intact. SPEC folder:
`specs/STOREFRONT_SYNC_HIERARCHY_FIX_2026_04_27/`.

## Last Updated (previous)
Inventory Fixes + Subrow Feature — 2026-04-19

## What Was Done This Session

### Inventory Module Fixes + UX Improvements (8 commits)

**Stock Count Fixes (3 commits: 9b44831, 7781de7):**
- Case-insensitive barcode matching in stock count scan (stock-count-scan.js)
- Brand selection required before creating a stock count (stock-count-filters.js)
- Excel export refactored: diffs-only option + sort picker (stock-count-export.js — new file, extracted from stock-count-report.js for file-size compliance)

**Inventory Entry Improvements (1 commit: 9b44831):**
- Field reorder: color before size, temple_length to first card-row
- Auto-calculated final price field (readonly, from sell_price × discount)
- Auto-fill from previous row for faster entry

**Inventory Export Fix (1 commit: 9b44831):**
- Final price column added to barcode Excel export

**History Column Removal (2 commits: 9b43976, 6c11d3c):**
- Removed duplicate history column from main table (already in ⋯ menu)
- Extracted action menu + event delegation to inventory-actions.js (file-size compliance)

**Shared Table Resize Fix (2 commits: 3ee7a56, dfd36c9):**
- TableResize: explicit width calculation overrides CSS width:100% for all tables
- Hidden tab guard: skip recalc when offsetWidth=0, ResizeObserver triggers recalc on tab switch

**Subrow Feature (1 commit: 8399d46):**
- Bridge + temple_length moved from main table columns to hidden subrow
- "עוד" button in ⋯ menu toggles subrow (toggle open/close)
- Inline editing for bridge + temple_length in subrow (admin only)
- New file: inventory-actions.js (action menu, event delegation, subrow toggle + edit)

### All Commits (Inventory Fixes + Subrow)
- 9b44831 fix(inventory): items 5-9 from handoff list
- 7781de7 refactor(stock-count): extract Excel export to stock-count-export.js
- 9b43976 fix(inventory): remove duplicate history column
- 6c11d3c refactor(inventory): extract action menu to inventory-actions.js
- 6d5afe3 fix(shared): table scroll — allow tables to grow beyond viewport
- 3ee7a56 fix(shared): table resize — explicit width override for all tables
- dfd36c9 fix(shared): table resize — skip hidden tabs, ResizeObserver recalc
- 8399d46 feat(inventory): add subrow for bridge + temple_length

---

## Previous Session

### AI OCR Fix + Learning System + QA (27 commits)

**OCR Bug Fixes (3 commits: d23b822, a57438f, 4a587e6):**
- BUG-1: _norm() moved from IIFE to global scope (receipt-ocr-supplier.js)
- BUG-3: OCR button stays visible when PO linked (receipt-ocr.js)
- BUG-4: Highlight matching rewritten — UUID-based via data-po-item-id
- BUG-5: Brand parsing fixed — model before size, prefix aliases, multi-word brands

**AI Learning System (4 commits: 862aaba, 8efe8eb, fb12dc3, 4985643):**
- Migration 060: learning_stage, fields_suggested, fields_accepted on supplier_ocr_templates
- Migration 060: suggest_after_invoices, auto_after_invoices, auto_min_accuracy on ai_agent_config
- 3-stage flow: learning (header only) → suggesting (review modal) → auto (direct fill)
- AI learning dashboard tab in suppliers-debt with summary cards + per-supplier table
- Settings page: AI learning thresholds (3 configurable fields)
- File splits: receipt-ocr.js → receipt-ocr-learn.js, goods-receipt.js → receipt-list.js

**PO Comparison Fixes (3 commits: d37ce34, 28041a3, 50da6ce):**
- PO comparison runs in all learning stages (not just suggesting/auto)
- Compare button: unwrap {value} items, guard empty, fallback PO ID
- compareItems rewritten: parse descriptions, match by content (model+brand+price), not position

**Confirm & Learn (1 commit: 4ee4bf0):**
- "🤖 אשר ולמד את ה-AI" button — learns item mappings from confirmed receipt
- Smart matching: model → price+qty → price-only → substring fallback
- Aliases saved to extraction_hints.item_aliases per supplier

**Shared Tables (2 commits: 5b9deb5, 5f8da3a):**
- table-resize.js rewritten: auto-discovery, per-user localStorage persistence, MutationObserver for dynamic tables
- Loaded on all 4 data pages, 15 tables auto-initialized

**Multi-Document OCR (2 commits: de4c975, e540d17):**
- Edge Function accepts file_urls array, sends all to Claude Vision in single call
- receipt-ocr.js uploads all _pendingReceiptFiles
- max_tokens 8192 for multi-file, better error diagnostics

**UI/UX Improvements (3 commits: b1eb79c, f674d2e, a9f478f):**
- Brand autocomplete (createSearchSelect) on manual receipt rows
- Multi-doc number layout fixed (no overlap)
- Brand management: scroll to new row, cancel button for unsaved

**Brand Management (2 commits: 40fdc3e, b791db7):**
- Save only dirty rows (not all 232)
- Delete brand with inventory check (qty=0 only)
- Reactivate inactive brands
- Permanent delete with double PIN
- Duplicate detection (including inactive)
- Migration 061: UNIQUE(name, tenant_id) replaces UNIQUE(name)

**Receipt-to-Debt Flow (3 commits: 41b61ca, bec5bfc, 3b4fb87):**
- Doc type mapping: tax_invoice → invoice (was silently failing)
- Receipt list shows "+N" badge for multi-doc numbers
- Receipt view shows files from linked supplier document
- Receipt view shows all document numbers

**Debt Module — Balance & Simplification (5 commits: 9f1cbf7, c8f40ad, 71fe059, 2eb537f, d1e0936):**
- "חוב כולל" → "יתרה סופית" everywhere
- Formula: paid + deals - invoiced + adjustments (fixed double-counting)
- Positive = green (credit), Negative = red (debt)
- Manual balance adjustments with PIN + timeline
- Migration 062: supplier_balance_adjustments table
- Prepaid deals tab simplified: removed checks, clean progress view

### All Commits (AI OCR Fix + QA)
- d23b822 Fix BUG-1: _norm scope + BUG-3: OCR button visibility
- a57438f Fix BUG-5: brand parsing
- 4a587e6 Fix BUG-4: highlight matching UUID-based
- 862aaba Phase 5b: migration 060 + AI learning thresholds in settings
- 8efe8eb Phase 5c: stage-aware OCR flow
- fb12dc3 Phase 5d: AI learning dashboard tab
- 4985643 Phase 5e: split oversized files + regression
- d37ce34 Fix: PO comparison in all learning stages
- 28041a3 Fix: comparison button guards
- 50da6ce Fix: compareItems parse + match by content
- 4ee4bf0 Add: confirm-and-learn button
- 5b9deb5 Upgrade shared tables
- 5f8da3a Dynamic tables MutationObserver
- de4c975 Multi-document OCR
- b1eb79c Brand autocomplete in receipts
- e540d17 Multi-file diagnostics
- f674d2e Layout multi-doc numbers
- a9f478f Brands scroll + cancel
- 40fdc3e Brands dirty save + delete
- b791db7 Brands duplicate + reactivate + permanent delete
- 41b61ca Fix doc type mapping
- bec5bfc Receipt list multi-doc badge
- 3b4fb87 Receipt view files + doc numbers
- 9f1cbf7 יתרה סופית + deals in balance
- c8f40ad Balance adjustments
- 71fe059 Simplify prepaid deals
- 2eb537f + d1e0936 Fix balance double-counting

## Current State
- **9 HTML pages**: index, inventory, suppliers-debt, employees, shipments, settings, admin, error, landing
- **~155 JS files** across 15 module folders + 11 global + 11 shared
- **3 Edge Functions**: pin-auth, ocr-extract (v4, multi-file), remove-background
- **50+ DB tables** + 14 RPC functions
- **62 migration files**: 060-062 added this phase
- **4 new files this phase**: receipt-ocr-learn.js, receipt-list.js, receipt-ocr-confirm-learn.js, ai-learning-dashboard.js
- **Zero console errors** on all 6 pages
- **39/39 QA tests passed**

## Open Issues

### LOW / DEFERRED
- debt-dashboard.js at 424 lines — candidate for split
- receipt-ocr-review.js at 401 lines — borderline
- 219 console statements across codebase — cleanup pass needed
- 6 non-tenant UNIQUE constraints remain (1 fixed: brands)
- Edge Function deployment requires --no-verify-jwt flag

## Next Steps
1. **Module 3 — Storefront** planning
2. **Or** additional Module 1 improvements based on production feedback
