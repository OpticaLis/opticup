# SPEC — DEMO_PARITY_REPLICATION

> **Location:** `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Full-Auto Pipeline mode)
> **Authored on:** 2026-05-11
> **Module:** 4 — CRM (cross-module impact on all tenant-scoped config tables)
> **Brief:** `modules/Module 4 - CRM/architecture-brief/DEMO_PARITY_REPLICATION_BRIEF.md` (v1, 2026-05-11)
> **Mode:** Continuous-Run Mandate with ONE planned escalation point (Ambiguous-table classification)

> **Heading convention:** Plain integer numbers only (`## N.`). Never decimal (`## 6.5.`), never `§N.` — the Iron-Rule-32 pre-commit hook (`scripts/checks/destructive-ops-declared.mjs`) rejects both.

---

## 0. Pre-Authoring Reality Check

- Brief read in full 2026-05-11 (activation prompt mirrors Brief structure plus the Continuous-Run Mandate).
- Tenant UUIDs verified against live DB on 2026-05-11:
  - Prizma: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` (slug `prizma`, name `אופטיקה פריזמה`)
  - Demo:   `8d8cfa7e-ef58-49af-9702-a862d459cccb` (slug `demo`, name `אופטיקה דמו (בדיקה)`)
- Tenant-scoped table inventory pulled 2026-05-11 — see Baselines below.
- Lessons applied from prior FOREMAN_REVIEWs:
  - `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FOREMAN_REVIEW.md` Author Proposal #1 → integer-only headings (this SPEC complies; §7 named `## 7. Destructive Operations`).
  - `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FOREMAN_REVIEW.md` Author Proposal #2 → built-in mid-pipeline escalation pattern is the spine of this SPEC (Phase 1 Ambiguous-table classification triggers a single planned pause).
  - `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 → heading convention reinforced.
  - `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 → Baselines pinned as symbols in §0.
  - `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` (predecessor in this session) → `tenants` has no `updated_at` trigger (TECH_DEBT noted); proof of "demo identity untouched" relies on bit-identical `ui_config` payload rather than `updated_at` for the `tenants` row itself.

### Baselines (captured 2026-05-11 — referenced symbolically in §3)

| Symbol | Source | Value |
|---|---|---|
| `BASE_TENANT_ID_COLUMNS_ALL` | `SELECT count(*) FROM information_schema.columns WHERE column_name='tenant_id' AND table_schema='public'` | 132 (includes views) |
| `BASE_TENANT_ID_BASE_TABLES` | Same, filtered to `table_type='BASE TABLE'` via `information_schema.tables` join | TBD by Executor in Phase 1 (must derive empirically; not pinned here since views must be excluded by the discovery query itself) |
| `BASE_PRIZMA_UPDATED_AT` | `SELECT updated_at FROM tenants WHERE id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` | Captured in pre-snapshot |
| `BASE_DEMO_UPDATED_AT` | `SELECT updated_at FROM tenants WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` | Captured in pre-snapshot |

---

## 1. Goal

Replicate Prizma's behavioral configuration (rules / templates / lookups / automation / configurable tables) to the demo tenant so that demo's behavior is 1:1 with Prizma. Identity (name, address, logo, channels, allowlists, storefront_url) and runtime content (leads, events, customers, orders, inventory, CMS pages) stay untouched. Prizma stays read-only throughout.

---

## 2. Background & Motivation

Prizma cutover completed 2026-05-03. Multiple behavioral bug fixes shipped post-cutover (event-open bug, deletion flows, suppression gates, hardcoded-Prizma removal, etc.). Demo never received those fixes — its config tables drifted from Prizma's by an unknown amount.

Daniel hit one specific symptom on 2026-05-11 (event-open auto-attaches old registrants to a waiting list on demo). Patching one bug at a time is the wrong fix-path; the right fix is to bring demo's behavioral config to parity with Prizma in one shot so all latent drift bugs disappear together.

Predecessor in this session: `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT` (2026-05-11) provisioned demo's live storefront. Demo is now functionally ready for a full test cycle the moment its behavioral config matches Prizma. This SPEC is the gate.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. Any criterion not met → SPEC is REOPEN, not CLOSED.

| # | Criterion | Expected value | Verify method |
|---|-----------|----------------|---------------|
| 1 | Branch state at close | On `develop`, clean tree, pushed to `origin/develop` | `git status` → "nothing to commit"; `git log origin/develop..HEAD` empty |
| 2 | SPEC folder contains required artifacts | 5 files: `SPEC.md`, `REPLICATION_PLAN.md`, `TEST_REPORT.md`, `EXECUTION_REPORT.md`, `FINDINGS.md` (+ `FOREMAN_REVIEW.md` after this Pipeline closes) | `ls modules/Module\ 4\ -\ CRM/docs/specs/DEMO_PARITY_REPLICATION/` |
| 3 | REPLICATION_PLAN.md classification coverage | Every base table with `tenant_id` listed and classified into exactly one of {Behavioral, Identity, Content, Out-of-scope-content}. Zero rows marked Ambiguous at end of Phase 1 (either resolved in-line by Architect Decision, or moved to a final non-Ambiguous bucket). | grep `REPLICATION_PLAN.md` for `Ambiguous` → 0 matches outside the "Resolution" column |
| 4 | TEST_REPORT.md pre-snapshot | Pre-snapshot row counts + content hashes captured for every Behavioral table (both Prizma + demo) before any write | Section "Pre-Snapshot" present with one row per Behavioral table |
| 5 | Per-table replication INSERT/UPDATE counts logged | One transaction commit log per Behavioral table with `INSERTed N1 / UPDATEd N2 / left N3 demo-orphan` line | grep TEST_REPORT.md "Replication Log" → one entry per Behavioral table |
| 6 | Demo's behavioral row count post-replication ≥ Prizma's | For every Behavioral table: `count(demo) >= count(prizma)` | Post-snapshot SQL re-run per table |
| 7 | Demo's behavioral content hash for matched business-key rows = Prizma's | For each Behavioral table, the hash over (all columns minus id, tenant_id, created_at, updated_at) computed on rows whose business key exists in BOTH tenants — must be IDENTICAL after replication | Post-snapshot hash comparison per table |
| 8 | Prizma row count for every Behavioral table = pre-snapshot value | Identical pre and post for every Behavioral table | Post-snapshot SQL re-run |
| 9 | Prizma content hash for every Behavioral table = pre-snapshot value | Identical pre and post | Post-snapshot SQL re-run |
| 10 | Demo `tenants` row content unchanged | Bit-identical `ui_config`, `name`, `slug`, `custom_domain`, `business_phone`, `business_address`, `logo_url`, `primary_color`, etc. between pre and post snapshots | `SELECT row_to_json(t) FROM tenants t WHERE id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` pre/post diff = empty |
| 11 | Demo Identity tables content unchanged | `tenant_employees` / `employees`, `whatsapp_phone_numbers` (if present), `sms_sender_ids` (if present), `tenant_branches`, any other Identity-classified table — row counts + content hash identical pre/post | Per-Identity-table snapshot in TEST_REPORT.md |
| 12 | Zero DELETE statements in commit range | `git diff origin/develop..HEAD -- '*.sql' '*.md'` plus the executor's own audit log shows zero `DELETE FROM` strings outside of code-block examples (per Iron Rule 32 envelope) | grep audit |
| 13 | Zero schema changes | `information_schema.columns` snapshot pre/post equal | SQL diff |
| 14 | Integrity Gate (Iron Rule 31) | exit 0 or exit 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` |
| 15 | Smoke suite | 7/7 PASS | `npm run smoke` |
| 16 | MASTER_ROADMAP §4 Decisions Log updated | One new row dated 2026-05-11 summarizing replication outcome (tables replicated + row counts) | grep `MASTER_ROADMAP.md` for `2026-05-11.*Demo Parity` |
| 17 | OPEN_TASKS.md updated | Active task #1 line edited to reflect demo-test-cycle unblocking once Daniel verifies | grep OPEN_TASKS for "Demo Parity Replication" |
| 18 | M4 SESSION_CONTEXT.md top-of-file `Today` line added | One new Today line summarizing this SPEC's close | head -10 of SESSION_CONTEXT.md |
| 19 | Commit count | Range `[1, 5]` commits on develop attributable to this SPEC; closure commit message prefix `chore(spec): close DEMO_PARITY_REPLICATION` | `git log origin/develop..HEAD --oneline` |
| 20 | NO merge to `main` | `git log main..HEAD` should be empty from a `main` checkout perspective at session end | (verified by absence of `git checkout main`) |

**Integrity Gate criterion (Iron Rule 31)** is criterion 14 — non-negotiable.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Run read-only SQL (Level 1 autonomy) — unlimited.
- Run write SQL **scoped to the demo tenant_id only** on tables classified Behavioral in REPLICATION_PLAN.md (Level 2 — pre-authorized by this SPEC for the Behavioral set only).
- Write artifact files in the SPEC folder (`REPLICATION_PLAN.md`, `TEST_REPORT.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`).
- Commit and push to `develop`.
- Update `MASTER_ROADMAP.md` §4, `OPEN_TASKS.md`, and the M4 `SESSION_CONTEXT.md` top-of-file line.
- Run `npm run verify:integrity`, `npm run smoke`, schema-diff.

### What REQUIRES stopping and reporting
- ANY table classification that cannot be confidently placed in {Behavioral, Identity, Content} after diagnostic — STOP, write escalation file to Architect with proposed classification (single planned escalation point — see §14).
- ANY proposed write touching `tenant_id != '8d8cfa7e-ef58-49af-9702-a862d459cccb'`.
- ANY DELETE statement, period.
- ANY schema change (DDL).
- ANY UPDATE on `tenants` table (either tenant's row).
- ANY UPDATE on a table classified Identity or Content.
- ANY discovery that a Prizma row's `updated_at` (or content hash for tables without `updated_at`) differs between pre- and post-snapshot — immediate STOP + rollback + escalate (catastrophic regression signal).
- Outbound message sending of any kind.
- Code changes (this SPEC is data-only).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. If Phase 1 diagnostic surfaces a table whose `tenant_id`-bearing semantics conflict with its name (e.g., a "rules" table that turns out to hold actual customer data) → STOP and reclassify before Phase 3.
2. If Phase 2 pre-snapshot SQL hits an error (permissions, table-not-found, column-not-found) → STOP, do NOT improvise around the missing table; report and ask.
3. If during Phase 3, a single-table INSERT/UPDATE transaction fails partway → ROLLBACK that table's transaction, document in TEST_REPORT.md, STOP before proceeding to the next table.
4. If during Phase 4, Prizma row count or content hash diverges from pre-snapshot for ANY table → STOP IMMEDIATELY, run rollback per §6, escalate. This is the canary for accidental Prizma writes.
5. If integrity gate (`npm run verify:integrity`) returns exit 1 at any point → STOP, investigate null-byte corruption before any further write.
6. If `npm run smoke` returns < 7/7 at session close → STOP, do NOT mark this SPEC closed; report.
7. If the table inventory query returns zero rows for Prizma in a "Behavioral" table while returning rows for demo (i.e., demo somehow has more than Prizma in a config table) → flag in FINDINGS but proceed. This is the "demo-orphan" case — explicitly OK per §10 (no DELETE).

---

## 6. Rollback Plan

This SPEC operates table-by-table. Rollback is also table-by-table.

**Per-table rollback (during Phase 3):**
- Each Behavioral table's INSERT/UPDATE runs inside a single transaction (`BEGIN; ... COMMIT;`). If a step inside that transaction fails → `ROLLBACK;` restores demo to pre-transaction state for that table.

**Full rollback (catastrophic — e.g., Prizma-regression canary fires):**
- All writes were scoped to `tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo) by SPEC contract. Prizma rows were never written; pre-snapshot proves this.
- To restore demo to pre-replication state: for each Behavioral table that was already replicated before the STOP, reconstruct demo's rows from the pre-snapshot in TEST_REPORT.md. The pre-snapshot includes either (a) full row JSON, or (b) row count + content hash sufficient to detect drift. If only (b) is captured, **the pre-snapshot is insufficient for surgical rollback** and the Executor must STOP and escalate before mass-writing.
- **Authoring obligation:** the pre-snapshot Phase 2 MUST capture full-row JSON for every Behavioral table whose row count is < 200 (small lookups), and row-count + content-hash + key-set for tables with ≥ 200 rows. The threshold is set so that rollback by full-row restore is cheap for the typical case, while audit-only is acceptable for the rare bulk case (where a manual SQL replay against TEST_REPORT.md's appendix is the recovery path).

**Git rollback:** `git reset --hard <START_COMMIT>` is forbidden by Iron Rule 32 envelope without explicit Architect authorization. Any reset must be requested via escalation.

---

## 7. Destructive Operations

Declared:

1. **INSERT** statements on Behavioral tables only, with `tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo) explicitly set in every row. Estimated row count: TBD by Phase 1 — total across all Behavioral tables, bounded by sum of Prizma's row counts on those tables.
2. **UPDATE** statements on Behavioral tables only, with `WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo). Estimated row count: TBD by Phase 2 (only rows whose business-key match Prizma but whose other columns differ).
3. Standard documentation file overwrites (`MASTER_ROADMAP.md`, `OPEN_TASKS.md`, `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`, and the 4 SPEC-folder artifacts).

Explicitly forbidden by this SPEC's envelope (anything outside is a STOP-and-escalate trigger):
- DELETE on any table (including demo)
- UPDATE on any row where `tenant_id != '8d8cfa7e-ef58-49af-9702-a862d459cccb'`
- UPDATE on `tenants` (either tenant's row)
- UPDATE on any table classified Identity or Content
- Schema changes (`ALTER`, `CREATE`, `DROP`)
- `git rebase`, `git reset --hard`, `git push --force`
- Merge to `main`
- TRUNCATE
- `DELETE FROM <table>` without a tenant_id-scoped WHERE
- Code changes (no `.ts` / `.js` / `.html` edits)
- Outbound message of any kind (no SMS, no email, no webhook to Make)

---

## 8. Out of Scope (explicit)

- **Content tables** — `crm_leads`, `crm_events`, `crm_event_attendees`, `crm_lead_notes`, `crm_lead_tags`, `crm_ad_spend`, `crm_audit_log`, `crm_automation_runs`, `crm_broadcasts`, `crm_message_log`, `crm_message_queue`, `crm_unsubscribes`, `customers`, `prescriptions`, `sales`, `work_orders`, `pending_sales`, `inventory`, `inventory_logs`, `inventory_images`, `goods_receipts`, `goods_receipt_items`, `purchase_orders`, `purchase_order_items`, `supplier_*`, `prepaid_*`, `stock_count*`, `payment_allocations`, `expense_folders`, `shipments`, `shipment_items`, `cms_leads`, `storefront_leads`, `storefront_reviews`, `storefront_pages`, `blog_posts`, `ai_content*`, `content_translations`, `content_versions`, `content_performance`, `media_library`, `messages`, `conversations`, `conversation_participants`, `message_reactions`, `activity_log`, `auth_sessions`, `notification_preferences`, `crm_audit_log`, `crm_event_status_history`, `seo_targets`, `weekly_reports`, `knowledge_base`, `watcher_heartbeat`, `sync_log`, `tenant_provisioning_log`, `translation_corrections`, `translation_glossary`, `translation_memory`, `tenant_i18n_overrides`, `ai_agent_config`, `ai_content_corrections`, `brand_content_log`. These are runtime/customer/historical data — never replicated config. (Final classification is per REPLICATION_PLAN.md.)
- **Identity tables** — `tenants` (the row itself), `tenant_employees` (if exists; observed via `employees` table), `employees`, `tenant_branches`, `tenant_config` (if it holds tenant-unique identity per its name; verify in Phase 1), `whatsapp_phone_numbers` / `sms_sender_ids` (if exist as tables — observed brief mentions but not in inventory; verify), `roles` / `role_permissions` / `permissions` / `employee_roles` (if tenant-scoped; verify in Phase 1 — these may be Behavioral if they hold permission *definitions* shared across tenants, or Identity if they hold per-tenant role *assignments*).
- **Schema changes** — out, full stop.
- **Code changes** — out, full stop.
- **Storefront / CMS / blog content** — out (separate concern, may be filed as a follow-up SPEC by Daniel).
- **Prizma's row modifications** — out (read-only throughout).

---

## 9. Expected Final State

### Files written / modified inside SPEC folder

- `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION/SPEC.md` — this file (authored Phase 0).
- `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION/REPLICATION_PLAN.md` — written in Phase 1. Contains the full table classification + per-table business key + per-table replication strategy.
- `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION/TEST_REPORT.md` — written across Phases 2-4. Contains pre-snapshot, replication log, post-snapshot, and Prizma-integrity verification.
- `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION/EXECUTION_REPORT.md` — written in Phase 5 by Executor.
- `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION/FINDINGS.md` — written in Phase 5 by Executor (one of: real findings list, or `_No findings._` if clean).
- `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION/FOREMAN_REVIEW.md` — written by Foreman after Executor close.

### Docs updated outside SPEC folder

- `MASTER_ROADMAP.md` §4 Decisions Log — one new row dated 2026-05-11.
- `OPEN_TASKS.md` Active task #1 line — note that demo's behavioral config now matches Prizma; demo test cycle unblocked.
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — top-of-file `Today` line added.
- **NO** updates to `docs/GLOBAL_MAP.md` or `docs/GLOBAL_SCHEMA.sql` (no functions, no schema additions).
- **NO** updates to `MODULE_MAP.md` / `CHANGELOG.md` / `MODULE_SPEC.md` (no code, no shipped feature).

### DB state at close

- Demo Behavioral tables: row count ≥ Prizma's per table; content hash for matched business-key rows = Prizma's per table.
- Demo Identity tables: bit-identical to pre-snapshot.
- Demo Content tables: untouched.
- Prizma everything: bit-identical to pre-snapshot (read-only proof via post-snapshot re-hash).

---

## 10. Commit Plan

Commits authored on `develop`. Selective `git add` by filename only — never `git add -A`/`git add .` (per CLAUDE.md §9 Rule 6; reinforced by `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT` lesson on untracked files in this session).

Suggested grouping (Executor may rearrange if a natural seam differs, must report rearrangement in EXECUTION_REPORT §3):

- **Commit 1** — `docs(spec): author DEMO_PARITY_REPLICATION SPEC + REPLICATION_PLAN scaffold` — adds `SPEC.md` and an initial scaffold of `REPLICATION_PLAN.md` (classification empty, schema present). Optional — Executor may fold into commit 2.
- **Commit 2** — `docs(spec): DEMO_PARITY_REPLICATION Phase 1 classification + Phase 2 pre-snapshot` — finalized `REPLICATION_PLAN.md` + Pre-Snapshot section of `TEST_REPORT.md`.
- **Commit 3** — `chore(db): DEMO_PARITY_REPLICATION Phase 3 — replicate behavioral tables to demo tenant` — appends Replication Log section to TEST_REPORT.md. **No code files modified.** This commit's diff is documentation only; the DB writes themselves don't show in git.
- **Commit 4** — `docs(spec): DEMO_PARITY_REPLICATION Phase 4 post-snapshot + Prizma integrity proof` — appends Post-Snapshot + Prizma-Integrity sections to TEST_REPORT.md.
- **Commit 5** — `chore(spec): close DEMO_PARITY_REPLICATION 🟢 + roadmap update` — adds `EXECUTION_REPORT.md` + `FINDINGS.md`, updates MASTER_ROADMAP / OPEN_TASKS / SESSION_CONTEXT.

Path-Defer outcome (if Phase 1 escalation results in Architect deciding to defer/cancel some or all tables): closure commit message becomes `chore(spec): close DEMO_PARITY_REPLICATION 🟡 deferred (Path D: partial replication per Architect decision)` and EXECUTION_REPORT criterion-2 dispositions for unreplicated tables = `⏸ DEFERRED`, not ❌ FAILED.

If the entire SPEC is escalated and cancelled before any write: closure commit = `chore(spec): close DEMO_PARITY_REPLICATION 🟡 deferred (Path E: escalation result — no replication executed)` with a stub follow-up SPEC obligation noted.

---

## 11. Dependencies / Preconditions

- Demo tenant exists with UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb` (verified live 2026-05-11).
- Prizma tenant exists with UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` (verified live 2026-05-11).
- Supabase MCP tool available (`mcp__claude_ai_Supabase__execute_sql`).
- `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT` 🟡 CLOSED 2026-05-11 (demo storefront live). Not strictly a precondition for THIS SPEC's writes, but the project state assumption is that demo is end-to-end testable once parity lands.
- Pre-commit hooks active: `destructive-ops-declared.mjs`, `verify:integrity`, file-size.

---

## 12. Lessons Already Incorporated

- FROM `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FOREMAN_REVIEW.md` Author Proposal #1 → integer-only headings → APPLIED (no decimal sections; §7 = `## 7. Destructive Operations`).
- FROM `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FOREMAN_REVIEW.md` Author Proposal #2 → built-in mid-pipeline escalation pre-templated → APPLIED in §14 (Hebrew line template + resume regex spelled out).
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 → SPEC heading convention → APPLIED.
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 → Baselines pinned symbolically in §0 → APPLIED (where measurable at SPEC-author time; classifying counts are explicitly DEFERRED to Phase 1 since views must be excluded by the discovery query itself).
- FROM `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` → `tenants` has no `updated_at` trigger; rely on bit-identical `ui_config` JSON for identity proof, not `updated_at` → APPLIED in §3 criterion 10 + §11 of Identity tables.
- FROM `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` → Full-Auto Pipeline must respect untracked files in `git status` belonging to other workstreams → APPLIED in §10 (selective `git add` by filename only).
- FROM general Iron Rule 21 (No Orphans, No Duplicates) → cross-reference check 2026-05-11: SPEC slug `DEMO_PARITY_REPLICATION` does not collide with any existing SPEC folder under `modules/Module 4 - CRM/docs/specs/` (verified `ls` 2026-05-11 — 0 collisions). New artifact filenames (`REPLICATION_PLAN.md`, `TEST_REPORT.md`) match the project convention for SPEC-internal artifacts. No new functions / tables / columns / globals created (data-only SPEC). 0 collisions / 0 hits.

---

## 13. Phases (Executor-facing playbook)

This SPEC drives the entire Pipeline run. The Executor executes these phases in order; Foreman is alive in the same chat for the planned Phase 1 escalation point and for the Phase 5 review.

### Phase 1 — Discovery + Classification

1. Query `information_schema.columns` joined with `information_schema.tables` (filtered to `table_type='BASE TABLE'`) for all tables in schema `public` with column `tenant_id`. Persist the list to `REPLICATION_PLAN.md` §1 "Inventory".
2. For each table, classify into exactly one of:
   - **Behavioral** — rules, templates, lookups, automation, configurable enumerations (per Iron Rule 19). Examples expected: `crm_automation_rules`, `crm_message_templates`, `crm_statuses`, `crm_tags`, `crm_custom_field_defs`, `crm_field_visibility`, `crm_monday_column_map`, `crm_unit_economics` (if rules-table not data-table — verify), `automation` / `rules` / `*_types` / `*_categories` tables, `payment_methods` (if config of supported methods per tenant), `document_types`, `courier_companies`, `currencies`, `permissions`, `roles`, `role_permissions`.
   - **Identity** — tenant-unique branding/staff/channels. Examples expected: `tenants` itself (row), `employees`, `employee_roles` (if per-employee), `tenant_branches`, `tenant_config` (verify — name suggests Identity), `notification_preferences`.
   - **Content** — runtime customer/lead/order/inventory/CMS data. All `crm_*` data tables, `customers`, `inventory*`, `suppliers*`, `goods_receipt*`, `purchase_order*`, `cms_leads`, `storefront_*`, `pages` / `blog_posts`, `media_library`, etc.
   - **Ambiguous** → triggers Phase 1.5 escalation.
3. For each Behavioral table, identify the **business key** — the column or column-tuple (excluding `id` and `tenant_id`) that uniquely identifies "this row across tenants". Examples: `crm_message_templates.template_code`, `crm_statuses.code`, `crm_automation_rules.rule_name`, `crm_tags.name`, `permissions.permission_code`. If no obvious business key exists → that table is Ambiguous.
4. Cross-check the classification against Iron Rule 19 (configurable values = tables): tables that hold *configurations* are Behavioral; tables that hold *records of events that happened* are Content; tables that hold *Daniel's tenant brand identity* are Identity.
5. Save the full classification to `REPLICATION_PLAN.md`.

### Phase 1.5 — Mid-Pipeline Escalation (only if Ambiguous tables exist)

- IF and only if at least one table is classified Ambiguous at the end of Phase 1, the Executor writes `modules/Module 4 - CRM/escalations/{ISO_TS}_DEMO_PARITY_AMBIGUOUS.md` containing:
  - List of ambiguous tables
  - Per-table: row-count comparison Prizma vs demo, column listing, the diagnostic reasoning, the Executor's proposed classification
  - The 5 possible Architect decisions: `Path: A` (accept Executor's proposed classifications, continue) / `Path: B` (override classifications — Architect provides new ones) / `Path: C` (defer specific tables, continue with the rest) / `Path: D` (defer entire SPEC, file follow-up) / `Path: E` (cancel SPEC entirely, no writes).
- Executor emits ONE Hebrew line: `🛑 הצריך הכרעה — טבלאות עמומות בסיווג: <N>. פירוט: <escalation-file-path>. Daniel: Path A/B/C/D/E?`
- Executor PAUSES (does not advance to Phase 2) until a chat message arrives containing the regex `Path:\s*[A-E]\b` (case-insensitive).
- On resume: parse the Path letter, write Architect's decision to the escalation file, update `REPLICATION_PLAN.md` to reflect the resolved classifications, then continue.

### Phase 2 — Pre-Snapshot

For each Behavioral table T:
1. `SELECT count(*) FROM <T> WHERE tenant_id = <prizma_uuid>` → `prizma_count`.
2. `SELECT count(*) FROM <T> WHERE tenant_id = <demo_uuid>` → `demo_count_pre`.
3. `SELECT md5(string_agg(...))` over all rows in Prizma — content hash. Hash inputs: all non-volatile, non-identity columns (exclude `id`, `tenant_id`, `created_at`, `updated_at`).
4. Same for demo → `demo_hash_pre`.
5. IF `prizma_count < 200` for T: also capture the full Prizma row set as JSON to TEST_REPORT.md appendix (for surgical rollback per §6).
6. IF `demo_count_pre < 200` for T: also capture the full demo row set as JSON to TEST_REPORT.md appendix.
7. Write all 4 metrics + appendix entries to TEST_REPORT.md §"Pre-Snapshot".

Also capture: `SELECT updated_at, row_to_json(t) FROM tenants t WHERE id IN (prizma_uuid, demo_uuid)` for both tenants — frozen baseline for criterion 10 proof.

For Identity tables, capture row count + content hash only (no full-row JSON — they're not being touched).

For Content tables, no capture (out of scope).

### Phase 3 — Per-Table Replication

For each Behavioral table T, in alphabetical order of table name:

```sql
BEGIN;

-- INSERT: rows in Prizma whose business key has no match in demo
INSERT INTO <T> (
    <all columns except id, tenant_id, created_at, updated_at>,
    tenant_id, created_at, updated_at
)
SELECT
    <same columns>,
    '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid AS tenant_id,
    now() AS created_at,
    now() AS updated_at
FROM <T> p
WHERE p.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM <T> d
    WHERE d.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid
      AND d.<business_key_cols> = p.<business_key_cols>
  );

-- UPDATE: rows in demo whose business key matches Prizma but whose content differs
UPDATE <T> d
SET <all non-key, non-id, non-tenant_id columns> = p.<same>
FROM <T> p
WHERE d.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid
  AND p.tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'::uuid
  AND d.<business_key_cols> = p.<business_key_cols>
  AND md5(<d non-volatile cols>::text) IS DISTINCT FROM md5(<p non-volatile cols>::text);

-- NEVER DELETE — even if demo has rows that Prizma doesn't. Flag in FINDINGS.

COMMIT;
```

Per-table log entry appended to TEST_REPORT.md §"Replication Log":
- Table name
- INSERTed count
- UPDATEd count
- Demo-orphan count (rows in demo whose business key has no match in Prizma — LEFT IN PLACE, flagged for Daniel awareness)
- Transaction commit timestamp
- Any deviation from the template SQL (e.g., a table whose business key is JSONB-nested rather than columnar)

If Prizma has zero rows for a Behavioral table T (Prizma never seeded that lookup), the per-table SQL above is a no-op. Log "skipped — Prizma has 0 rows".

### Phase 4 — Post-Snapshot + Verification

For each Behavioral table T:
1. Re-count + re-hash demo for T → `demo_count_post`, `demo_hash_post_full`.
2. Re-count + re-hash Prizma for T → `prizma_count_post`, `prizma_hash_post`.
3. Assert `prizma_count_post = prizma_count_pre`. If not → STOP, run §6 catastrophic rollback, escalate.
4. Assert `prizma_hash_post = prizma_hash_pre`. If not → STOP, run §6 catastrophic rollback, escalate.
5. Assert `demo_count_post >= prizma_count_pre`.
6. Compute hash of demo rows whose business key matches a Prizma row's business key → must equal Prizma's pre-hash for those same business keys.
7. Write all 6 metrics + assertions to TEST_REPORT.md §"Post-Snapshot".

For Identity tables:
- Re-count + re-hash → must equal pre-snapshot. Any divergence → STOP (Identity table was accidentally touched).

For the `tenants` row:
- Re-fetch `SELECT row_to_json(t) FROM tenants t WHERE id IN (prizma_uuid, demo_uuid)`.
- Diff against pre-snapshot. Both rows must be bit-identical.

Schema-diff snapshot:
- Pre-snapshot and post-snapshot of `information_schema.columns` for both tenants' Behavioral tables. Must be identical.

### Phase 5 — Closure

1. Write `EXECUTION_REPORT.md` — exec-script per the executor template, with §2 actual values for every §3 criterion in this SPEC.
2. Write `FINDINGS.md` — at minimum list:
   - Any demo-orphan rows (per Behavioral table): "Demo has N rows in T whose business key has no Prizma equivalent. Left in place per §10 (no DELETE). Daniel may decide later whether to clean up."
   - Any tables where Prizma had 0 rows (no replication needed for that table).
   - Any tables whose business key required special handling (JSONB, composite, derived).
   - Anything else surprising.
3. Update `MASTER_ROADMAP.md` §4 with a single new row dated 2026-05-11 summarizing: "Demo Parity Replication CLOSED — N Behavioral tables replicated, M INSERTs, K UPDATEs across all tables. Demo behavior 1:1 with Prizma. Identity + Content untouched. Prizma regression-zero."
4. Update `OPEN_TASKS.md` to note demo's test cycle unblocking.
5. Update M4 `SESSION_CONTEXT.md` top-of-file `Today` line.
6. Run `npm run verify:integrity` → exit 0 or 2.
7. Run `npm run smoke` → 7/7 PASS.
8. Commit per §10 plan.
9. Push to `origin/develop`.
10. Emit Hebrew closure summary (see §15).

---

## 14. Mid-Pipeline Escalation Protocol (Phase 1.5 only)

This SPEC has exactly ONE planned escalation point: end of Phase 1 IF Ambiguous tables exist. If Phase 1 produces zero Ambiguous classifications, the Pipeline runs straight through to Phase 5 without pause.

**Escalation file location:** `modules/Module 4 - CRM/escalations/{ISO_TS}_DEMO_PARITY_AMBIGUOUS.md`

**Escalation file content (template):**

```markdown
# Escalation — DEMO_PARITY_REPLICATION — Ambiguous Tables (Phase 1.5)

**Timestamp:** {ISO_TS}
**Reason:** {N} tables could not be confidently classified into Behavioral/Identity/Content.

## Tables requiring decision

| Table | Prizma rows | Demo rows | Why ambiguous | Executor's proposed classification |
|---|---|---|---|---|
| <table_1> | <n> | <m> | <reason> | <Behavioral/Identity/Content> |
| ... | | | | |

## Available Resume Paths

- `Path: A` — Accept Executor's proposed classifications. Continue Phase 2 immediately.
- `Path: B` — Override classifications. Architect provides decision per-table in response: "Table X = Behavioral, Table Y = Identity, ..."
- `Path: C` — Defer specific tables. Architect lists which tables to skip; Pipeline continues with the rest.
- `Path: D` — Defer entire SPEC. Pipeline closes 🟡 with follow-up stub; no DB writes performed.
- `Path: E` — Cancel SPEC entirely. No writes, no follow-up stub.

## Architect Decision

(Architect fills in here — must include the regex `Path:\s*[A-E]\b`.)
```

**Hebrew line emitted to Daniel:**

> 🛑 הצריך הכרעה — טבלאות עמומות בסיווג: {N}. פירוט: `{escalation-file-path}`. Daniel: Path A/B/C/D/E?

**Resume regex (Executor parses chat for):** `Path:\s*[A-E]\b` (case-insensitive). First match wins.

**Resume actions per Path:**
- A → continue Phase 2 with Executor's classifications intact.
- B → update REPLICATION_PLAN.md per Architect's per-table decisions, continue Phase 2.
- C → mark deferred tables in REPLICATION_PLAN.md, continue Phase 2 with the surviving Behavioral set.
- D → skip Phase 2-4, write EXECUTION_REPORT.md with criterion-2 disposition `⏸ DEFERRED`, write follow-up SPEC stub at `modules/Module 4 - CRM/docs/specs/DEMO_PARITY_REPLICATION_V2/SPEC.md` containing the unresolved table list, close 🟡.
- E → skip Phase 2-5, write EXECUTION_REPORT.md with disposition `🛑 CANCELLED`, close 🟡 with no follow-up stub.

---

## 15. Closure Summary (Hebrew, emitted at end)

If Pipeline ran to completion (Path A or no escalation):

> ✅ Demo Parity Replication CLOSED 🟢 — דמו עכשיו 1:1 לפריזמה ברמת התנהגות. {N} טבלאות סווגו ושוכפלו: {M} INSERTים, {K} UPDATEים. זהות הדמו (שם, חנות, צוות, ערוצים) נשארה ללא שינוי. פריזמה אומתה כקריאה-בלבד לאורך כל הריצה. דמו מוכן לסבב טסטים מלא.

If Pipeline ran with deferrals (Path B/C):

> 🟡 Demo Parity Replication CLOSED עם דחיות — {N1} טבלאות שוכפלו ({M} INSERTים, {K} UPDATEים), {N2} טבלאות נדחו לפי החלטת ארכיטקט. דמו בעיקרון 1:1 לפריזמה ברמת התנהגות. פריזמה ללא רגרסיה. דחיות מתועדות ב-FINDINGS.

If Pipeline deferred entirely (Path D):

> 🟡 Demo Parity Replication CLOSED-DEFERRED — אבחנו {N} טבלאות עמומות, ארכיטקט החליט לדחות שכפול עד לסבב המשך. אפס כתיבות לדמו, פריזמה לא נגעו. SPEC המשך נכתב.

If Pipeline cancelled (Path E):

> 🟡 Demo Parity Replication CANCELLED — אבחנו עמומות, ארכיטקט החליט לבטל את ה-SPEC. אפס כתיבות, פריזמה לא נגעו, אין SPEC המשך.

---

## 16. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values in EXECUTION_REPORT.md.
- [ ] Integrity Gate (Iron Rule 31) exit 0 or 2.
- [ ] `git status --short` empty.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + REPLICATION_PLAN.md + TEST_REPORT.md present in SPEC folder.
- [ ] MASTER_ROADMAP / OPEN_TASKS / M4 SESSION_CONTEXT updated.
- [ ] Smoke 7/7.
- [ ] No DELETE in commit range (verified by grep).
- [ ] No `git rebase` / `git reset --hard` / `git push --force` in session shell history.
- [ ] No outbound message sent.
- [ ] Demo `tenants` row + Identity tables bit-identical pre/post (criterion 10, 11).
- [ ] Prizma everything bit-identical pre/post (criterion 8, 9).

---

*End of SPEC.md.*
